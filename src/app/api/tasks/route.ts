import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorize, handle, ok, ApiError } from '@/lib/api'
import { logAudit } from '@/lib/audit'
import { notifyTaskAssigned } from '@/lib/notifications'

const schema = z.object({
  title: z.string().trim().min(2, 'العنوان مطلوب'),
  description: z.string().trim().optional(),
  councilId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).optional(),
  primaryAssigneeId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
})

// إنشاء تكليف مباشر (أمين السر) — خارج المحضر
export async function POST(req: Request) {
  return handle(async () => {
    const me = await authorize(['SECRETARY'])
    const b = schema.parse(await req.json())

    if (b.departmentId) {
      const dept = await prisma.department.findFirst({ where: { id: b.departmentId, council: { organizationId: me.organizationId } } })
      if (!dept) throw new ApiError('القسم غير موجود', 404)
    }

    const assigneeIds = Array.from(new Set([...(b.assigneeIds ?? []), ...(b.assigneeId ? [b.assigneeId] : [])].filter(Boolean)))
    const primaryAssigneeId = b.primaryAssigneeId && assigneeIds.includes(b.primaryAssigneeId) ? b.primaryAssigneeId : assigneeIds[0] ?? null

    const task = await prisma.task.create({
      data: {
        organizationId: me.organizationId,
        title: b.title,
        description: b.description || null,
        councilId: b.councilId || null,
        departmentId: b.departmentId || null,
        projectId: b.projectId || null,
        assigneeId: primaryAssigneeId,
        dueDate: b.dueDate ? new Date(b.dueDate) : null,
        priority: b.priority,
        status: 'NEW',
        createdById: me.id,
        assignees: assigneeIds.length
          ? { create: assigneeIds.map((userId) => ({ userId, isPrimary: userId === primaryAssigneeId })) }
          : undefined,
      },
      select: { id: true },
    })

    for (const assigneeId of assigneeIds) await notifyTaskAssigned(me.organizationId, assigneeId, b.title)

    await logAudit({ organizationId: me.organizationId, userId: me.id, action: 'CREATE', entityType: 'Task', entityId: task.id, details: { title: b.title } })
    return ok(task)
  })
}

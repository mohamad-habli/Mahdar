import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { handle, ok, ApiError } from '@/lib/api'
import { getSession } from '@/lib/auth'
import { taskAccess } from '@/lib/tasks'
import { logAudit } from '@/lib/audit'

const schema = z.object({
  status: z.enum(['NEW', 'IN_PROGRESS', 'LATE', 'DONE', 'CANCELLED']).optional(),
  // حقول لا يعدّلها إلا أمين السر
  title: z.string().trim().min(2).optional(),
  description: z.string().trim().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).optional(),
  primaryAssigneeId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await getSession()
    if (!me) throw new ApiError('يرجى تسجيل الدخول', 401)
    const { id } = await params

    const access = await taskAccess(id, me)
    if (!access.task.id) throw new ApiError('التكليف غير موجود', 404)
    if (!access.canStatus) throw new ApiError('ليس لديك صلاحية على هذا التكليف', 403)

    const b = schema.parse(await req.json())

    const fieldKeys = ['title', 'description', 'priority', 'dueDate', 'assigneeId', 'assigneeIds', 'primaryAssigneeId', 'departmentId', 'projectId'] as const
    const editingFields = fieldKeys.some((k) => b[k] !== undefined)
    if (editingFields && !access.canFields) throw new ApiError('تعديل بيانات التكليف لأمين السر فقط', 403)

    const data: Record<string, unknown> = {}
    if (b.status !== undefined) {
      data.status = b.status
      data.completedAt = b.status === 'DONE' ? new Date() : null
    }
    if (access.canFields) {
      if (b.title !== undefined) data.title = b.title
      if (b.description !== undefined) data.description = b.description || null
      if (b.priority !== undefined) data.priority = b.priority
      if (b.dueDate !== undefined) data.dueDate = b.dueDate ? new Date(b.dueDate) : null
      const assigneesWereEdited = b.assigneeIds !== undefined || b.assigneeId !== undefined || b.primaryAssigneeId !== undefined
      if (assigneesWereEdited) {
        const assigneeIds = Array.from(new Set([...(b.assigneeIds ?? []), ...(b.assigneeId ? [b.assigneeId] : [])].filter(Boolean)))
        const primaryAssigneeId = b.primaryAssigneeId && assigneeIds.includes(b.primaryAssigneeId) ? b.primaryAssigneeId : assigneeIds[0] ?? null
        data.assigneeId = primaryAssigneeId
      }
      if (b.departmentId !== undefined) data.departmentId = b.departmentId || null
      if (b.projectId !== undefined) data.projectId = b.projectId || null
    }

    await prisma.$transaction(async (tx) => {
      await tx.task.update({ where: { id }, data })
      if (access.canFields && (b.assigneeIds !== undefined || b.assigneeId !== undefined || b.primaryAssigneeId !== undefined)) {
        const assigneeIds = Array.from(new Set([...(b.assigneeIds ?? []), ...(b.assigneeId ? [b.assigneeId] : [])].filter(Boolean)))
        const primaryAssigneeId = b.primaryAssigneeId && assigneeIds.includes(b.primaryAssigneeId) ? b.primaryAssigneeId : assigneeIds[0] ?? null
        await tx.taskAssignee.deleteMany({ where: { taskId: id } })
        if (assigneeIds.length) {
          await tx.taskAssignee.createMany({
            data: assigneeIds.map((userId) => ({ taskId: id, userId, isPrimary: userId === primaryAssigneeId })),
          })
        }
      }
      if (b.status !== undefined) {
        await tx.followUpEntry.create({
          data: {
            organizationId: me.organizationId,
            taskId: id,
            authorId: me.id,
            type: 'STATUS',
            body: `تغيير الحالة إلى ${b.status}`,
            statusFrom: access.task.status,
            statusTo: b.status,
          },
        })
      }
    })
    await logAudit({ organizationId: me.organizationId, userId: me.id, action: 'UPDATE', entityType: 'Task', entityId: id, details: b.status ? { status: b.status } : { fields: Object.keys(data) } })
    return ok({ id })
  })
}

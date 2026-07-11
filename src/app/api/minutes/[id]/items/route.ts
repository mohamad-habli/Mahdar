import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorize, handle, ok, ApiError } from '@/lib/api'
import { logAudit } from '@/lib/audit'
import { notifyTaskAssigned } from '@/lib/notifications'
import { createMinutesVersion } from '@/lib/minutes-workflow'

const schema = z.object({
  type: z.enum(['DISCUSSION', 'DECISION', 'TASK', 'DELIVERABLE', 'FOLLOWUP', 'COST', 'NOTE', 'VOTE']),
  title: z.string().trim().optional(),
  content: z.string().trim().min(1, 'النص مطلوب'),
  departmentId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  sourceAgendaItemId: z.string().optional().nullable(),

  // تصويت
  voteResult: z.enum(['APPROVED', 'REJECTED']).optional().nullable(),
  votesFor: z.number().int().min(0).optional().nullable(),
  votesAgainst: z.number().int().min(0).optional().nullable(),
  votesAbstain: z.number().int().min(0).optional().nullable(),

  // تكليف (عند type=TASK)
  task: z
    .object({
      assigneeId: z.string().optional().nullable(),
      assigneeIds: z.array(z.string()).optional(),
      primaryAssigneeId: z.string().optional().nullable(),
      dueDate: z.string().optional().nullable(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
      description: z.string().trim().optional(),
    })
    .optional(),
  deliverable: z
    .object({
      ownerId: z.string().optional().nullable(),
      dueDate: z.string().optional().nullable(),
      description: z.string().trim().optional(),
      status: z.enum(['NEW', 'IN_PROGRESS', 'LATE', 'DONE', 'CANCELLED']).default('NEW'),
    })
    .optional(),

  // تكلفة (عند type=COST)
  cost: z
    .object({
      expectedAmount: z.number().optional().nullable(),
      actualAmount: z.number().optional().nullable(),
      currency: z.string().default('USD'),
      responsibleId: z.string().optional().nullable(),
      paymentStatus: z.enum(['UNPAID', 'PARTIAL', 'PAID']).default('UNPAID'),
    })
    .optional(),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await authorize(['SECRETARY'])
    const { id } = await params

    const minutes = await prisma.minutes.findFirst({
      where: { id, meeting: { council: { organizationId: me.organizationId } } },
      include: { meeting: { select: { id: true, councilId: true } } },
    })
    if (!minutes) throw new ApiError('المحضر غير موجود', 404)
    if (minutes.status !== 'DRAFT') throw new ApiError('لا يمكن تعديل محضر بعد إرساله. أعِده إلى مسودة أولًا.', 400)

    const b = schema.parse(await req.json())
    if (b.sourceAgendaItemId) {
      const agendaItem = await prisma.agendaItem.findFirst({
        where: { id: b.sourceAgendaItemId, meetingId: minutes.meeting.id },
        select: { id: true },
      })
      if (!agendaItem) throw new ApiError('بند جدول الأعمال غير موجود في هذه الجلسة', 404)
    }
    const order = (await prisma.minuteItem.count({ where: { minutesId: id } })) + 1

    const item = await prisma.minuteItem.create({
      data: {
        minutesId: id,
        order,
        type: b.type,
        title: b.title || null,
        content: b.content,
        departmentId: b.departmentId || null,
        projectId: b.projectId || null,
        sourceAgendaItemId: b.sourceAgendaItemId || null,
        voteResult: b.type === 'VOTE' ? b.voteResult || null : null,
        votesFor: b.type === 'VOTE' ? b.votesFor ?? null : null,
        votesAgainst: b.type === 'VOTE' ? b.votesAgainst ?? null : null,
        votesAbstain: b.type === 'VOTE' ? b.votesAbstain ?? null : null,
      },
    })

    // توليد تكليف فعلي من بند التكليف
    if (b.type === 'TASK') {
      const taskTitle = b.title || b.content.slice(0, 80)
      const assigneeIds = Array.from(new Set([...(b.task?.assigneeIds ?? []), ...(b.task?.assigneeId ? [b.task.assigneeId] : [])].filter(Boolean)))
      const primaryAssigneeId = b.task?.primaryAssigneeId && assigneeIds.includes(b.task.primaryAssigneeId) ? b.task.primaryAssigneeId : assigneeIds[0] ?? null
      await prisma.task.create({
        data: {
          organizationId: me.organizationId,
          title: taskTitle,
          description: b.task?.description || (b.title ? b.content : null),
          councilId: minutes.meeting.councilId,
          departmentId: b.departmentId || null,
          projectId: b.projectId || null,
          assigneeId: primaryAssigneeId,
          sourceMeetingId: minutes.meeting.id,
          sourceMinuteItemId: item.id,
          dueDate: b.task?.dueDate ? new Date(b.task.dueDate) : null,
          priority: b.task?.priority || 'MEDIUM',
          status: 'NEW',
          createdById: me.id,
          assignees: assigneeIds.length
            ? { create: assigneeIds.map((userId) => ({ userId, isPrimary: userId === primaryAssigneeId })) }
            : undefined,
        },
      })
      await prisma.minuteItem.update({ where: { id: item.id }, data: { outcome: 'CONVERTED_TO_TASK', settledAt: new Date() } })
      for (const assigneeId of assigneeIds) await notifyTaskAssigned(me.organizationId, assigneeId, taskTitle)
    }

    if (b.type === 'DELIVERABLE') {
      const title = b.title || b.content.slice(0, 80)
      await prisma.deliverable.create({
        data: {
          organizationId: me.organizationId,
          title,
          description: b.deliverable?.description || (b.title ? b.content : null),
          councilId: minutes.meeting.councilId,
          departmentId: b.departmentId || null,
          sourceMeetingId: minutes.meeting.id,
          sourceMinuteItemId: item.id,
          ownerId: b.deliverable?.ownerId || null,
          dueDate: b.deliverable?.dueDate ? new Date(b.deliverable.dueDate) : null,
          status: b.deliverable?.status || 'NEW',
          createdById: me.id,
        },
      })
      await prisma.minuteItem.update({ where: { id: item.id }, data: { outcome: 'CONVERTED_TO_DELIVERABLE', settledAt: new Date() } })
    }

    // توليد تكلفة فعلية من بند التكلفة
    if (b.type === 'COST') {
      await prisma.cost.create({
        data: {
          organizationId: me.organizationId,
          description: b.title || b.content.slice(0, 120),
          expectedAmount: b.cost?.expectedAmount ?? null,
          actualAmount: b.cost?.actualAmount ?? null,
          currency: b.cost?.currency || 'USD',
          departmentId: b.departmentId || null,
          projectId: b.projectId || null,
          responsibleId: b.cost?.responsibleId || null,
          minuteItemId: item.id,
          sourceMeetingId: minutes.meeting.id,
          paymentStatus: b.cost?.paymentStatus || 'UNPAID',
        },
      })
    }

    await logAudit({ organizationId: me.organizationId, userId: me.id, action: 'CREATE', entityType: 'MinuteItem', entityId: item.id, details: { type: b.type } })
    await createMinutesVersion(id, me.id, 'ITEM_CREATED')
    return ok({ id: item.id })
  })
}

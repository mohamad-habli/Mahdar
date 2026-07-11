import { prisma } from '@/lib/prisma'
import { authorize, handle, ok, ApiError } from '@/lib/api'
import { logAudit } from '@/lib/audit'
import { notifyTaskAssigned } from '@/lib/notifications'
import { z } from 'zod'
import { createMinutesVersion } from '@/lib/minutes-workflow'

const patchSchema = z.object({
  action: z.enum(['OPEN', 'NOTE_ONLY', 'CLOSE', 'TO_TASK', 'TO_DELIVERABLE']),
  settlementNote: z.string().trim().optional().nullable(),
  task: z
    .object({
      title: z.string().trim().optional(),
      description: z.string().trim().optional(),
      assigneeIds: z.array(z.string()).optional(),
      primaryAssigneeId: z.string().optional().nullable(),
      dueDate: z.string().optional().nullable(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
    })
    .optional(),
  deliverable: z
    .object({
      title: z.string().trim().optional(),
      description: z.string().trim().optional(),
      ownerId: z.string().optional().nullable(),
      dueDate: z.string().optional().nullable(),
      status: z.enum(['NEW', 'IN_PROGRESS', 'LATE', 'DONE', 'CANCELLED']).default('NEW'),
    })
    .optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await authorize(['SECRETARY'])
    const { id } = await params
    const body = patchSchema.parse(await req.json())

    const item = await prisma.minuteItem.findFirst({
      where: { id, minutes: { meeting: { council: { organizationId: me.organizationId } } } },
      include: { minutes: { include: { meeting: { select: { id: true, councilId: true } } } } },
    })
    if (!item) throw new ApiError('البند غير موجود', 404)

    if (body.action === 'TO_TASK') {
      const title = body.task?.title || item.title || item.content.slice(0, 80)
      const assigneeIds = Array.from(new Set(body.task?.assigneeIds ?? []))
      const primaryAssigneeId = body.task?.primaryAssigneeId && assigneeIds.includes(body.task.primaryAssigneeId) ? body.task.primaryAssigneeId : assigneeIds[0] ?? null
      const task = await prisma.task.create({
        data: {
          organizationId: me.organizationId,
          title,
          description: body.task?.description || item.content,
          councilId: item.minutes.meeting.councilId,
          departmentId: item.departmentId,
          projectId: item.projectId,
          assigneeId: primaryAssigneeId,
          sourceMeetingId: item.minutes.meeting.id,
          sourceMinuteItemId: item.id,
          dueDate: body.task?.dueDate ? new Date(body.task.dueDate) : null,
          priority: body.task?.priority || 'MEDIUM',
          status: 'NEW',
          createdById: me.id,
          assignees: assigneeIds.length
            ? { create: assigneeIds.map((userId) => ({ userId, isPrimary: userId === primaryAssigneeId })) }
            : undefined,
        },
        select: { id: true },
      })
      await prisma.minuteItem.update({ where: { id }, data: { outcome: 'CONVERTED_TO_TASK', settledAt: new Date(), settlementNote: body.settlementNote || null } })
      for (const assigneeId of assigneeIds) await notifyTaskAssigned(me.organizationId, assigneeId, title)
      await createMinutesVersion(item.minutesId, me.id, 'ITEM_SETTLED')
      return ok(task)
    }

    if (body.action === 'TO_DELIVERABLE') {
      const title = body.deliverable?.title || item.title || item.content.slice(0, 80)
      const deliverable = await prisma.deliverable.create({
        data: {
          organizationId: me.organizationId,
          title,
          description: body.deliverable?.description || item.content,
          councilId: item.minutes.meeting.councilId,
          departmentId: item.departmentId,
          sourceMeetingId: item.minutes.meeting.id,
          sourceMinuteItemId: item.id,
          ownerId: body.deliverable?.ownerId || null,
          dueDate: body.deliverable?.dueDate ? new Date(body.deliverable.dueDate) : null,
          status: body.deliverable?.status || 'NEW',
          createdById: me.id,
        },
        select: { id: true },
      })
      await prisma.minuteItem.update({ where: { id }, data: { outcome: 'CONVERTED_TO_DELIVERABLE', settledAt: new Date(), settlementNote: body.settlementNote || null } })
      await createMinutesVersion(item.minutesId, me.id, 'ITEM_SETTLED')
      return ok(deliverable)
    }

    const data =
      body.action === 'CLOSE'
        ? { outcome: 'CLOSED', settledAt: new Date(), settlementNote: body.settlementNote || null }
        : body.action === 'NOTE_ONLY'
          ? { outcome: 'NOTE_ONLY', settledAt: new Date(), settlementNote: body.settlementNote || null }
          : { outcome: 'OPEN', settledAt: null, settlementNote: body.settlementNote || null }

    await prisma.minuteItem.update({ where: { id }, data })
    await logAudit({ organizationId: me.organizationId, userId: me.id, action: 'UPDATE', entityType: 'MinuteItem', entityId: id, details: { action: body.action } })
    await createMinutesVersion(item.minutesId, me.id, 'ITEM_UPDATED')
    return ok({ id })
  })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await authorize(['SECRETARY'])
    const { id } = await params

    const item = await prisma.minuteItem.findFirst({
      where: { id, minutes: { meeting: { council: { organizationId: me.organizationId } } } },
      include: { minutes: { select: { id: true, status: true } } },
    })
    if (!item) throw new ApiError('البند غير موجود', 404)
    if (item.minutes.status !== 'DRAFT') throw new ApiError('لا يمكن تعديل محضر بعد إرساله.', 400)

    // حذف التكليف/التكلفة المتولّدة عن هذا البند ثم البند
    await createMinutesVersion(item.minutes.id, me.id, 'BEFORE_ITEM_DELETE')
    await prisma.$transaction([
      prisma.task.deleteMany({ where: { sourceMinuteItemId: id } }),
      prisma.deliverable.deleteMany({ where: { sourceMinuteItemId: id } }),
      prisma.cost.deleteMany({ where: { minuteItemId: id } }),
      prisma.minuteItem.delete({ where: { id } }),
    ])

    await logAudit({ organizationId: me.organizationId, userId: me.id, action: 'DELETE', entityType: 'MinuteItem', entityId: id })
    return ok({ id })
  })
}

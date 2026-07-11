import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { handle, ok, ApiError } from '@/lib/api'
import { getSession } from '@/lib/auth'
import { taskAccess } from '@/lib/tasks'
import { notify } from '@/lib/notifications'

const schema = z.object({
  offsetType: z.enum(['NOW', 'DAY_BEFORE', 'HOURS_BEFORE', 'REPEAT_UNTIL_CLOSED']).default('NOW'),
  hoursBefore: z.number().int().min(1).max(72).optional(),
})

function scheduledFor(dueDate: Date | null, offsetType: string, hoursBefore?: number) {
  const d = dueDate ? new Date(dueDate) : new Date()
  if (offsetType === 'DAY_BEFORE') d.setDate(d.getDate() - 1)
  if (offsetType === 'HOURS_BEFORE') d.setHours(d.getHours() - (hoursBefore ?? 3))
  if (offsetType === 'NOW' || offsetType === 'REPEAT_UNTIL_CLOSED') return new Date()
  return d
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await getSession()
    if (!me) throw new ApiError('يرجى تسجيل الدخول', 401)
    const { id } = await params
    const access = await taskAccess(id, me)
    if (!access.task.id) throw new ApiError('التكليف غير موجود', 404)
    if (!access.canStatus) throw new ApiError('ليس لديك صلاحية على هذا التكليف', 403)

    const body = schema.parse(await req.json())
    const task = await prisma.task.findFirst({
      where: { id, organizationId: me.organizationId },
      include: { assignees: { select: { userId: true } } },
    })
    if (!task) throw new ApiError('التكليف غير موجود', 404)

    const userIds = Array.from(new Set([...task.assignees.map((a) => a.userId), ...(task.assigneeId ? [task.assigneeId] : [])]))
    if (!userIds.length) throw new ApiError('لا يوجد مكلفون لإرسال التذكير', 400)

    const when = scheduledFor(task.dueDate, body.offsetType, body.hoursBefore)
    await prisma.$transaction([
      prisma.reminder.createMany({
        data: userIds.map((userId) => ({
          organizationId: me.organizationId,
          targetType: 'TASK',
          targetId: id,
          taskId: id,
          userId,
          offsetType: body.offsetType,
          hoursBefore: body.hoursBefore ?? null,
          scheduledFor: when,
          repeatUntilClosed: body.offsetType === 'REPEAT_UNTIL_CLOSED',
          channel: 'IN_APP',
          status: body.offsetType === 'NOW' ? 'SENT' : 'PENDING',
          sentAt: body.offsetType === 'NOW' ? new Date() : null,
        })),
      }),
      prisma.followUpEntry.create({
        data: {
          organizationId: me.organizationId,
          taskId: id,
          authorId: me.id,
          type: 'REMINDER',
          body: `تذكير: ${body.offsetType}`,
        },
      }),
    ])

    if (body.offsetType === 'NOW') {
      for (const userId of userIds) {
        await notify({
          organizationId: me.organizationId,
          userId,
          type: 'TASK_REMINDER',
          title: 'تذكير بتكليف',
          body: task.title,
          link: '/member/tasks',
        })
      }
    }

    return ok({ sentTo: userIds.length })
  })
}

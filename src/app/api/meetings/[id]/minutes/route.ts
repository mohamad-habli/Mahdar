import { prisma } from '@/lib/prisma'
import { authorize, handle, ok, ApiError } from '@/lib/api'
import { logAudit } from '@/lib/audit'

// إنشاء محضر (مسودة) للاجتماع إن لم يكن موجودًا
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await authorize(['SECRETARY'])
    const { id } = await params

    const meeting = await prisma.meeting.findFirst({
      where: { id, council: { organizationId: me.organizationId } },
      include: { minutes: true },
    })
    if (!meeting) throw new ApiError('الاجتماع غير موجود', 404)

    if (meeting.minutes) return ok({ id: meeting.minutes.id })

    const minutes = await prisma.$transaction(async (tx) => {
      const created = await tx.minutes.create({
        data: { meetingId: id, title: `محضر ${meeting.title}`, status: 'DRAFT', createdById: me.id },
        select: { id: true },
      })

      const previous = await tx.minutes.findFirst({
        where: {
          meeting: {
            councilId: meeting.councilId,
            meetingDate: { lt: meeting.meetingDate },
          },
        },
        orderBy: { meeting: { meetingDate: 'desc' } },
        include: {
          items: {
            where: {
              settledAt: null,
              carriedToItemId: null,
              outcome: { in: ['OPEN', 'CARRIED_FORWARD'] },
              type: { in: ['DISCUSSION', 'DECISION', 'FOLLOWUP', 'NOTE', 'TASK', 'DELIVERABLE'] },
            },
            orderBy: { order: 'asc' },
          },
        },
      })

      if (previous?.items.length) {
        for (const [index, item] of previous.items.entries()) {
          const carried = await tx.minuteItem.create({
            data: {
              minutesId: created.id,
              order: index + 1,
              type: 'FOLLOWUP',
              title: item.title,
              content: item.content,
              departmentId: item.departmentId,
              projectId: item.projectId,
              outcome: 'OPEN',
              carriedFromItemId: item.id,
            },
            select: { id: true },
          })
          await tx.minuteItem.update({
            where: { id: item.id },
            data: {
              outcome: 'CARRIED_FORWARD',
              carriedToItemId: carried.id,
            },
          })
        }
      }

      return created
    })

    await logAudit({ organizationId: me.organizationId, userId: me.id, action: 'CREATE', entityType: 'Minutes', entityId: minutes.id })
    return ok({ id: minutes.id })
  })
}

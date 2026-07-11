import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorize, handle, ok, ApiError } from '@/lib/api'

const schema = z.object({
  title: z.string().trim().min(1, 'اسم الرابط مطلوب'),
  url: z.string().trim().url('الرابط غير صحيح'),
  description: z.string().trim().optional().nullable(),
  entityType: z.enum(['MEETING', 'MINUTE_ITEM', 'DELIVERABLE', 'TASK']),
  entityId: z.string().min(1),
})

export async function POST(req: Request) {
  return handle(async () => {
    const me = await authorize(['SECRETARY'])
    const body = schema.parse(await req.json())

    let meetingId: string | null = null
    let minuteItemId: string | null = null
    let deliverableId: string | null = null
    let councilId: string | null = null

    if (body.entityType === 'MEETING') {
      const meeting = await prisma.meeting.findFirst({ where: { id: body.entityId, council: { organizationId: me.organizationId } }, select: { id: true, councilId: true } })
      if (!meeting) throw new ApiError('الجلسة غير موجودة', 404)
      meetingId = meeting.id
      councilId = meeting.councilId
    }
    if (body.entityType === 'MINUTE_ITEM') {
      const item = await prisma.minuteItem.findFirst({ where: { id: body.entityId, minutes: { meeting: { council: { organizationId: me.organizationId } } } }, select: { id: true, minutes: { select: { meetingId: true, meeting: { select: { councilId: true } } } } } })
      if (!item) throw new ApiError('بند المحضر غير موجود', 404)
      minuteItemId = item.id
      meetingId = item.minutes.meetingId
      councilId = item.minutes.meeting.councilId
    }
    if (body.entityType === 'DELIVERABLE') {
      const deliverable = await prisma.deliverable.findFirst({ where: { id: body.entityId, organizationId: me.organizationId }, select: { id: true, councilId: true } })
      if (!deliverable) throw new ApiError('الاستحقاق غير موجود', 404)
      deliverableId = deliverable.id
      councilId = deliverable.councilId
    }

    const link = await prisma.documentLink.create({
      data: {
        organizationId: me.organizationId,
        title: body.title,
        url: body.url,
        description: body.description || null,
        entityType: body.entityType,
        entityId: body.entityId,
        meetingId,
        minuteItemId,
        deliverableId,
        councilId,
        createdById: me.id,
      },
      select: { id: true },
    })

    return ok(link)
  })
}

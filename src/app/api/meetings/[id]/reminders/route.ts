import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorize, handle, ok, ApiError } from '@/lib/api'
import { reminderTime, type ReminderOffset } from '@/lib/notifications'

const schema = z.object({ offsetType: z.enum(['DAY_BEFORE', 'HOURS_3', 'HOUR_1']) })

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await authorize(['SECRETARY'])
    const { id } = await params
    const meeting = await prisma.meeting.findFirst({ where: { id, council: { organizationId: me.organizationId } } })
    if (!meeting) throw new ApiError('الاجتماع غير موجود', 404)

    const b = schema.parse(await req.json())
    const exists = await prisma.meetingReminder.findFirst({ where: { meetingId: id, offsetType: b.offsetType } })
    if (exists) throw new ApiError('هذا التذكير مضاف بالفعل', 409)

    const reminder = await prisma.meetingReminder.create({
      data: {
        meetingId: id,
        offsetType: b.offsetType,
        scheduledFor: reminderTime(meeting.meetingDate, meeting.startTime, b.offsetType as ReminderOffset),
        channel: 'IN_APP',
        status: 'PENDING',
      },
      select: { id: true },
    })
    return ok(reminder)
  })
}

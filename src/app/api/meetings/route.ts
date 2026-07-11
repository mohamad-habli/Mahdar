import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorize, handle, ok, ApiError } from '@/lib/api'
import { logAudit } from '@/lib/audit'
import { createMeetingReminders } from '@/lib/notifications'

const schema = z.object({
  councilId: z.string().min(1, 'اختر المجلس'),
  title: z.string().trim().min(2, 'عنوان الاجتماع مطلوب'),
  description: z.string().trim().optional(),
  meetingDate: z.string().min(1, 'التاريخ مطلوب'),
  startTime: z.string().trim().optional().nullable(),
  endTime: z.string().trim().optional().nullable(),
  location: z.string().trim().optional().nullable(),
  onlineUrl: z.string().trim().optional().nullable(),
  agenda: z.array(z.string().trim().min(1)).optional(),
})

export async function POST(req: Request) {
  return handle(async () => {
    const me = await authorize(['SECRETARY'])
    const b = schema.parse(await req.json())

    const council = await prisma.council.findFirst({
      where: { id: b.councilId, organizationId: me.organizationId },
    })
    if (!council) throw new ApiError('المجلس غير موجود', 404)

    const meeting = await prisma.meeting.create({
      data: {
        councilId: b.councilId,
        title: b.title,
        description: b.description || null,
        meetingDate: new Date(b.meetingDate),
        startTime: b.startTime || council.defaultStartTime,
        endTime: b.endTime || council.defaultEndTime,
        location: b.location || council.defaultLocation,
        onlineUrl: b.onlineUrl || null,
        status: 'SCHEDULED',
        createdById: me.id,
        agendaItems: b.agenda?.length
          ? { create: b.agenda.map((title, i) => ({ order: i + 1, title })) }
          : undefined,
      },
      select: { id: true, title: true },
    })

    await createMeetingReminders(meeting.id)
    await logAudit({ organizationId: me.organizationId, userId: me.id, action: 'CREATE', entityType: 'Meeting', entityId: meeting.id, details: { title: meeting.title } })
    return ok(meeting)
  })
}

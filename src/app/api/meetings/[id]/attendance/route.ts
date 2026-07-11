import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorize, handle, ok, ApiError } from '@/lib/api'
import { logAudit } from '@/lib/audit'

const schema = z.object({
  entries: z.array(
    z.object({
      userId: z.string().min(1),
      status: z.enum(['PRESENT', 'ABSENT', 'EXCUSED']),
      attendeeType: z.enum(['PERMANENT', 'ATTENDEE', 'GUEST']).default('PERMANENT'),
      notes: z.string().trim().optional().nullable(),
    })
  ),
  guests: z
    .array(z.object({ guestName: z.string().trim().min(1), status: z.enum(['PRESENT', 'ABSENT', 'EXCUSED']).default('PRESENT') }))
    .optional(),
})

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await authorize(['SECRETARY'])
    const { id } = await params
    const meeting = await prisma.meeting.findFirst({ where: { id, council: { organizationId: me.organizationId } } })
    if (!meeting) throw new ApiError('الاجتماع غير موجود', 404)

    const b = schema.parse(await req.json())

    await prisma.$transaction([
      prisma.attendance.deleteMany({ where: { meetingId: id } }),
      prisma.attendance.createMany({
        data: [
          ...b.entries.map((e) => ({
            meetingId: id,
            userId: e.userId,
            status: e.status,
            attendeeType: e.attendeeType,
            notes: e.notes || null,
          })),
          ...(b.guests ?? []).map((g) => ({
            meetingId: id,
            guestName: g.guestName,
            status: g.status,
            attendeeType: 'GUEST',
          })),
        ],
      }),
    ])

    await logAudit({ organizationId: me.organizationId, userId: me.id, action: 'UPDATE', entityType: 'Attendance', entityId: id, details: { count: b.entries.length } })
    return ok({ id })
  })
}

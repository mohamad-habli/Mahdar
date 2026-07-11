import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorize, handle, ok, ApiError } from '@/lib/api'
import { logAudit } from '@/lib/audit'

const schema = z.object({
  title: z.string().trim().min(2).optional(),
  description: z.string().trim().optional().nullable(),
  meetingDate: z.string().optional(),
  startTime: z.string().trim().optional().nullable(),
  endTime: z.string().trim().optional().nullable(),
  location: z.string().trim().optional().nullable(),
  onlineUrl: z.string().trim().optional().nullable(),
  status: z.enum(['SCHEDULED', 'NEEDS_UPDATE', 'HELD', 'CANCELLED']).optional(),
})

async function findOwned(id: string, organizationId: string) {
  const m = await prisma.meeting.findFirst({ where: { id, council: { organizationId } } })
  if (!m) throw new ApiError('الاجتماع غير موجود', 404)
  return m
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await authorize(['SECRETARY'])
    const { id } = await params
    await findOwned(id, me.organizationId)
    const b = schema.parse(await req.json())

    await prisma.meeting.update({
      where: { id },
      data: {
        ...(b.title !== undefined ? { title: b.title } : {}),
        ...(b.description !== undefined ? { description: b.description || null } : {}),
        ...(b.meetingDate !== undefined ? { meetingDate: new Date(b.meetingDate) } : {}),
        ...(b.startTime !== undefined ? { startTime: b.startTime || null } : {}),
        ...(b.endTime !== undefined ? { endTime: b.endTime || null } : {}),
        ...(b.location !== undefined ? { location: b.location || null } : {}),
        ...(b.onlineUrl !== undefined ? { onlineUrl: b.onlineUrl || null } : {}),
        ...(b.status !== undefined ? { status: b.status } : {}),
      },
    })

    await logAudit({ organizationId: me.organizationId, userId: me.id, action: 'UPDATE', entityType: 'Meeting', entityId: id, details: b.status ? { status: b.status } : {} })
    return ok({ id })
  })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await authorize(['SECRETARY'])
    const { id } = await params
    await findOwned(id, me.organizationId)

    const minutes = await prisma.minutes.findUnique({ where: { meetingId: id } })
    if (minutes && minutes.status !== 'DRAFT') {
      throw new ApiError('لا يمكن حذف اجتماع له محضر معتمد. ألغِ الاجتماع بدلًا من ذلك.', 400)
    }

    await prisma.meeting.delete({ where: { id } })
    await logAudit({ organizationId: me.organizationId, userId: me.id, action: 'DELETE', entityType: 'Meeting', entityId: id })
    return ok({ id })
  })
}

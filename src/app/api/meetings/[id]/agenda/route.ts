import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorize, handle, ok, ApiError } from '@/lib/api'

const schema = z.object({
  title: z.string().trim().min(1, 'عنوان البند مطلوب'),
  notes: z.string().trim().optional(),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await authorize(['SECRETARY'])
    const { id } = await params
    const meeting = await prisma.meeting.findFirst({ where: { id, council: { organizationId: me.organizationId } } })
    if (!meeting) throw new ApiError('الاجتماع غير موجود', 404)

    const b = schema.parse(await req.json())
    const count = await prisma.agendaItem.count({ where: { meetingId: id } })

    const item = await prisma.agendaItem.create({
      data: { meetingId: id, order: count + 1, title: b.title, notes: b.notes || null },
      select: { id: true, title: true, order: true },
    })
    return ok(item)
  })
}

import { prisma } from '@/lib/prisma'
import { authorize, handle, ok, ApiError } from '@/lib/api'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await authorize(['SECRETARY'])
    const { id } = await params
    const reminder = await prisma.meetingReminder.findFirst({
      where: { id, meeting: { council: { organizationId: me.organizationId } } },
    })
    if (!reminder) throw new ApiError('التذكير غير موجود', 404)
    await prisma.meetingReminder.delete({ where: { id } })
    return ok({ id })
  })
}

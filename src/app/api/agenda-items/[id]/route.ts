import { prisma } from '@/lib/prisma'
import { authorize, handle, ok, ApiError } from '@/lib/api'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await authorize(['SECRETARY'])
    const { id } = await params
    const item = await prisma.agendaItem.findFirst({
      where: { id, meeting: { council: { organizationId: me.organizationId } } },
    })
    if (!item) throw new ApiError('البند غير موجود', 404)
    await prisma.agendaItem.delete({ where: { id } })
    return ok({ id })
  })
}

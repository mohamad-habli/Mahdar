import { prisma } from '@/lib/prisma'
import { authorize, handle, ok, ApiError } from '@/lib/api'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await authorize(['SECRETARY'])
    const { id } = await params

    const member = await prisma.councilMember.findFirst({
      where: { id, council: { organizationId: me.organizationId } },
    })
    if (!member) throw new ApiError('العضوية غير موجودة', 404)

    await prisma.councilMember.delete({ where: { id } })
    return ok({ id })
  })
}

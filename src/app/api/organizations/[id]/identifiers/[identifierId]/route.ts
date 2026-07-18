import { prisma } from '@/lib/prisma'
import { authorize, handle, ok, ApiError } from '@/lib/api'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; identifierId: string }> }) {
  return handle(async () => {
    await authorize(['SUPER_USER'])
    const { id: organizationId, identifierId } = await params
    const identifier = await prisma.userIdentifier.findFirst({
      where: { id: identifierId, organizationId },
      select: { id: true, assignedUser: { select: { id: true } } },
    })
    if (!identifier) throw new ApiError('المعرّف غير موجود', 404)
    if (identifier.assignedUser) throw new ApiError('لا يمكن حذف معرّف مرتبط بمستخدم', 409)

    await prisma.userIdentifier.delete({ where: { id: identifierId } })
    return ok({ id: identifierId })
  })
}

import { prisma } from '@/lib/prisma'
import { authorize, handle, ok, ApiError } from '@/lib/api'
import { logAudit } from '@/lib/audit'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await authorize(['SECRETARY'])
    const { id } = await params

    const member = await prisma.councilMember.findFirst({
      where: { id, council: { organizationId: me.organizationId } },
    })
    if (!member) throw new ApiError('العضوية غير موجودة', 404)

    await prisma.councilMember.delete({ where: { id } })
    await logAudit({ organizationId: me.organizationId, userId: me.id, action: 'DELETE', entityType: 'CouncilMember', entityId: id, details: { councilId: member.councilId, memberUserId: member.userId } })
    return ok({ id })
  })
}

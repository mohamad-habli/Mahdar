import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorize, handle, ok, ApiError } from '@/lib/api'
import { deleteOrganizationUploadFiles } from '@/lib/uploads'

const updateSchema = z.object({ isActive: z.boolean() })
const deleteSchema = z.object({ confirmation: z.string().trim() })

async function getOrganization(id: string) {
  const organization = await prisma.organization.findUnique({
    where: { id },
    select: { id: true, name: true, isActive: true },
  })
  if (!organization) throw new ApiError('المركز غير موجود', 404)
  return organization
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await authorize(['SUPER_USER'])
    const { id } = await params
    const body = updateSchema.parse(await req.json())
    await getOrganization(id)

    await prisma.organization.update({ where: { id }, data: { isActive: body.isActive } })
    return ok({ id, isActive: body.isActive })
  })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const actor = await authorize(['SUPER_USER'])
    const { id } = await params
    const body = deleteSchema.parse(await req.json())
    const organization = await getOrganization(id)

    if (id === actor.organizationId) {
      throw new ApiError('لا يمكن حذف المركز الذي يحتوي حساب السوبر يوزر الحالي', 400)
    }
    if (body.confirmation !== organization.name) {
      throw new ApiError('اكتب اسم المركز كاملًا لتأكيد الحذف النهائي', 400)
    }

    await prisma.$transaction(async (tx) => {
      await tx.notification.deleteMany({ where: { organizationId: id } })
      await tx.reminder.deleteMany({ where: { organizationId: id } })
      await tx.followUpEntry.deleteMany({ where: { organizationId: id } })
      await tx.documentLink.deleteMany({ where: { organizationId: id } })
      await tx.attachment.deleteMany({ where: { organizationId: id } })
      await tx.cost.deleteMany({ where: { organizationId: id } })
      await tx.task.deleteMany({ where: { organizationId: id } })
      await tx.deliverable.deleteMany({ where: { organizationId: id } })
      await tx.auditLog.deleteMany({ where: { organizationId: id } })
      await tx.council.deleteMany({ where: { organizationId: id } })
      await tx.userIdentifier.deleteMany({ where: { organizationId: id } })
      await tx.user.deleteMany({ where: { organizationId: id } })
      await tx.organization.delete({ where: { id } })
    })

    await deleteOrganizationUploadFiles(id)

    return ok({ id })
  })
}

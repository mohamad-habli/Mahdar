import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorize, handle, ok, ApiError } from '@/lib/api'
import { deleteOrganizationUploadFiles } from '@/lib/uploads'
import { buildLoginIdentifier, CENTER_PREFIX_PATTERN, normalizeCenterPrefix } from '@/lib/user-identity'

const updateSchema = z.object({
  isActive: z.boolean().optional(),
  loginPrefix: z.string().trim().min(2).optional(),
}).refine((body) => body.isActive !== undefined || body.loginPrefix !== undefined, 'لا توجد بيانات لتحديثها')
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

    const loginPrefix = body.loginPrefix !== undefined ? normalizeCenterPrefix(body.loginPrefix) : undefined
    if (loginPrefix !== undefined && !CENTER_PREFIX_PATTERN.test(loginPrefix)) {
      throw new ApiError('معرّف المركز يجب أن يكون 2 إلى 10 أحرف إنجليزية كبيرة أو أرقام', 400)
    }

    if (loginPrefix !== undefined) {
      const conflict = await prisma.organization.findFirst({
        where: { loginPrefix, id: { not: id } },
        select: { id: true },
      })
      if (conflict) throw new ApiError('معرّف المركز مستخدم بالفعل', 409)

      const users = await prisma.user.findMany({
        where: { organizationId: id, loginName: { not: null } },
        select: { id: true, loginName: true },
      })
      const usernames = users.map((user) => buildLoginIdentifier(loginPrefix, user.loginName as string))
      const usernameConflict = await prisma.user.findFirst({
        where: { organizationId: { not: id }, username: { in: usernames } },
        select: { id: true },
      })
      if (usernameConflict) throw new ApiError('تغيير المعرّف يتعارض مع حساب موجود', 409)

      await prisma.$transaction(async (tx) => {
        await tx.organization.update({ where: { id }, data: { loginPrefix, ...(body.isActive !== undefined ? { isActive: body.isActive } : {}) } })
        for (const user of users) {
          await tx.user.update({ where: { id: user.id }, data: { username: buildLoginIdentifier(loginPrefix, user.loginName as string) } })
        }
      })
      return ok({ id, loginPrefix, ...(body.isActive !== undefined ? { isActive: body.isActive } : {}) })
    }

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
      await tx.user.deleteMany({ where: { organizationId: id } })
      await tx.organization.delete({ where: { id } })
    })

    await deleteOrganizationUploadFiles(id)

    return ok({ id })
  })
}

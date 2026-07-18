import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { authorize, handle, ok, ApiError } from '@/lib/api'
import { logAudit } from '@/lib/audit'
import { buildLoginIdentifier, LOGIN_NAME_PATTERN, normalizeLoginName, normalizePersonName, normalizePhone } from '@/lib/user-identity'

const updateSchema = z.object({
  name: z.string().trim().min(2).optional(),
  loginName: z.string().trim().min(3, 'اسم المستخدم مطلوب').optional(),
  role: z.enum(['SECRETARY', 'CHAIR', 'DEPT_MANAGER', 'MEMBER']).optional(),
  jobTitle: z.string().trim().optional().nullable(),
  phone: z.string().trim().min(6, 'رقم الهاتف مطلوب').optional(),
  email: z.string().trim().email('بريد غير صحيح').optional().nullable().or(z.literal('')),
  isActive: z.boolean().optional(),
  password: z.string().min(6, 'كلمة المرور 6 أحرف على الأقل').optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const actor = await authorize(['SECRETARY'])
    const { id } = await params
    const body = updateSchema.parse(await req.json())

    const target = await prisma.user.findFirst({
      where: { id, organizationId: actor.organizationId },
    })
    if (!target) throw new ApiError('المستخدم غير موجود', 404)

    // منع أمين السر من تعطيل نفسه
    if (id === actor.id && body.isActive === false) {
      throw new ApiError('لا يمكنك تعطيل حسابك', 400)
    }

    const name = body.name !== undefined ? normalizePersonName(body.name) : undefined
    const phone = body.phone !== undefined ? normalizePhone(body.phone) : undefined
    const loginName = body.loginName !== undefined ? normalizeLoginName(body.loginName) : undefined
    if (phone !== undefined && phone.length < 6) throw new ApiError('رقم الهاتف غير صالح', 400)
    if (body.loginName !== undefined && !LOGIN_NAME_PATTERN.test(body.loginName)) {
      throw new ApiError('اسم المستخدم يجب أن يبدأ بحرف إنجليزي ويحتوي أحرفًا إنجليزية وأرقامًا فقط', 400)
    }

    if (name !== undefined || phone !== undefined) {
      const duplicate = await prisma.user.findFirst({
        where: {
          organizationId: actor.organizationId,
          id: { not: id },
          OR: [
            ...(name !== undefined ? [{ name }] : []),
            ...(phone !== undefined ? [{ phone }] : []),
          ],
        },
        select: { name: true, phone: true },
      })
      if (name !== undefined && duplicate?.name === name) throw new ApiError('يوجد مستخدم بالاسم نفسه في هذا المركز', 409)
      if (phone !== undefined && duplicate?.phone === phone) throw new ApiError('رقم الهاتف مستخدم بالفعل في هذا المركز', 409)
    }

    let username: string | undefined
    if (loginName !== undefined) {
      const organization = await prisma.organization.findUnique({
        where: { id: actor.organizationId },
        select: { loginPrefix: true },
      })
      if (!organization?.loginPrefix) throw new ApiError('يجب أن يحدد السوبر يوزر معرّف المركز أولًا', 409)
      username = buildLoginIdentifier(organization.loginPrefix, loginName)
      const usernameExists = await prisma.user.findFirst({ where: { username, id: { not: id } }, select: { id: true } })
      if (usernameExists) throw new ApiError('اسم المستخدم مستخدم بالفعل في هذا المركز', 409)
    }

    await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(loginName !== undefined && username !== undefined ? { loginName, username } : {}),
        ...(body.role !== undefined ? { role: body.role } : {}),
        ...(body.jobTitle !== undefined ? { jobTitle: body.jobTitle || null } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(body.email !== undefined ? { email: body.email || null } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.password ? { passwordHash: await hashPassword(body.password) } : {}),
      },
    })

    await logAudit({
      organizationId: actor.organizationId,
      userId: actor.id,
      action: 'UPDATE',
      entityType: 'User',
      entityId: id,
      details: { fields: Object.keys(body) },
    })

    return ok({ id })
  })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const actor = await authorize(['SECRETARY'])
    const { id } = await params
    if (id === actor.id) throw new ApiError('لا يمكنك حذف حسابك', 400)

    const target = await prisma.user.findFirst({
      where: { id, organizationId: actor.organizationId },
      select: { id: true, name: true, role: true },
    })
    if (!target) throw new ApiError('المستخدم غير موجود', 404)
    if (target.role === 'SUPER_USER') throw new ApiError('لا يمكن حذف حساب السوبر يوزر', 403)

    await prisma.$transaction(async (tx) => {
      await tx.taskAssignee.deleteMany({ where: { userId: id } })
      await tx.task.updateMany({ where: { assigneeId: id }, data: { assigneeId: null } })
      await tx.deliverable.updateMany({ where: { ownerId: id }, data: { ownerId: null } })
      await tx.cost.updateMany({ where: { responsibleId: id }, data: { responsibleId: null } })
      await tx.department.updateMany({ where: { managerId: id }, data: { managerId: null } })
      await tx.council.updateMany({ where: { chairId: id }, data: { chairId: null } })
      await tx.attendance.updateMany({ where: { userId: id }, data: { userId: null, guestName: target.name } })
      await tx.user.delete({ where: { id } })
    })

    await logAudit({
      organizationId: actor.organizationId,
      userId: actor.id,
      action: 'DELETE',
      entityType: 'User',
      entityId: id,
      details: { name: target.name, role: target.role },
    })

    return ok({ id })
  })
}

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { authorize, handle, ok, ApiError } from '@/lib/api'
import { logAudit } from '@/lib/audit'

const updateSchema = z.object({
  name: z.string().trim().min(2).optional(),
  role: z.enum(['SECRETARY', 'CHAIR', 'DEPT_MANAGER', 'MEMBER']).optional(),
  jobTitle: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
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

    await prisma.user.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.role !== undefined ? { role: body.role } : {}),
        ...(body.jobTitle !== undefined ? { jobTitle: body.jobTitle || null } : {}),
        ...(body.phone !== undefined ? { phone: body.phone || null } : {}),
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

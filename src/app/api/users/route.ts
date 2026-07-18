import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { authorize, handle, ok, ApiError } from '@/lib/api'
import { logAudit } from '@/lib/audit'
import { normalizePersonName, normalizePhone } from '@/lib/user-identity'

const createSchema = z.object({
  name: z.string().trim().min(2, 'الاسم مطلوب'),
  identifierId: z.string().trim().min(1, 'اختر معرّفًا صادرًا من السوبر يوزر'),
  password: z.string().min(6, 'كلمة المرور 6 أحرف على الأقل'),
  role: z.enum(['SECRETARY', 'CHAIR', 'DEPT_MANAGER', 'MEMBER']),
  jobTitle: z.string().trim().optional(),
  phone: z.string().trim().min(6, 'رقم الهاتف مطلوب'),
  email: z.string().trim().email('بريد غير صحيح').optional().or(z.literal('')),
})

export async function POST(req: Request) {
  return handle(async () => {
    const user = await authorize(['SECRETARY'])
    const body = createSchema.parse(await req.json())
    const name = normalizePersonName(body.name)
    const phone = normalizePhone(body.phone)
    if (phone.length < 6) throw new ApiError('رقم الهاتف غير صالح', 400)

    const identifier = await prisma.userIdentifier.findFirst({
      where: {
        id: body.identifierId,
        organizationId: user.organizationId,
        isActive: true,
        assignedUser: null,
      },
      select: { id: true, code: true },
    })
    if (!identifier) throw new ApiError('المعرّف غير متاح أو مرتبط بمستخدم آخر', 409)

    const duplicate = await prisma.user.findFirst({
      where: {
        organizationId: user.organizationId,
        OR: [{ name }, { phone }],
      },
      select: { name: true, phone: true },
    })
    if (duplicate?.name === name) throw new ApiError('يوجد مستخدم بالاسم نفسه في هذا المركز', 409)
    if (duplicate?.phone === phone) throw new ApiError('رقم الهاتف مستخدم بالفعل في هذا المركز', 409)

    const username = identifier.code.toLowerCase()
    const usernameExists = await prisma.user.findUnique({ where: { username }, select: { id: true } })
    if (usernameExists) throw new ApiError('المعرّف مستخدم بالفعل', 409)

    const created = await prisma.user.create({
      data: {
        organizationId: user.organizationId,
        identifierId: identifier.id,
        name,
        username,
        passwordHash: await hashPassword(body.password),
        role: body.role,
        jobTitle: body.jobTitle || null,
        phone,
        email: body.email || null,
      },
      select: { id: true, name: true, username: true, role: true, identifier: { select: { code: true } } },
    })

    await logAudit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      entityType: 'User',
      entityId: created.id,
      details: { name: created.name, role: created.role },
    })

    return ok(created)
  })
}

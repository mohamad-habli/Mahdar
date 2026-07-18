import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { authorize, handle, ok, ApiError } from '@/lib/api'
import { logAudit } from '@/lib/audit'
import { buildLoginIdentifier, LOGIN_NAME_PATTERN, normalizeLoginName, normalizePersonName, normalizePhone } from '@/lib/user-identity'

const createSchema = z.object({
  name: z.string().trim().min(2, 'الاسم مطلوب'),
  loginName: z.string().trim().min(3, 'اسم المستخدم مطلوب'),
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
    const loginName = normalizeLoginName(body.loginName)
    if (phone.length < 6) throw new ApiError('رقم الهاتف غير صالح', 400)
    if (!LOGIN_NAME_PATTERN.test(body.loginName)) throw new ApiError('اسم المستخدم يجب أن يبدأ بحرف إنجليزي ويحتوي أحرفًا إنجليزية وأرقامًا فقط', 400)

    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { loginPrefix: true },
    })
    if (!organization?.loginPrefix) throw new ApiError('يجب أن يحدد السوبر يوزر معرّف المركز أولًا', 409)

    const duplicate = await prisma.user.findFirst({
      where: {
        organizationId: user.organizationId,
        OR: [{ name }, { phone }],
      },
      select: { name: true, phone: true },
    })
    if (duplicate?.name === name) throw new ApiError('يوجد مستخدم بالاسم نفسه في هذا المركز', 409)
    if (duplicate?.phone === phone) throw new ApiError('رقم الهاتف مستخدم بالفعل في هذا المركز', 409)

    const username = buildLoginIdentifier(organization.loginPrefix, loginName)
    const usernameExists = await prisma.user.findUnique({ where: { username }, select: { id: true } })
    if (usernameExists) throw new ApiError('اسم المستخدم مستخدم بالفعل في هذا المركز', 409)

    const created = await prisma.user.create({
      data: {
        organizationId: user.organizationId,
        name,
        loginName,
        username,
        passwordHash: await hashPassword(body.password),
        role: body.role,
        jobTitle: body.jobTitle || null,
        phone,
        email: body.email || null,
      },
      select: { id: true, name: true, loginName: true, username: true, role: true },
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

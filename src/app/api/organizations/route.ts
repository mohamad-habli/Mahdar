import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { authorize, handle, ok, ApiError } from '@/lib/api'
import { buildLoginIdentifier, CENTER_PREFIX_PATTERN, LOGIN_NAME_PATTERN, normalizeCenterPrefix, normalizeLoginName, normalizePersonName, normalizePhone } from '@/lib/user-identity'

const schema = z.object({
  name: z.string().trim().min(2, 'اسم المركز مطلوب'),
  centerIdentifier: z.string().trim().min(2, 'معرّف المركز مطلوب'),
  secretaryName: z.string().trim().min(2, 'اسم أمين السر مطلوب'),
  secretaryUsername: z.string().trim().min(3, 'اسم مستخدم أمين السر مطلوب'),
  secretaryPhone: z.string().trim().min(6, 'رقم هاتف أمين السر مطلوب'),
  secretaryPassword: z.string().min(6, 'كلمة المرور 6 أحرف على الأقل'),
})

export async function POST(req: Request) {
  return handle(async () => {
    await authorize(['SUPER_USER'])
    const body = schema.parse(await req.json())
    const centerIdentifier = normalizeCenterPrefix(body.centerIdentifier)
    const secretaryUsername = normalizeLoginName(body.secretaryUsername)
    const username = buildLoginIdentifier(centerIdentifier, secretaryUsername)
    const secretaryName = normalizePersonName(body.secretaryName)
    const secretaryPhone = normalizePhone(body.secretaryPhone)
    if (!CENTER_PREFIX_PATTERN.test(centerIdentifier)) throw new ApiError('معرّف المركز يجب أن يكون 2 إلى 10 أحرف إنجليزية كبيرة أو أرقام', 400)
    if (!LOGIN_NAME_PATTERN.test(body.secretaryUsername)) throw new ApiError('اسم المستخدم يجب أن يبدأ بحرف إنجليزي ويحتوي أحرفًا إنجليزية وأرقامًا فقط', 400)
    if (secretaryPhone.length < 6) throw new ApiError('رقم الهاتف غير صالح', 400)

    const [userExists, centerIdentifierExists] = await Promise.all([
      prisma.user.findUnique({ where: { username }, select: { id: true } }),
      prisma.organization.findFirst({ where: { loginPrefix: centerIdentifier }, select: { id: true } }),
    ])
    if (centerIdentifierExists) throw new ApiError('معرّف المركز مستخدم بالفعل', 409)
    if (userExists) throw new ApiError('معرّف الدخول النهائي مستخدم بالفعل', 409)

    const passwordHash = await hashPassword(body.secretaryPassword)
    const org = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: body.name.trim(), loginPrefix: centerIdentifier, settings: '{}' },
        select: { id: true, name: true },
      })
      await tx.user.create({
        data: {
          organizationId: organization.id,
          name: secretaryName,
          loginName: secretaryUsername,
          username,
          passwordHash,
          role: 'SECRETARY',
          jobTitle: 'أمين سر',
          phone: secretaryPhone,
        },
      })
      return organization
    })

    return ok(org)
  })
}

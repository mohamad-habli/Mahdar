import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { authorize, handle, ok, ApiError } from '@/lib/api'
import { IDENTIFIER_PATTERN, normalizeIdentifier, normalizePersonName, normalizePhone } from '@/lib/user-identity'

const schema = z.object({
  name: z.string().trim().min(2, 'اسم المركز مطلوب'),
  secretaryName: z.string().trim().min(2, 'اسم أمين السر مطلوب'),
  secretaryIdentifier: z.string().trim().min(3, 'معرّف أمين السر مطلوب'),
  secretaryPhone: z.string().trim().min(6, 'رقم هاتف أمين السر مطلوب'),
  secretaryPassword: z.string().min(6, 'كلمة المرور 6 أحرف على الأقل'),
})

export async function POST(req: Request) {
  return handle(async () => {
    const actor = await authorize(['SUPER_USER'])
    const body = schema.parse(await req.json())
    const identifier = normalizeIdentifier(body.secretaryIdentifier)
    const username = identifier.toLowerCase()
    const secretaryName = normalizePersonName(body.secretaryName)
    const secretaryPhone = normalizePhone(body.secretaryPhone)
    if (!IDENTIFIER_PATTERN.test(identifier)) {
      throw new ApiError('المعرّف يقبل الأحرف الإنجليزية والأرقام والشرطة والنقطة فقط', 400)
    }
    if (secretaryPhone.length < 6) throw new ApiError('رقم الهاتف غير صالح', 400)

    const [userExists, identifierExists] = await Promise.all([
      prisma.user.findUnique({ where: { username }, select: { id: true } }),
      prisma.userIdentifier.findUnique({ where: { code: identifier }, select: { id: true } }),
    ])
    if (userExists || identifierExists) throw new ApiError('المعرّف مستخدم بالفعل', 409)

    const passwordHash = await hashPassword(body.secretaryPassword)
    const org = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: body.name.trim(), settings: '{}' },
        select: { id: true, name: true },
      })
      const issuedIdentifier = await tx.userIdentifier.create({
        data: { organizationId: organization.id, code: identifier, createdById: actor.id },
        select: { id: true },
      })
      await tx.user.create({
        data: {
          organizationId: organization.id,
          identifierId: issuedIdentifier.id,
          name: secretaryName,
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

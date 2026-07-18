import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorize, handle, ok, ApiError } from '@/lib/api'
import { IDENTIFIER_PATTERN, normalizeIdentifier } from '@/lib/user-identity'

const schema = z.object({
  code: z.string().trim().min(3, 'المعرّف 3 أحرف على الأقل').max(40, 'المعرّف طويل جدًا'),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const actor = await authorize(['SUPER_USER'])
    const { id: organizationId } = await params
    const body = schema.parse(await req.json())
    const code = normalizeIdentifier(body.code)
    if (!IDENTIFIER_PATTERN.test(code)) {
      throw new ApiError('المعرّف يقبل الأحرف الإنجليزية والأرقام والشرطة والنقطة فقط', 400)
    }

    const [organization, identifierExists, usernameExists] = await Promise.all([
      prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } }),
      prisma.userIdentifier.findUnique({ where: { code }, select: { id: true } }),
      prisma.user.findUnique({ where: { username: code.toLowerCase() }, select: { id: true } }),
    ])
    if (!organization) throw new ApiError('المركز غير موجود', 404)
    if (identifierExists || usernameExists) throw new ApiError('هذا المعرّف مستخدم بالفعل', 409)

    const identifier = await prisma.userIdentifier.create({
      data: { organizationId, code, createdById: actor.id },
      select: { id: true, code: true, isActive: true },
    })
    return ok(identifier)
  })
}


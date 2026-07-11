import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { authorize, handle, ok, ApiError } from '@/lib/api'

const schema = z.object({
  name: z.string().trim().min(2, 'اسم المركز مطلوب'),
  secretaryName: z.string().trim().min(2, 'اسم أمين السر مطلوب'),
  secretaryUsername: z.string().trim().min(3, 'اسم المستخدم مطلوب').regex(/^[a-zA-Z0-9_.-]+$/),
  secretaryPassword: z.string().min(6, 'كلمة المرور 6 أحرف على الأقل'),
})

export async function POST(req: Request) {
  return handle(async () => {
    await authorize(['SUPER_USER'])
    const body = schema.parse(await req.json())
    const username = body.secretaryUsername.toLowerCase()
    const exists = await prisma.user.findUnique({ where: { username } })
    if (exists) throw new ApiError('اسم المستخدم مستخدم بالفعل', 409)

    const org = await prisma.organization.create({
      data: {
        name: body.name,
        settings: '{}',
        users: {
          create: {
            name: body.secretaryName,
            username,
            passwordHash: await hashPassword(body.secretaryPassword),
            role: 'SECRETARY',
            jobTitle: 'أمين سر',
          },
        },
      },
      select: { id: true, name: true },
    })

    return ok(org)
  })
}

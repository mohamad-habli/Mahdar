import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { authorize, handle, ok, ApiError } from '@/lib/api'
import { logAudit } from '@/lib/audit'

const createSchema = z.object({
  name: z.string().trim().min(2, 'الاسم مطلوب'),
  username: z.string().trim().min(3, 'اسم المستخدم 3 أحرف على الأقل').regex(/^[a-zA-Z0-9_.-]+$/, 'اسم المستخدم بالإنجليزية والأرقام فقط'),
  password: z.string().min(6, 'كلمة المرور 6 أحرف على الأقل'),
  role: z.enum(['SECRETARY', 'CHAIR', 'DEPT_MANAGER', 'MEMBER']),
  jobTitle: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email('بريد غير صحيح').optional().or(z.literal('')),
})

export async function POST(req: Request) {
  return handle(async () => {
    const user = await authorize(['SECRETARY'])
    const body = createSchema.parse(await req.json())

    const username = body.username.toLowerCase()
    const exists = await prisma.user.findUnique({ where: { username } })
    if (exists) throw new ApiError('اسم المستخدم مستخدم بالفعل', 409)

    const created = await prisma.user.create({
      data: {
        organizationId: user.organizationId,
        name: body.name,
        username,
        passwordHash: await hashPassword(body.password),
        role: body.role,
        jobTitle: body.jobTitle || null,
        phone: body.phone || null,
        email: body.email || null,
      },
      select: { id: true, name: true, username: true, role: true },
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

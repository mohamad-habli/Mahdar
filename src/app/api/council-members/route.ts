import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorize, handle, ok, ApiError } from '@/lib/api'

const schema = z.object({
  councilId: z.string().min(1),
  userId: z.string().min(1),
  membershipType: z.enum(['PERMANENT', 'GUEST']).default('PERMANENT'),
  roleInCouncil: z.string().trim().optional(),
})

export async function POST(req: Request) {
  return handle(async () => {
    const me = await authorize(['SECRETARY'])
    const b = schema.parse(await req.json())

    const council = await prisma.council.findFirst({
      where: { id: b.councilId, organizationId: me.organizationId },
    })
    if (!council) throw new ApiError('المجلس غير موجود', 404)

    const user = await prisma.user.findFirst({
      where: { id: b.userId, organizationId: me.organizationId },
    })
    if (!user) throw new ApiError('المستخدم غير موجود', 404)

    const exists = await prisma.councilMember.findUnique({
      where: { councilId_userId: { councilId: b.councilId, userId: b.userId } },
    })
    if (exists) throw new ApiError('العضو مضاف بالفعل', 409)

    const member = await prisma.councilMember.create({
      data: {
        councilId: b.councilId,
        userId: b.userId,
        membershipType: b.membershipType,
        roleInCouncil: b.roleInCouncil || null,
      },
      select: { id: true },
    })
    return ok(member)
  })
}

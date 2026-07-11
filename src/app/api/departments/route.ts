import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorize, handle, ok, ApiError } from '@/lib/api'
import { logAudit } from '@/lib/audit'

const schema = z.object({
  councilId: z.string().min(1),
  name: z.string().trim().min(2, 'الاسم مطلوب'),
  description: z.string().trim().optional(),
  managerId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
})

export async function POST(req: Request) {
  return handle(async () => {
    const me = await authorize(['SECRETARY'])
    const b = schema.parse(await req.json())

    const council = await prisma.council.findFirst({
      where: { id: b.councilId, organizationId: me.organizationId },
    })
    if (!council) throw new ApiError('المجلس غير موجود', 404)

    const dept = await prisma.department.create({
      data: {
        councilId: b.councilId,
        name: b.name,
        description: b.description || null,
        managerId: b.managerId || null,
        parentId: b.parentId || null,
      },
      select: { id: true, name: true },
    })

    await logAudit({ organizationId: me.organizationId, userId: me.id, action: 'CREATE', entityType: 'Department', entityId: dept.id, details: { name: dept.name } })
    return ok(dept)
  })
}

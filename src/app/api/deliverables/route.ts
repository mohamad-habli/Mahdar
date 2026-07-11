import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorize, handle, ok, ApiError } from '@/lib/api'

const schema = z.object({
  title: z.string().trim().min(2),
  description: z.string().trim().optional().nullable(),
  councilId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  status: z.enum(['NEW', 'IN_PROGRESS', 'LATE', 'DONE', 'CANCELLED']).default('NEW'),
})

export async function POST(req: Request) {
  return handle(async () => {
    const me = await authorize(['SECRETARY'])
    const body = schema.parse(await req.json())
    if (body.councilId) {
      const council = await prisma.council.findFirst({ where: { id: body.councilId, organizationId: me.organizationId }, select: { id: true } })
      if (!council) throw new ApiError('المجلس غير موجود', 404)
    }
    const deliverable = await prisma.deliverable.create({
      data: {
        organizationId: me.organizationId,
        title: body.title,
        description: body.description || null,
        councilId: body.councilId || null,
        departmentId: body.departmentId || null,
        ownerId: body.ownerId || null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        status: body.status,
        createdById: me.id,
      },
      select: { id: true },
    })
    return ok(deliverable)
  })
}

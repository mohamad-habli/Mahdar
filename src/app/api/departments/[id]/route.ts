import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorize, handle, ok, ApiError } from '@/lib/api'
import { logAudit } from '@/lib/audit'

const schema = z.object({
  name: z.string().trim().min(2).optional(),
  description: z.string().trim().optional().nullable(),
  managerId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

async function findOwned(id: string, organizationId: string) {
  const d = await prisma.department.findFirst({
    where: { id, council: { organizationId } },
  })
  if (!d) throw new ApiError('القسم غير موجود', 404)
  return d
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await authorize(['SECRETARY'])
    const { id } = await params
    await findOwned(id, me.organizationId)
    const b = schema.parse(await req.json())

    await prisma.department.update({
      where: { id },
      data: {
        ...(b.name !== undefined ? { name: b.name } : {}),
        ...(b.description !== undefined ? { description: b.description || null } : {}),
        ...(b.managerId !== undefined ? { managerId: b.managerId || null } : {}),
        ...(b.isActive !== undefined ? { isActive: b.isActive } : {}),
      },
    })

    await logAudit({ organizationId: me.organizationId, userId: me.id, action: 'UPDATE', entityType: 'Department', entityId: id })
    return ok({ id })
  })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await authorize(['SECRETARY'])
    const { id } = await params
    await findOwned(id, me.organizationId)

    const tasks = await prisma.task.count({ where: { departmentId: id } })
    if (tasks > 0) throw new ApiError('لا يمكن حذف قسم له تكليفات. عطّله بدلًا من ذلك.', 400)

    await prisma.department.delete({ where: { id } })
    await logAudit({ organizationId: me.organizationId, userId: me.id, action: 'DELETE', entityType: 'Department', entityId: id })
    return ok({ id })
  })
}

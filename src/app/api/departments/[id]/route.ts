import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorize, handle, ok, ApiError } from '@/lib/api'
import { logAudit } from '@/lib/audit'

const schema = z.object({
  name: z.string().trim().min(2).optional(),
  description: z.string().trim().optional().nullable(),
  managerId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  memberIds: z.array(z.string()).optional(),
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
    const current = await findOwned(id, me.organizationId)
    const b = schema.parse(await req.json())

    const memberIds = b.memberIds === undefined
      ? undefined
      : Array.from(new Set([
          ...b.memberIds,
          ...((b.managerId ?? current.managerId) ? [b.managerId ?? current.managerId as string] : []),
        ]))
    if (memberIds?.length) {
      const validUsers = await prisma.user.count({
        where: { id: { in: memberIds }, organizationId: me.organizationId, isActive: true },
      })
      if (validUsers !== memberIds.length) throw new ApiError('أحد أعضاء القسم غير صالح', 400)
    }

    await prisma.$transaction(async (tx) => {
      await tx.department.update({
        where: { id },
        data: {
          ...(b.name !== undefined ? { name: b.name } : {}),
          ...(b.description !== undefined ? { description: b.description || null } : {}),
          ...(b.managerId !== undefined ? { managerId: b.managerId || null } : {}),
          ...(b.isActive !== undefined ? { isActive: b.isActive } : {}),
        },
      })
      if (memberIds !== undefined) {
        await tx.departmentMember.deleteMany({ where: { departmentId: id } })
        if (memberIds.length) {
          await tx.departmentMember.createMany({
            data: memberIds.map((userId) => ({ departmentId: id, userId })),
          })
        }
      }
    })

    await logAudit({
      organizationId: me.organizationId,
      userId: me.id,
      action: 'UPDATE',
      entityType: 'Department',
      entityId: id,
      details: { fields: Object.keys(b), memberCount: memberIds?.length },
    })
    return ok({ id })
  })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await authorize(['SECRETARY'])
    const { id } = await params
    await findOwned(id, me.organizationId)

    const linked = await prisma.department.findUnique({
      where: { id },
      select: {
        _count: {
          select: { tasks: true, projects: true, deliverables: true, minuteItems: true, costs: true, children: true },
        },
      },
    })
    const hasLinkedData = !!linked && Object.values(linked._count).some((count) => count > 0)
    if (hasLinkedData) {
      await prisma.department.update({ where: { id }, data: { isActive: false } })
      await logAudit({ organizationId: me.organizationId, userId: me.id, action: 'ARCHIVE', entityType: 'Department', entityId: id, details: linked?._count })
      return ok({ id, archived: true, message: 'القسم مرتبط ببيانات مهمة، لذلك تمت أرشفته بدل حذفه.' })
    }

    await prisma.department.delete({ where: { id } })
    await logAudit({ organizationId: me.organizationId, userId: me.id, action: 'DELETE', entityType: 'Department', entityId: id })
    return ok({ id, archived: false })
  })
}

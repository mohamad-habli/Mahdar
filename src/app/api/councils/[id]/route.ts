import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorize, handle, ok, ApiError } from '@/lib/api'
import { logAudit } from '@/lib/audit'

const schema = z.object({
  name: z.string().trim().min(2).optional(),
  type: z.enum(['COUNCIL', 'COMMITTEE']).optional(),
  description: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional(),
  recurrence: z.enum(['NONE', 'WEEKLY', 'MONTHLY']).optional(),
  recurrenceDay: z.number().int().min(0).max(31).optional().nullable(),
  defaultStartTime: z.string().trim().optional().nullable(),
  defaultEndTime: z.string().trim().optional().nullable(),
  defaultLocation: z.string().trim().optional().nullable(),
  chairId: z.string().optional().nullable(),
})

async function findOwned(id: string, organizationId: string) {
  const c = await prisma.council.findFirst({ where: { id, organizationId } })
  if (!c) throw new ApiError('المجلس غير موجود', 404)
  return c
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await authorize(['SECRETARY'])
    const { id } = await params
    await findOwned(id, me.organizationId)
    const b = schema.parse(await req.json())
    if (b.chairId) {
      const chair = await prisma.user.findFirst({
        where: { id: b.chairId, organizationId: me.organizationId, isActive: true },
      })
      if (!chair) throw new ApiError('رئيس المجلس غير صالح', 400)
    }

    await prisma.council.update({
      where: { id },
      data: {
        ...(b.name !== undefined ? { name: b.name } : {}),
        ...(b.type !== undefined ? { type: b.type } : {}),
        ...(b.description !== undefined ? { description: b.description || null } : {}),
        ...(b.isActive !== undefined ? { isActive: b.isActive } : {}),
        ...(b.recurrence !== undefined ? { recurrence: b.recurrence } : {}),
        ...(b.recurrenceDay !== undefined ? { recurrenceDay: b.recurrenceDay } : {}),
        ...(b.defaultStartTime !== undefined ? { defaultStartTime: b.defaultStartTime || null } : {}),
        ...(b.defaultEndTime !== undefined ? { defaultEndTime: b.defaultEndTime || null } : {}),
        ...(b.defaultLocation !== undefined ? { defaultLocation: b.defaultLocation || null } : {}),
        ...(b.chairId !== undefined ? { chairId: b.chairId || null } : {}),
      },
    })

    if (b.chairId) {
      await prisma.councilMember.upsert({
        where: { councilId_userId: { councilId: id, userId: b.chairId } },
        create: { councilId: id, userId: b.chairId, roleInCouncil: 'رئيس المجلس' },
        update: { roleInCouncil: 'رئيس المجلس', isActive: true },
      })
    }

    await logAudit({ organizationId: me.organizationId, userId: me.id, action: 'UPDATE', entityType: 'Council', entityId: id, details: { fields: Object.keys(b) } })
    return ok({ id })
  })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await authorize(['SECRETARY'])
    const { id } = await params
    await findOwned(id, me.organizationId)

    const linked = await prisma.council.findUnique({
      where: { id },
      select: { _count: { select: { meetings: true, tasks: true, deliverables: true, departments: true, children: true } } },
    })
    const hasLinkedData = !!linked && Object.values(linked._count).some((count) => count > 0)
    if (hasLinkedData) {
      await prisma.council.update({ where: { id }, data: { isActive: false } })
      await logAudit({ organizationId: me.organizationId, userId: me.id, action: 'ARCHIVE', entityType: 'Council', entityId: id, details: linked?._count })
      return ok({ id, archived: true, message: 'هذا المجلس يحتوي على اجتماعات أو محاضر، لذلك تمت أرشفته بدل حذفه نهائيًا.' })
    }

    await prisma.council.delete({ where: { id } })
    await logAudit({ organizationId: me.organizationId, userId: me.id, action: 'DELETE', entityType: 'Council', entityId: id })
    return ok({ id, archived: false })
  })
}

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { handle, ok, ApiError } from '@/lib/api'

const schema = z.object({
  status: z.enum(['NEW', 'IN_PROGRESS', 'LATE', 'DONE', 'CANCELLED']).optional(),
  title: z.string().trim().min(2).optional(),
  description: z.string().trim().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  councilId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await getSession()
    if (!me) throw new ApiError('يرجى تسجيل الدخول', 401)
    const { id } = await params
    const current = await prisma.deliverable.findFirst({ where: { id, organizationId: me.organizationId } })
    if (!current) throw new ApiError('الاستحقاق غير موجود', 404)
    const body = schema.parse(await req.json())
    const fieldEdit = Object.keys(body).some((key) => key !== 'status')
    if (fieldEdit && me.role !== 'SECRETARY') throw new ApiError('تعديل بيانات الاستحقاق لأمين السر فقط', 403)
    if (me.role !== 'SECRETARY' && current.ownerId !== me.id) throw new ApiError('ليس لديك صلاحية على هذا الاستحقاق', 403)

    await prisma.$transaction(async (tx) => {
      await tx.deliverable.update({
        where: { id },
        data: {
          ...(body.status ? { status: body.status, completedAt: body.status === 'DONE' ? new Date() : null } : {}),
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.description !== undefined ? { description: body.description || null } : {}),
          ...(body.dueDate !== undefined ? { dueDate: body.dueDate ? new Date(body.dueDate) : null } : {}),
          ...(body.ownerId !== undefined ? { ownerId: body.ownerId || null } : {}),
          ...(body.councilId !== undefined ? { councilId: body.councilId || null } : {}),
          ...(body.departmentId !== undefined ? { departmentId: body.departmentId || null } : {}),
        },
      })
      if (body.status && body.status !== current.status) {
        await tx.followUpEntry.create({
          data: {
            organizationId: me.organizationId,
            deliverableId: id,
            authorId: me.id,
            type: 'STATUS',
            body: `تغيير الحالة إلى ${body.status}`,
            statusFrom: current.status,
            statusTo: body.status,
          },
        })
      }
    })
    return ok({ id })
  })
}

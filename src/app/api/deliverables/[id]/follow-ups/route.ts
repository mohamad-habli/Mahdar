import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { handle, ok, ApiError } from '@/lib/api'

const schema = z.object({
  body: z.string().trim().min(1),
  needsEscalation: z.boolean().default(false),
  attachmentUrl: z.string().url().optional().nullable(),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await getSession()
    if (!me) throw new ApiError('يرجى تسجيل الدخول', 401)
    const { id } = await params
    const deliverable = await prisma.deliverable.findFirst({ where: { id, organizationId: me.organizationId } })
    if (!deliverable) throw new ApiError('الاستحقاق غير موجود', 404)
    if (me.role !== 'SECRETARY' && deliverable.ownerId !== me.id) throw new ApiError('ليس لديك صلاحية على هذا الاستحقاق', 403)
    const body = schema.parse(await req.json())
    const entry = await prisma.followUpEntry.create({
      data: {
        organizationId: me.organizationId,
        deliverableId: id,
        authorId: me.id,
        type: body.needsEscalation ? 'ESCALATION' : body.attachmentUrl ? 'ATTACHMENT' : 'NOTE',
        body: body.body,
        needsEscalation: body.needsEscalation,
        attachmentUrl: body.attachmentUrl || null,
      },
      select: { id: true },
    })
    return ok(entry)
  })
}

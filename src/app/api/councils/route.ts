import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorize, handle, ok } from '@/lib/api'
import { logAudit } from '@/lib/audit'

const schema = z.object({
  name: z.string().trim().min(2, 'الاسم مطلوب'),
  type: z.enum(['COUNCIL', 'COMMITTEE']).default('COUNCIL'),
  description: z.string().trim().optional(),
  parentId: z.string().optional().nullable(),
  recurrence: z.enum(['NONE', 'WEEKLY', 'MONTHLY']).default('NONE'),
  recurrenceDay: z.number().int().min(0).max(31).optional().nullable(),
  defaultStartTime: z.string().trim().optional().nullable(),
  defaultEndTime: z.string().trim().optional().nullable(),
  defaultLocation: z.string().trim().optional().nullable(),
})

export async function POST(req: Request) {
  return handle(async () => {
    const me = await authorize(['SECRETARY'])
    const b = schema.parse(await req.json())

    const council = await prisma.council.create({
      data: {
        organizationId: me.organizationId,
        name: b.name,
        type: b.type,
        description: b.description || null,
        parentId: b.parentId || null,
        recurrence: b.recurrence,
        recurrenceDay: b.recurrenceDay ?? null,
        defaultStartTime: b.defaultStartTime || null,
        defaultEndTime: b.defaultEndTime || null,
        defaultLocation: b.defaultLocation || null,
      },
      select: { id: true, name: true },
    })

    await logAudit({
      organizationId: me.organizationId,
      userId: me.id,
      action: 'CREATE',
      entityType: 'Council',
      entityId: council.id,
      details: { name: council.name },
    })

    return ok(council)
  })
}

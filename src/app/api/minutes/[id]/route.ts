import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorize, handle, ok, ApiError } from '@/lib/api'
import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { createMinutesVersion, getMinutesWorkflowChecks, workflowBlockingMessages } from '@/lib/minutes-workflow'

const schema = z.object({
  action: z.enum(['submit', 'approve', 'return', 'lock']).optional(),
  title: z.string().trim().min(2, 'عنوان المحضر مطلوب').optional(),
  summary: z.string().trim().optional().nullable(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await getSession()
    if (!me) throw new ApiError('يرجى تسجيل الدخول', 401)
    const { id } = await params

    const minutes = await prisma.minutes.findFirst({
      where: { id, meeting: { council: { organizationId: me.organizationId } } },
    })
    if (!minutes) throw new ApiError('المحضر غير موجود', 404)

    let payload: unknown
    try {
      payload = await req.json()
    } catch {
      throw new ApiError('وصل طلب حفظ غير مكتمل، أعد المحاولة', 400)
    }
    const b = schema.parse(payload)

    // تحديث عنوان المحضر والملخص (أمين السر، في المسودة فقط)
    if (b.summary !== undefined || b.title !== undefined) {
      if (me.role !== 'SECRETARY') throw new ApiError('غير مصرح', 403)
      if (minutes.status !== 'DRAFT') throw new ApiError('لا يمكن تعديل عنوان أو محتوى المحضر بعد إرساله للمراجعة', 403)
      await prisma.minutes.update({
        where: { id },
        data: {
          ...(b.summary !== undefined ? { summary: b.summary || null } : {}),
          ...(b.title !== undefined ? { title: b.title } : {}),
        },
      })
      await createMinutesVersion(id, me.id)
      await logAudit({
        organizationId: me.organizationId,
        userId: me.id,
        action: 'UPDATE',
        entityType: 'Minutes',
        entityId: id,
        details: { fields: [b.title !== undefined ? 'title' : null, b.summary !== undefined ? 'summary' : null].filter(Boolean) },
      })
    }

    if (b.action) {
      const transitions: Record<string, { from: string; to: string; roles: string[]; data?: Record<string, unknown> }> = {
        submit: { from: 'DRAFT', to: 'IN_REVIEW', roles: ['SECRETARY'], data: { submittedAt: new Date() } },
        approve: { from: 'IN_REVIEW', to: 'APPROVED', roles: ['CHAIR'], data: { approvedById: me.id, approvedAt: new Date() } },
        return: { from: 'IN_REVIEW', to: 'DRAFT', roles: ['SECRETARY', 'CHAIR'], data: { submittedAt: null, approvedById: null, approvedAt: null } },
        lock: { from: 'APPROVED', to: 'LOCKED', roles: ['SECRETARY', 'CHAIR'], data: { lockedAt: new Date() } },
      }
      const t = transitions[b.action]
      if (!t.roles.includes(me.role)) throw new ApiError('ليس لديك صلاحية لهذا الإجراء', 403)
      if (minutes.status !== t.from) throw new ApiError('حالة المحضر لا تسمح بهذا الإجراء', 400)

      if (b.action === 'submit') {
        const blocking = workflowBlockingMessages(await getMinutesWorkflowChecks(id))
        if (blocking.length) throw new ApiError(blocking.join('، '), 400)
      }

      await createMinutesVersion(id, me.id, b.action === 'submit' ? 'SUBMITTED' : b.action.toUpperCase())
      await prisma.minutes.update({ where: { id }, data: { status: t.to, ...(t.data ?? {}) } })
      await logAudit({ organizationId: me.organizationId, userId: me.id, action: b.action.toUpperCase(), entityType: 'Minutes', entityId: id, details: { from: t.from, to: t.to } })
    }

    return ok({ id })
  })
}

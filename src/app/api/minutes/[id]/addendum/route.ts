import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { handle, ok, ApiError } from '@/lib/api'
import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

const schema = z.object({ content: z.string().trim().min(2, 'نص الملحق مطلوب') })

// إضافة ملحق رسمي لمحضر مقفل
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await getSession()
    if (!me) throw new ApiError('يرجى تسجيل الدخول', 401)
    if (!['SECRETARY', 'CHAIR'].includes(me.role)) throw new ApiError('غير مصرح', 403)
    const { id } = await params

    const minutes = await prisma.minutes.findFirst({
      where: { id, meeting: { council: { organizationId: me.organizationId } } },
    })
    if (!minutes) throw new ApiError('المحضر غير موجود', 404)
    if (minutes.status !== 'LOCKED') throw new ApiError('الملحق الرسمي يُضاف للمحاضر المقفلة فقط', 400)

    const b = schema.parse(await req.json())
    const addendum = await prisma.minuteAddendum.create({
      data: { minutesId: id, content: b.content, createdById: me.id },
      select: { id: true },
    })

    await logAudit({ organizationId: me.organizationId, userId: me.id, action: 'ADDENDUM', entityType: 'Minutes', entityId: id })
    return ok(addendum)
  })
}

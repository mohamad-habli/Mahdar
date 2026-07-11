import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { handle, ok, ApiError } from '@/lib/api'
import { getSession } from '@/lib/auth'

const schema = z.object({ id: z.string().optional() })

// تعليم إشعار واحد أو الكل كمقروء
export async function POST(req: Request) {
  return handle(async () => {
    const me = await getSession()
    if (!me) throw new ApiError('يرجى تسجيل الدخول', 401)
    const { id } = schema.parse(await req.json().catch(() => ({})))

    await prisma.notification.updateMany({
      where: { userId: me.id, ...(id ? { id } : { isRead: false }) },
      data: { isRead: true },
    })
    return ok({})
  })
}

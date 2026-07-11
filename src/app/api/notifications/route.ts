import { prisma } from '@/lib/prisma'
import { handle, ok, ApiError } from '@/lib/api'
import { getSession } from '@/lib/auth'
import { processDueReminders } from '@/lib/notifications'

// قائمة إشعارات المستخدم + عدد غير المقروء (تعالج التذكيرات المستحقّة أولًا)
export async function GET() {
  return handle(async () => {
    const me = await getSession()
    if (!me) throw new ApiError('يرجى تسجيل الدخول', 401)

    await processDueReminders(me.organizationId)

    const [items, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: me.id },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.notification.count({ where: { userId: me.id, isRead: false } }),
    ])

    return ok({
      unread,
      items: items.map((n) => ({
        id: n.id, type: n.type, title: n.title, body: n.body, link: n.link,
        isRead: n.isRead, createdAt: n.createdAt.toISOString(),
      })),
    })
  })
}

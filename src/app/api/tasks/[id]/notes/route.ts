import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { handle, ok, ApiError } from '@/lib/api'
import { getSession } from '@/lib/auth'
import { taskAccess } from '@/lib/tasks'

const schema = z.object({ body: z.string().trim().min(1, 'الملاحظة مطلوبة') })

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await getSession()
    if (!me) throw new ApiError('يرجى تسجيل الدخول', 401)
    const { id } = await params

    const access = await taskAccess(id, me)
    if (!access.task.id) throw new ApiError('التكليف غير موجود', 404)
    if (!access.canStatus) throw new ApiError('ليس لديك صلاحية على هذا التكليف', 403)

    const b = schema.parse(await req.json())
    const note = await prisma.$transaction(async (tx) => {
      const created = await tx.taskNote.create({
        data: { taskId: id, authorId: me.id, body: b.body },
        select: { id: true },
      })
      await tx.followUpEntry.create({
        data: {
          organizationId: me.organizationId,
          taskId: id,
          authorId: me.id,
          type: 'NOTE',
          body: b.body,
        },
      })
      return created
    })
    return ok(note)
  })
}

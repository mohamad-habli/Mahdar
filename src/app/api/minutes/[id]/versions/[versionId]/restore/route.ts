import { prisma } from '@/lib/prisma'
import { handle, ok, ApiError } from '@/lib/api'
import { authorize } from '@/lib/api'
import { createMinutesVersion } from '@/lib/minutes-workflow'

interface SnapshotItem {
  id: string
  order: number
  type: string
  title: string | null
  content: string
  departmentId: string | null
  projectId: string | null
  sourceAgendaItemId: string | null
  outcome: string
  settlementNote: string | null
  carriedFromItemId: string | null
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  return handle(async () => {
    const me = await authorize(['SECRETARY'])
    const { id, versionId } = await params
    const [minutes, version] = await Promise.all([
      prisma.minutes.findFirst({ where: { id, meeting: { council: { organizationId: me.organizationId } } } }),
      prisma.minutesVersion.findFirst({ where: { id: versionId, minutesId: id } }),
    ])
    if (!minutes || !version) throw new ApiError('النسخة غير موجودة', 404)
    if (minutes.status !== 'DRAFT') throw new ApiError('يمكن استرجاع النسخ أثناء المسودة فقط', 400)

    let items: SnapshotItem[] = []
    try { items = JSON.parse(version.itemsJson) as SnapshotItem[] } catch { throw new ApiError('تعذر قراءة النسخة', 400) }
    await createMinutesVersion(id, me.id, 'BEFORE_RESTORE')
    await prisma.$transaction(async (tx) => {
      await tx.minutes.update({ where: { id }, data: { summary: version.summary } })
      for (const item of items) {
        const exists = await tx.minuteItem.findUnique({ where: { id: item.id }, select: { id: true } })
        const data = {
          order: item.order,
          type: item.type,
          title: item.title,
          content: item.content,
          departmentId: item.departmentId,
          projectId: item.projectId,
          sourceAgendaItemId: item.sourceAgendaItemId,
          outcome: item.outcome,
          settlementNote: item.settlementNote,
          carriedFromItemId: item.carriedFromItemId,
        }
        if (exists) await tx.minuteItem.update({ where: { id: item.id }, data })
        else await tx.minuteItem.create({ data: { id: item.id, minutesId: id, ...data } })
      }
    })
    return ok({ id })
  })
}

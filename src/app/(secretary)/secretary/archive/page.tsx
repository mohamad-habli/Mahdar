import { requireUser } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import ArchiveClient from './ArchiveClient'

export const dynamic = 'force-dynamic'

export default async function ArchivePage() {
  const me = await requireUser(['SECRETARY'])

  const [meetings, councils] = await Promise.all([
    prisma.meeting.findMany({
      where: { council: { organizationId: me.organizationId } },
      orderBy: { meetingDate: 'desc' },
      include: {
        council: { select: { id: true, name: true } },
        minutes: { select: { status: true, _count: { select: { items: true } } } },
        attendances: { select: { status: true } },
        _count: { select: { agendaItems: true, tasks: true, costs: true } },
      },
    }),
    prisma.council.findMany({
      where: { organizationId: me.organizationId },
      select: { id: true, name: true }, orderBy: { name: 'asc' },
    }),
  ])

  return (
    <ArchiveClient
      councils={councils}
      meetings={meetings.map((m) => ({
        id: m.id,
        title: m.title,
        councilId: m.council.id,
        councilName: m.council.name,
        meetingDate: m.meetingDate.toISOString(),
        status: m.status,
        minutesStatus: m.minutes?.status ?? null,
        itemCount: m.minutes?._count.items ?? 0,
        presentCount: m.attendances.filter((a) => a.status === 'PRESENT').length,
        absentCount: m.attendances.filter((a) => a.status !== 'PRESENT').length,
        agendaCount: m._count.agendaItems,
        taskCount: m._count.tasks,
        costCount: m._count.costs,
      }))}
    />
  )
}

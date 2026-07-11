import { requireUser } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import MeetingsClient from './MeetingsClient'
import { syncStaleMeetingStatuses } from '@/lib/meetings'

export const dynamic = 'force-dynamic'

export default async function MeetingsPage() {
  const me = await requireUser()
  await syncStaleMeetingStatuses(me.organizationId)

  const [meetings, councils] = await Promise.all([
    prisma.meeting.findMany({
      where: { council: { organizationId: me.organizationId } },
      orderBy: { meetingDate: 'desc' },
      include: {
        council: { select: { name: true } },
        _count: { select: { attendances: true, agendaItems: true } },
        minutes: { select: { status: true } },
      },
    }),
    prisma.council.findMany({
      where: { organizationId: me.organizationId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <MeetingsClient
      councils={councils}
      meetings={meetings.map((m) => ({
        id: m.id,
        title: m.title,
        councilName: m.council.name,
        meetingDate: m.meetingDate.toISOString(),
        startTime: m.startTime,
        endTime: m.endTime,
        location: m.location,
        onlineUrl: m.onlineUrl,
        status: m.status,
        attendanceCount: m._count.attendances,
        agendaCount: m._count.agendaItems,
        minutesStatus: m.minutes?.status ?? null,
      }))}
    />
  )
}

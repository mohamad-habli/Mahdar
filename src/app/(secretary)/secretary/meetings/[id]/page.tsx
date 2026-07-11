import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import MeetingDetailClient from './MeetingDetailClient'
import { syncStaleMeetingStatuses } from '@/lib/meetings'

export const dynamic = 'force-dynamic'

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const me = await requireUser()
  const { id } = await params
  await syncStaleMeetingStatuses(me.organizationId)

  const meeting = await prisma.meeting.findFirst({
    where: { id, council: { organizationId: me.organizationId } },
    include: {
      council: {
        select: {
          id: true,
          name: true,
          members: {
            where: { isActive: true },
            include: { user: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
      agendaItems: { orderBy: { order: 'asc' } },
      attendances: true,
      reminders: { orderBy: { scheduledFor: 'asc' } },
      documentLinks: { orderBy: { createdAt: 'desc' } },
      minutes: {
        select: {
          status: true,
          items: { select: { sourceAgendaItemId: true, carriedFromItemId: true, outcome: true } },
        },
      },
    },
  })

  if (!meeting) notFound()

  const attMap = new Map(meeting.attendances.filter((a) => a.userId).map((a) => [a.userId as string, a]))

  return (
    <MeetingDetailClient
      meeting={{
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        councilName: meeting.council.name,
        meetingDate: meeting.meetingDate.toISOString(),
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        location: meeting.location,
        onlineUrl: meeting.onlineUrl,
        status: meeting.status,
      }}
      agenda={meeting.agendaItems.map((a) => ({ id: a.id, order: a.order, title: a.title, notes: a.notes }))}
      roster={meeting.council.members.map((m) => {
        const att = attMap.get(m.user.id)
        return {
          userId: m.user.id,
          name: m.user.name,
          role: m.user.role,
          membershipType: m.membershipType,
          status: att?.status ?? null,
          notes: att?.notes ?? null,
        }
      })}
      guests={meeting.attendances.filter((a) => !a.userId).map((a) => ({ guestName: a.guestName ?? '', status: a.status }))}
      hasAttendance={meeting.attendances.length > 0}
      reminders={meeting.reminders.map((r) => ({ id: r.id, offsetType: r.offsetType, scheduledFor: r.scheduledFor.toISOString(), status: r.status }))}
      documentLinks={meeting.documentLinks.map((d) => ({ id: d.id, title: d.title, url: d.url, description: d.description }))}
      workflow={{
        meetingHeld: meeting.status === 'HELD',
        attendanceSaved: meeting.attendances.length > 0,
        agendaReady: meeting.agendaItems.length > 0 && meeting.agendaItems.every((agenda) => meeting.minutes?.items.some((item) => item.sourceAgendaItemId === agenda.id)),
        previousSettled: !meeting.minutes?.items.some((item) => item.carriedFromItemId && !['CONVERTED_TO_TASK', 'CONVERTED_TO_DELIVERABLE', 'NOTE_ONLY', 'CLOSED'].includes(item.outcome)),
        minutesWritten: (meeting.minutes?.items.length ?? 0) > 0,
        reviewStarted: ['IN_REVIEW', 'APPROVED', 'LOCKED'].includes(meeting.minutes?.status ?? ''),
        locked: meeting.minutes?.status === 'LOCKED',
      }}
    />
  )
}

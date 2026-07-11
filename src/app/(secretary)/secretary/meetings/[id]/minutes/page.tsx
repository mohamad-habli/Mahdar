import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { loadMeetingMinutes } from '@/lib/minutes'
import MinutesEditor from './MinutesEditor'
import { getMinutesWorkflowChecks } from '@/lib/minutes-workflow'

export const dynamic = 'force-dynamic'

export default async function MinutesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const me = await requireUser(['SECRETARY'])
  const { id } = await params

  const data = await loadMeetingMinutes(id, me.organizationId)
  if (!data) notFound()

  // أقسام المجلس + مشاريعها + أعضاؤه (لقوائم الاختيار)
  const [departments, members, agendaItems] = await Promise.all([
    prisma.department.findMany({
      where: { councilId: data.meeting.councilId, isActive: true },
      select: { id: true, name: true, projects: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.councilMember.findMany({
      where: { councilId: data.meeting.councilId, isActive: true },
      select: { user: { select: { id: true, name: true } } },
    }),
    prisma.agendaItem.findMany({
      where: { meetingId: data.meeting.id },
      orderBy: { order: 'asc' },
      select: { id: true, order: true, title: true, notes: true },
    }),
  ])
  const agendaMinuteItems = data.minutes
    ? await prisma.minuteItem.findMany({
      where: { minutesId: data.minutes.id, sourceAgendaItemId: { not: null } },
      select: { sourceAgendaItemId: true },
    })
    : []
  const usedAgendaItemIds = new Set(agendaMinuteItems.map((item) => item.sourceAgendaItemId).filter(Boolean))
  const workflowChecks = data.minutes ? await getMinutesWorkflowChecks(data.minutes.id) : null

  return (
    <MinutesEditor
      meeting={data.meeting}
      minutes={data.minutes}
      departments={departments.map((d) => ({ id: d.id, name: d.name, projects: d.projects }))}
      members={members.map((m) => ({ id: m.user.id, name: m.user.name }))}
      agendaItems={agendaItems.map((a) => ({ id: a.id, order: a.order, title: a.title, notes: a.notes, used: usedAgendaItemIds.has(a.id) }))}
      workflowChecks={workflowChecks}
    />
  )
}

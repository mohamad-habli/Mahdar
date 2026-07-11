import { prisma } from './prisma'

const SETTLED_OUTCOMES = [
  'CONVERTED_TO_TASK',
  'CONVERTED_TO_DELIVERABLE',
  'NOTE_ONLY',
  'CLOSED',
]

export interface MinutesWorkflowChecks {
  meetingHeld: boolean
  attendanceSaved: boolean
  hasAgenda: boolean
  agendaResolved: boolean
  previousItemsSettled: boolean
  hasMinuteItems: boolean
  pendingAgendaCount: number
  pendingPreviousCount: number
}

export async function getMinutesWorkflowChecks(minutesId: string): Promise<MinutesWorkflowChecks> {
  const minutes = await prisma.minutes.findUnique({
    where: { id: minutesId },
    include: {
      meeting: {
        include: {
          agendaItems: { select: { id: true } },
          attendances: { select: { id: true } },
        },
      },
      items: { select: { sourceAgendaItemId: true, carriedFromItemId: true, outcome: true } },
    },
  })
  if (!minutes) throw new Error('MINUTES_NOT_FOUND')

  const resolvedAgendaIds = new Set(minutes.items.map((item) => item.sourceAgendaItemId).filter(Boolean))
  const pendingAgendaCount = minutes.meeting.agendaItems.filter((item) => !resolvedAgendaIds.has(item.id)).length
  const pendingPreviousCount = minutes.items.filter(
    (item) => item.carriedFromItemId && !SETTLED_OUTCOMES.includes(item.outcome)
  ).length

  return {
    meetingHeld: minutes.meeting.status === 'HELD',
    attendanceSaved: minutes.meeting.attendances.length > 0,
    hasAgenda: minutes.meeting.agendaItems.length > 0,
    agendaResolved: minutes.meeting.agendaItems.length > 0 && pendingAgendaCount === 0,
    previousItemsSettled: pendingPreviousCount === 0,
    hasMinuteItems: minutes.items.length > 0,
    pendingAgendaCount,
    pendingPreviousCount,
  }
}

export function workflowBlockingMessages(checks: MinutesWorkflowChecks): string[] {
  const messages: string[] = []
  if (!checks.meetingHeld) messages.push('يجب تحديد حالة الجلسة «منعقد»')
  if (!checks.attendanceSaved) messages.push('يجب حفظ الحضور والغياب')
  if (!checks.hasAgenda) messages.push('يجب إضافة نقطة واحدة على الأقل إلى جدول الأعمال')
  else if (!checks.agendaResolved) messages.push(`بقي ${checks.pendingAgendaCount} من نقاط جدول الأعمال دون معالجة`)
  if (!checks.previousItemsSettled) messages.push(`بقي ${checks.pendingPreviousCount} من بنود المحضر السابق دون تسديد`)
  if (!checks.hasMinuteItems) messages.push('يجب إضافة بند واحد على الأقل إلى المحضر')
  return messages
}

export async function createMinutesVersion(minutesId: string, createdById: string, reason = 'AUTO_SAVE'): Promise<void> {
  const minutes = await prisma.minutes.findUnique({
    where: { id: minutesId },
    include: { items: { orderBy: { order: 'asc' } } },
  })
  if (!minutes || minutes.status !== 'DRAFT') return

  const itemsJson = JSON.stringify(minutes.items.map((item) => ({
    id: item.id,
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
  })))
  const latest = await prisma.minutesVersion.findFirst({
    where: { minutesId },
    orderBy: { createdAt: 'desc' },
    select: { summary: true, itemsJson: true },
  })
  if (latest?.summary === minutes.summary && latest.itemsJson === itemsJson) return

  await prisma.minutesVersion.create({
    data: { minutesId, createdById, reason, summary: minutes.summary, itemsJson },
  })
  const old = await prisma.minutesVersion.findMany({
    where: { minutesId },
    orderBy: { createdAt: 'desc' },
    skip: 30,
    select: { id: true },
  })
  if (old.length) await prisma.minutesVersion.deleteMany({ where: { id: { in: old.map((item) => item.id) } } })
}

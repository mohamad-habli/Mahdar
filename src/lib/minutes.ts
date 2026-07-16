import { prisma } from './prisma'
import type { MinuteItemData } from '@/components/MinuteItemCard'

export interface FullMinutes {
  id: string
  title: string | null
  status: string
  summary: string | null
  submittedAt: string | null
  approvedAt: string | null
  approvedByName: string | null
  lockedAt: string | null
  versions: { id: string; reason: string; authorName: string; createdAt: string }[]
  items: MinuteItemData[]
  addenda: { id: string; content: string; authorName: string; createdAt: string }[]
}

export interface MeetingContext {
  id: string
  title: string
  councilId: string
  councilName: string
  meetingDate: string
  status: string
}

// يحمّل المحضر الكامل لاجتماع داخل المؤسسة. يعيد null إن لم يوجد اجتماع،
// و minutes=null إن لم يُنشأ المحضر بعد.
export async function loadMeetingMinutes(meetingId: string, organizationId: string): Promise<
  | null
  | { meeting: MeetingContext; minutes: FullMinutes | null }
> {
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, council: { organizationId } },
    include: {
      council: { select: { id: true, name: true } },
      minutes: {
        include: {
          approvedBy: { select: { name: true } },
          items: {
            orderBy: { order: 'asc' },
            include: {
              department: { select: { name: true } },
              project: { select: { name: true } },
              carriedFromItem: { select: { id: true, title: true, content: true } },
              tasks: {
                select: {
                  dueDate: true,
                  priority: true,
                  status: true,
                  assignee: { select: { name: true } },
                  assignees: { include: { user: { select: { name: true } } }, orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }] },
                },
              },
              deliverables: { select: { title: true, dueDate: true, status: true, owner: { select: { name: true } } } },
              costs: { select: { expectedAmount: true, actualAmount: true, currency: true, paymentStatus: true } },
            },
          },
          addenda: {
            orderBy: { createdAt: 'asc' },
            include: { createdBy: { select: { name: true } } },
          },
          versions: {
            orderBy: { createdAt: 'desc' },
            take: 12,
            include: { createdBy: { select: { name: true } } },
          },
        },
      },
    },
  })

  if (!meeting) return null

  const meetingCtx: MeetingContext = {
    id: meeting.id,
    title: meeting.title,
    councilId: meeting.council.id,
    councilName: meeting.council.name,
    meetingDate: meeting.meetingDate.toISOString(),
    status: meeting.status,
  }

  if (!meeting.minutes) return { meeting: meetingCtx, minutes: null }

  const m = meeting.minutes
  const items: MinuteItemData[] = m.items.map((it) => {
    const task = it.tasks[0]
    const cost = it.costs[0]
    return {
      id: it.id,
      order: it.order,
      type: it.type,
      title: it.title,
      content: it.content,
      outcome: it.outcome,
      settledAt: it.settledAt?.toISOString() ?? null,
      settlementNote: it.settlementNote,
      carriedFrom: it.carriedFromItem ? { id: it.carriedFromItem.id, title: it.carriedFromItem.title, content: it.carriedFromItem.content } : null,
      departmentName: it.department?.name ?? null,
      projectName: it.project?.name ?? null,
      voteResult: it.voteResult,
      votesFor: it.votesFor,
      votesAgainst: it.votesAgainst,
      votesAbstain: it.votesAbstain,
      task: task
        ? {
            assigneeName: task.assignees[0]?.user.name ?? task.assignee?.name ?? null,
            assigneeNames: task.assignees.map((a) => a.user.name),
            dueDate: task.dueDate?.toISOString() ?? null,
            priority: task.priority,
            status: task.status,
          }
        : null,
      deliverable: it.deliverables[0]
        ? {
            title: it.deliverables[0].title,
            ownerName: it.deliverables[0].owner?.name ?? null,
            dueDate: it.deliverables[0].dueDate?.toISOString() ?? null,
            status: it.deliverables[0].status,
          }
        : null,
      cost: cost
        ? { expectedAmount: cost.expectedAmount, actualAmount: cost.actualAmount, currency: cost.currency, paymentStatus: cost.paymentStatus }
        : null,
    }
  })

  return {
    meeting: meetingCtx,
    minutes: {
      id: m.id,
      title: m.title,
      status: m.status,
      summary: m.summary,
      submittedAt: m.submittedAt?.toISOString() ?? null,
      approvedAt: m.approvedAt?.toISOString() ?? null,
      approvedByName: m.approvedBy?.name ?? null,
      lockedAt: m.lockedAt?.toISOString() ?? null,
      versions: m.versions.map((version) => ({
        id: version.id,
        reason: version.reason,
        authorName: version.createdBy.name,
        createdAt: version.createdAt.toISOString(),
      })),
      items,
      addenda: m.addenda.map((a) => ({ id: a.id, content: a.content, authorName: a.createdBy.name, createdAt: a.createdAt.toISOString() })),
    },
  }
}

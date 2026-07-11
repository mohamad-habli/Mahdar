import { prisma } from './prisma'

export interface TaskBrief {
  id: string; title: string; assigneeName: string | null; dueDate: string | null; priority: string; status: string
}
export interface CostBrief {
  id: string; description: string; expectedAmount: number | null; actualAmount: number | null; currency: string; paymentStatus: string; responsibleName: string | null
}
export interface DepartmentReport {
  department: { id: string; name: string; managerName: string | null; managerId: string | null; councilName: string }
  tasks: { open: TaskBrief[]; overdue: TaskBrief[]; done: TaskBrief[]; counts: { open: number; overdue: number; done: number; total: number } }
  decisions: { id: string; title: string | null; content: string; meetingTitle: string | null; date: string | null }[]
  costs: { items: CostBrief[]; totalExpected: number; totalActual: number; unpaidCount: number }
  lastMeeting: { title: string; date: string; summary: string | null; notes: string[] } | null
  generatedAt: string
}

const OPEN = ['NEW', 'IN_PROGRESS', 'LATE']
function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d }

export async function generateDepartmentReport(departmentId: string, organizationId: string): Promise<DepartmentReport | null> {
  const dept = await prisma.department.findFirst({
    where: { id: departmentId, council: { organizationId } },
    include: { manager: { select: { id: true, name: true } }, council: { select: { id: true, name: true } } },
  })
  if (!dept) return null

  const [tasks, decisionRows, costRows, lastMeeting] = await Promise.all([
    prisma.task.findMany({
      where: { departmentId },
      orderBy: { dueDate: 'asc' },
      include: { assignee: { select: { name: true } } },
    }),
    prisma.minuteItem.findMany({
      where: { type: 'DECISION', departmentId },
      include: { minutes: { select: { meeting: { select: { title: true, meetingDate: true } } } } },
    }),
    prisma.cost.findMany({
      where: { departmentId },
      include: { responsible: { select: { name: true } } },
    }),
    prisma.meeting.findFirst({
      where: { councilId: dept.council.id, minutes: { isNot: null } },
      orderBy: { meetingDate: 'desc' },
      include: { minutes: { include: { items: { where: { type: 'NOTE' } } } } },
    }),
  ])

  const brief = (t: typeof tasks[number]): TaskBrief => ({
    id: t.id, title: t.title, assigneeName: t.assignee?.name ?? null,
    dueDate: t.dueDate?.toISOString() ?? null, priority: t.priority, status: t.status,
  })
  const open = tasks.filter((t) => OPEN.includes(t.status))
  const overdue = open.filter((t) => t.dueDate && t.dueDate < startOfToday())
  const done = tasks.filter((t) => t.status === 'DONE')

  const costItems: CostBrief[] = costRows.map((c) => ({
    id: c.id, description: c.description, expectedAmount: c.expectedAmount, actualAmount: c.actualAmount,
    currency: c.currency, paymentStatus: c.paymentStatus, responsibleName: c.responsible?.name ?? null,
  }))

  return {
    department: { id: dept.id, name: dept.name, managerName: dept.manager?.name ?? null, managerId: dept.manager?.id ?? null, councilName: dept.council.name },
    tasks: {
      open: open.map(brief), overdue: overdue.map(brief), done: done.map(brief),
      counts: { open: open.length, overdue: overdue.length, done: done.length, total: tasks.length },
    },
    decisions: decisionRows.map((d) => ({
      id: d.id, title: d.title, content: d.content,
      meetingTitle: d.minutes.meeting.title, date: d.minutes.meeting.meetingDate.toISOString(),
    })),
    costs: {
      items: costItems,
      totalExpected: costRows.reduce((s, c) => s + (c.expectedAmount ?? 0), 0),
      totalActual: costRows.reduce((s, c) => s + (c.actualAmount ?? 0), 0),
      unpaidCount: costRows.filter((c) => c.paymentStatus !== 'PAID').length,
    },
    lastMeeting: lastMeeting ? {
      title: lastMeeting.title,
      date: lastMeeting.meetingDate.toISOString(),
      summary: lastMeeting.minutes?.summary ?? null,
      notes: lastMeeting.minutes?.items.map((i) => i.content) ?? [],
    } : null,
    generatedAt: new Date().toISOString(),
  }
}

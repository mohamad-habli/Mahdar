import { prisma } from './prisma'
import type { AuthUser } from '@/types'
import type { Prisma } from '@prisma/client'

// أقسام يديرها المستخدم (لمسؤول القسم)
export async function managedDeptIds(userId: string): Promise<string[]> {
  const depts = await prisma.department.findMany({ where: { managerId: userId }, select: { id: true } })
  return depts.map((d) => d.id)
}

// شرط رؤية التكليفات حسب الدور
export async function taskScopeWhere(user: AuthUser): Promise<Prisma.TaskWhereInput> {
  switch (user.role) {
    case 'SECRETARY':
    case 'CHAIR':
      return { organizationId: user.organizationId }
    case 'DEPT_MANAGER': {
      const ids = await managedDeptIds(user.id)
      return { organizationId: user.organizationId, departmentId: { in: ids.length ? ids : ['__none__'] } }
    }
    case 'MEMBER':
      return { organizationId: user.organizationId, OR: [{ assigneeId: user.id }, { assignees: { some: { userId: user.id } } }] }
    default:
      return { id: '__none__' }
  }
}

// صلاحية المستخدم على تكليف محدّد
export async function taskAccess(
  taskId: string,
  user: AuthUser
): Promise<{ task: { id: string; departmentId: string | null; assigneeId: string | null; status: string; assignees: { userId: string }[] }; canStatus: boolean; canFields: boolean }> {
  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: user.organizationId },
    select: { id: true, departmentId: true, assigneeId: true, status: true, assignees: { select: { userId: true } } },
  })
  if (!task) return { task: { id: '', departmentId: null, assigneeId: null, status: '', assignees: [] }, canStatus: false, canFields: false }

  if (user.role === 'SECRETARY') return { task, canStatus: true, canFields: true }
  if (user.role === 'DEPT_MANAGER') {
    const ids = await managedDeptIds(user.id)
    const own = task.departmentId ? ids.includes(task.departmentId) : false
    return { task, canStatus: own, canFields: false }
  }
  if (user.role === 'MEMBER') {
    const own = task.assigneeId === user.id || task.assignees.some((a) => a.userId === user.id)
    return { task, canStatus: own, canFields: false }
  }
  return { task, canStatus: false, canFields: false }
}

export interface TaskFull {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  dueDate: string | null
  completedAt: string | null
  departmentId: string | null
  departmentName: string | null
  projectId: string | null
  projectName: string | null
  deliverableId: string | null
  councilId: string | null
  councilName: string | null
  assigneeId: string | null
  assigneeName: string | null
  assignees: { userId: string; name: string; isPrimary: boolean }[]
  sourceMeetingId: string | null
  sourceMeetingTitle: string | null
  createdAt: string
  updatedAt: string
  notes: { id: string; body: string; authorName: string; createdAt: string }[]
  followUps: { id: string; type: string; body: string; authorName: string; needsEscalation: boolean; createdAt: string }[]
  costs: { id: string; description: string; expectedAmount: number | null; actualAmount: number | null; currency: string; paymentStatus: string }[]
}

const taskInclude = {
  department: { select: { name: true } },
  project: { select: { name: true } },
  council: { select: { name: true } },
  assignee: { select: { id: true, name: true } },
  assignees: { include: { user: { select: { id: true, name: true } } }, orderBy: [{ isPrimary: 'desc' as const }, { assignedAt: 'asc' as const }] },
  sourceMeeting: { select: { id: true, title: true } },
  notes: { orderBy: { createdAt: 'desc' as const }, include: { author: { select: { name: true } } } },
  followUps: { orderBy: { createdAt: 'desc' as const }, include: { author: { select: { name: true } } } },
  costs: { select: { id: true, description: true, expectedAmount: true, actualAmount: true, currency: true, paymentStatus: true } },
}

type TaskRow = Prisma.TaskGetPayload<{ include: typeof taskInclude }>

export function serializeTask(t: TaskRow): TaskFull {
  const assignees = t.assignees.map((a) => ({ userId: a.user.id, name: a.user.name, isPrimary: a.isPrimary }))
  const primary = assignees.find((a) => a.isPrimary) ?? assignees[0]
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    departmentId: t.departmentId,
    departmentName: t.department?.name ?? null,
    projectId: t.projectId,
    projectName: t.project?.name ?? null,
    deliverableId: t.deliverableId,
    councilId: t.councilId,
    councilName: t.council?.name ?? null,
    assigneeId: primary?.userId ?? t.assigneeId,
    assigneeName: primary?.name ?? t.assignee?.name ?? null,
    assignees,
    sourceMeetingId: t.sourceMeetingId,
    sourceMeetingTitle: t.sourceMeeting?.title ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    notes: t.notes.map((n) => ({ id: n.id, body: n.body, authorName: n.author?.name ?? 'مستخدم محذوف', createdAt: n.createdAt.toISOString() })),
    followUps: t.followUps.map((n) => ({ id: n.id, type: n.type, body: n.body, authorName: n.author?.name ?? 'مستخدم محذوف', needsEscalation: n.needsEscalation, createdAt: n.createdAt.toISOString() })),
    costs: t.costs.map((c) => ({ id: c.id, description: c.description, expectedAmount: c.expectedAmount, actualAmount: c.actualAmount, currency: c.currency, paymentStatus: c.paymentStatus })),
  }
}

export async function loadTasks(where: Prisma.TaskWhereInput): Promise<TaskFull[]> {
  const rows = await prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
  })
  return rows.map(serializeTask)
}

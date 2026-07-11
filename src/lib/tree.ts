import { prisma } from './prisma'
import { loadTasks, type TaskFull } from './tasks'

export interface TreeCost {
  id: string
  description: string
  expectedAmount: number | null
  actualAmount: number | null
  currency: string
  paymentStatus: string
  projectId: string | null
  departmentId: string | null
}
export interface TreeDecision {
  id: string
  title: string | null
  content: string
  projectId: string | null
  departmentId: string | null
}
export interface TreeProject {
  id: string
  name: string
  status: string
  decisions: TreeDecision[]
  tasks: TaskFull[]
  costs: TreeCost[]
}
export interface TreeDeliverable {
  id: string
  title: string
  status: string
  ownerName: string | null
  departmentId: string | null
  tasks: TaskFull[]
}
export interface TreeDept {
  id: string
  name: string
  managerName: string | null
  deliverables: TreeDeliverable[]
  projects: TreeProject[]
  decisions: TreeDecision[] // بلا مشروع
  tasks: TaskFull[]
  costs: TreeCost[]
}
export interface TreeCouncil {
  id: string
  name: string
  type: string
  departments: TreeDept[]
}

export async function loadTree(organizationId: string): Promise<TreeCouncil[]> {
  const [councils, allTasks, deliverableRows, decisionRows, costRows] = await Promise.all([
    prisma.council.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
      include: {
        departments: {
          where: { parentId: null },
          orderBy: { createdAt: 'asc' },
          include: { manager: { select: { name: true } }, projects: { orderBy: { createdAt: 'asc' }, select: { id: true, name: true, status: true } } },
        },
      },
    }),
    loadTasks({ organizationId }),
    prisma.deliverable.findMany({
      where: { organizationId },
      select: { id: true, title: true, status: true, departmentId: true, owner: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.minuteItem.findMany({
      where: { type: 'DECISION', minutes: { meeting: { council: { organizationId } } } },
      select: { id: true, title: true, content: true, projectId: true, departmentId: true },
    }),
    prisma.cost.findMany({
      where: { organizationId },
      select: { id: true, description: true, expectedAmount: true, actualAmount: true, currency: true, paymentStatus: true, projectId: true, departmentId: true },
    }),
  ])

  const decisions: TreeDecision[] = decisionRows
  const costs: TreeCost[] = costRows
  const deliverables: TreeDeliverable[] = deliverableRows.map((d) => ({
    id: d.id,
    title: d.title,
    status: d.status,
    ownerName: d.owner?.name ?? null,
    departmentId: d.departmentId,
    tasks: allTasks.filter((t) => t.deliverableId === d.id),
  }))

  return councils.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    departments: c.departments.map((d) => {
      const deptTasks = allTasks.filter((t) => t.departmentId === d.id)
      const deptDecisions = decisions.filter((x) => x.departmentId === d.id)
      const deptCosts = costs.filter((x) => x.departmentId === d.id)
      return {
        id: d.id,
        name: d.name,
        managerName: d.manager?.name ?? null,
        deliverables: deliverables.filter((x) => x.departmentId === d.id),
        projects: d.projects.map((p) => ({
          id: p.id,
          name: p.name,
          status: p.status,
          decisions: deptDecisions.filter((x) => x.projectId === p.id),
          tasks: deptTasks.filter((t) => t.projectId === p.id),
          costs: deptCosts.filter((x) => x.projectId === p.id),
        })),
        decisions: deptDecisions.filter((x) => !x.projectId),
        tasks: deptTasks.filter((t) => !t.projectId),
        costs: deptCosts.filter((x) => !x.projectId),
      }
    }),
  }))
}

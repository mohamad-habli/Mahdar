import type { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { loadTasks, type TaskFull } from './tasks'

export interface DeliverableFull {
  id: string
  title: string
  description: string | null
  status: string
  dueDate: string | null
  completedAt: string | null
  councilId: string | null
  councilName: string | null
  departmentId: string | null
  departmentName: string | null
  ownerId: string | null
  ownerName: string | null
  sourceMeetingId: string | null
  sourceMeetingTitle: string | null
  createdAt: string
  updatedAt: string
  tasks: TaskFull[]
  followUps: { id: string; type: string; body: string; authorName: string; needsEscalation: boolean; createdAt: string }[]
}

export async function loadDeliverables(where: Prisma.DeliverableWhereInput): Promise<DeliverableFull[]> {
  const rows = await prisma.deliverable.findMany({
    where,
    include: {
      council: { select: { name: true } },
      department: { select: { name: true } },
      owner: { select: { name: true } },
      sourceMeeting: { select: { title: true } },
      followUps: { orderBy: { createdAt: 'desc' }, include: { author: { select: { name: true } } } },
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
  })
  const tasks = rows.length ? await loadTasks({ deliverableId: { in: rows.map((row) => row.id) } }) : []
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    dueDate: row.dueDate?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    councilId: row.councilId,
    councilName: row.council?.name ?? null,
    departmentId: row.departmentId,
    departmentName: row.department?.name ?? null,
    ownerId: row.ownerId,
    ownerName: row.owner?.name ?? null,
    sourceMeetingId: row.sourceMeetingId,
    sourceMeetingTitle: row.sourceMeeting?.title ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    tasks: tasks.filter((task) => task.deliverableId === row.id),
    followUps: row.followUps.map((entry) => ({
      id: entry.id,
      type: entry.type,
      body: entry.body,
      authorName: entry.author.name,
      needsEscalation: entry.needsEscalation,
      createdAt: entry.createdAt.toISOString(),
    })),
  }))
}

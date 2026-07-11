import { requireUser } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { loadTasks } from '@/lib/tasks'
import TasksBoard from './TasksBoard'

export const dynamic = 'force-dynamic'

export default async function SecretaryTasksPage() {
  const me = await requireUser(['SECRETARY'])

  const [tasks, departments, members] = await Promise.all([
    loadTasks({ organizationId: me.organizationId }),
    prisma.department.findMany({
      where: { council: { organizationId: me.organizationId }, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({
      where: { organizationId: me.organizationId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return <TasksBoard tasks={tasks} departments={departments} members={members} />
}

import { requireUser } from '@/lib/guard'
import { loadTasks } from '@/lib/tasks'
import { loadDeliverables } from '@/lib/deliverables'
import MyTodayClient from './MyTodayClient'

export default async function MyTodayPage() {
  const me = await requireUser()
  const [tasks, deliverables] = await Promise.all([
    loadTasks({
      organizationId: me.organizationId,
      OR: [{ assigneeId: me.id }, { assignees: { some: { userId: me.id } } }],
    }),
    loadDeliverables({ organizationId: me.organizationId, ownerId: me.id }),
  ])
  return <MyTodayClient tasks={tasks} deliverables={deliverables} />
}

import { requireUser } from '@/lib/guard'
import { loadTasks, taskScopeWhere } from '@/lib/tasks'
import ScopedTasksList from '@/components/tasks/ScopedTasksList'

export const dynamic = 'force-dynamic'

export default async function MemberTasksPage() {
  const me = await requireUser(['MEMBER'])
  const where = await taskScopeWhere(me)
  const tasks = await loadTasks(where)

  return (
    <ScopedTasksList
      tasks={tasks}
      title="تكليفاتي"
      subtitle="حدّث حالة تكليفاتك وأضِف ملاحظات."
    />
  )
}

import { requireUser } from '@/lib/guard'
import { loadTasks, taskScopeWhere } from '@/lib/tasks'
import ScopedTasksList from '@/components/tasks/ScopedTasksList'

export const dynamic = 'force-dynamic'

export default async function ManagerTasksPage() {
  const me = await requireUser(['DEPT_MANAGER'])
  const where = await taskScopeWhere(me)
  const tasks = await loadTasks(where)

  return (
    <ScopedTasksList
      tasks={tasks}
      title="تكليفات قسمي"
      subtitle="حدّث حالة التنفيذ وأضِف ملاحظات المتابعة."
    />
  )
}

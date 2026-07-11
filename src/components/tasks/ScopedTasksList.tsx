'use client'

import { useMemo, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import TaskRow from '@/components/tasks/TaskRow'
import TaskDetailModal from '@/components/tasks/TaskDetailModal'
import { isOverdue } from '@/lib/utils'
import type { TaskFull } from '@/lib/tasks'

type View = 'OPEN' | 'OVERDUE' | 'DONE' | 'ALL'
const OPEN = ['NEW', 'IN_PROGRESS', 'LATE']

export default function ScopedTasksList({
  tasks, title, subtitle,
}: {
  tasks: TaskFull[]
  title: string
  subtitle: string
}) {
  const [view, setView] = useState<View>('OPEN')
  const [selected, setSelected] = useState<TaskFull | null>(null)

  const counts = useMemo(() => ({
    OPEN: tasks.filter((t) => OPEN.includes(t.status)).length,
    OVERDUE: tasks.filter((t) => OPEN.includes(t.status) && isOverdue(t.dueDate)).length,
    DONE: tasks.filter((t) => t.status === 'DONE').length,
    ALL: tasks.length,
  }), [tasks])

  const filtered = useMemo(() => tasks.filter((t) => {
    if (view === 'OPEN') return OPEN.includes(t.status)
    if (view === 'OVERDUE') return OPEN.includes(t.status) && isOverdue(t.dueDate)
    if (view === 'DONE') return t.status === 'DONE'
    return true
  }), [tasks, view])

  const LABELS: Record<View, string> = { OPEN: 'المفتوحة', OVERDUE: 'المتأخرة', DONE: 'المكتملة', ALL: 'الكل' }

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title={title} subtitle={subtitle} />

      <div className="flex gap-2 flex-wrap mb-4">
        {(Object.keys(LABELS) as View[]).map((v) => (
          <button key={v} onClick={() => setView(v)} className="badge transition-colors"
            style={view === v ? { background: 'var(--brand)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'pointer' }}>
            {LABELS[v]} <span className="opacity-70">({counts[v]})</span>
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={ClipboardList} title="لا تكليفات هنا" hint="لا توجد تكليفات مطابقة لهذا العرض." />
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {filtered.map((t) => <TaskRow key={t.id} task={t} onClick={() => setSelected(t)} />)}
          </div>
        )}
      </div>

      <TaskDetailModal task={selected} canUpdate onClose={() => setSelected(null)} />
    </div>
  )
}

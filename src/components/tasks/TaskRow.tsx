'use client'

import { Building2, User, CalendarClock, AlertTriangle, ChevronLeft } from 'lucide-react'
import { TaskStatusBadge, PriorityBadge } from '@/components/badges'
import { formatDate, isOverdue } from '@/lib/utils'
import type { TaskFull } from '@/lib/tasks'

const OPEN = ['NEW', 'IN_PROGRESS', 'LATE']

export default function TaskRow({ task, onClick }: { task: TaskFull; onClick: () => void }) {
  const overdue = OPEN.includes(task.status) && isOverdue(task.dueDate)
  return (
    <button
      onClick={onClick}
      className="w-full text-right px-4 py-3 flex items-center gap-3 flex-wrap hover:bg-[var(--surface-2)] transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-1)' }}>{task.title}</div>
        <div className="text-xs mt-0.5 flex items-center gap-2 flex-wrap" style={{ color: 'var(--text-3)' }}>
          {task.departmentName && <span className="flex items-center gap-1"><Building2 size={11} /> {task.departmentName}</span>}
          {(task.assignees.length > 0 || task.assigneeName) && <span className="flex items-center gap-1"><User size={11} /> {task.assignees.map((a) => a.name).join('، ') || task.assigneeName}</span>}
          {task.dueDate && (
            <span className="flex items-center gap-1" style={overdue ? { color: 'var(--danger)' } : undefined}>
              <CalendarClock size={11} /> {formatDate(task.dueDate)}
            </span>
          )}
          {overdue && <span className="flex items-center gap-1" style={{ color: 'var(--danger)' }}><AlertTriangle size={11} /> متأخر</span>}
          {task.notes.length > 0 && <span>· {task.notes.length} متابعة</span>}
        </div>
      </div>
      <PriorityBadge priority={task.priority} />
      <TaskStatusBadge status={task.status} />
      <ChevronLeft size={16} style={{ color: 'var(--text-3)' }} />
    </button>
  )
}

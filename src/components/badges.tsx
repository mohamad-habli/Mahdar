import {
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  MINUTES_STATUS_LABELS,
  type TaskStatus,
  type TaskPriority,
  type MinutesStatus,
} from '@/types'

function Badge({ bg, fg, children }: { bg: string; fg: string; children: React.ReactNode }) {
  return (
    <span className="badge" style={{ background: bg, color: fg }}>
      {children}
    </span>
  )
}

const TASK_TONE: Record<TaskStatus, [string, string]> = {
  NEW: ['var(--info-bg)', 'var(--info)'],
  IN_PROGRESS: ['var(--brand-soft)', 'var(--brand)'],
  LATE: ['var(--danger-bg)', 'var(--danger)'],
  DONE: ['var(--success-bg)', 'var(--success)'],
  CANCELLED: ['var(--surface-3)', 'var(--text-3)'],
}

export function TaskStatusBadge({ status }: { status: string }) {
  const [bg, fg] = TASK_TONE[status as TaskStatus] ?? TASK_TONE.NEW
  return <Badge bg={bg} fg={fg}>{TASK_STATUS_LABELS[status as TaskStatus] ?? status}</Badge>
}

const PRIORITY_TONE: Record<TaskPriority, [string, string]> = {
  LOW: ['var(--surface-3)', 'var(--text-2)'],
  MEDIUM: ['var(--info-bg)', 'var(--info)'],
  HIGH: ['var(--warning-bg)', 'var(--warning)'],
  URGENT: ['var(--danger-bg)', 'var(--danger)'],
}

export function PriorityBadge({ priority }: { priority: string }) {
  const [bg, fg] = PRIORITY_TONE[priority as TaskPriority] ?? PRIORITY_TONE.MEDIUM
  return <Badge bg={bg} fg={fg}>{TASK_PRIORITY_LABELS[priority as TaskPriority] ?? priority}</Badge>
}

const MINUTES_TONE: Record<MinutesStatus, [string, string]> = {
  DRAFT: ['var(--surface-3)', 'var(--text-2)'],
  IN_REVIEW: ['var(--warning-bg)', 'var(--warning)'],
  APPROVED: ['var(--success-bg)', 'var(--success)'],
  LOCKED: ['var(--brand-soft)', 'var(--brand)'],
}

export function MinutesStatusBadge({ status }: { status: string }) {
  const [bg, fg] = MINUTES_TONE[status as MinutesStatus] ?? MINUTES_TONE.DRAFT
  return <Badge bg={bg} fg={fg}>{MINUTES_STATUS_LABELS[status as MinutesStatus] ?? status}</Badge>
}

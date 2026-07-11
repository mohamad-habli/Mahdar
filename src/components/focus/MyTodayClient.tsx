'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, CalendarClock, Inbox, Milestone, RefreshCw } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import TaskRow from '@/components/tasks/TaskRow'
import TaskDetailModal from '@/components/tasks/TaskDetailModal'
import Modal from '@/components/ui/Modal'
import { TaskStatusBadge } from '@/components/badges'
import { apiSend } from '@/lib/client'
import { formatDate } from '@/lib/utils'
import { TASK_STATUS_LABELS, type TaskStatus } from '@/types'
import type { TaskFull } from '@/lib/tasks'
import type { DeliverableFull } from '@/lib/deliverables'
import { useRouter } from 'next/navigation'

const OPEN = ['NEW', 'IN_PROGRESS', 'LATE']

type FocusItem =
  | { kind: 'TASK'; id: string; date: string | null; escalated: boolean; stale: boolean; task: TaskFull }
  | { kind: 'DELIVERABLE'; id: string; date: string | null; escalated: boolean; stale: boolean; deliverable: DeliverableFull }

function dayStart(date = new Date()) { const value = new Date(date); value.setHours(0, 0, 0, 0); return value }
function sameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate() }

export default function MyTodayClient({ tasks, deliverables }: { tasks: TaskFull[]; deliverables: DeliverableFull[] }) {
  const [selectedTask, setSelectedTask] = useState<TaskFull | null>(null)
  const [selectedDeliverable, setSelectedDeliverable] = useState<DeliverableFull | null>(null)
  const groups = useMemo(() => {
    const today = dayStart()
    const week = new Date(today); week.setDate(week.getDate() + 7)
    const staleBefore = new Date(); staleBefore.setDate(staleBefore.getDate() - 3)
    const items: FocusItem[] = [
      ...tasks.filter((task) => OPEN.includes(task.status)).map((task): FocusItem => {
        const last = [task.updatedAt, ...task.notes.map((item) => item.createdAt), ...task.followUps.map((item) => item.createdAt)].sort().at(-1) ?? task.updatedAt
        return { kind: 'TASK', id: task.id, date: task.dueDate, escalated: task.followUps.some((entry) => entry.needsEscalation), stale: new Date(last) < staleBefore, task }
      }),
      ...deliverables.filter((item) => OPEN.includes(item.status)).map((deliverable): FocusItem => {
        const last = [deliverable.updatedAt, ...deliverable.followUps.map((item) => item.createdAt)].sort().at(-1) ?? deliverable.updatedAt
        return { kind: 'DELIVERABLE', id: deliverable.id, date: deliverable.dueDate, escalated: deliverable.followUps.some((entry) => entry.needsEscalation), stale: new Date(last) < staleBefore, deliverable }
      }),
    ]
    return {
      overdue: items.filter((item) => item.date && new Date(item.date) < today),
      today: items.filter((item) => item.date && sameDay(new Date(item.date), today)),
      upcoming: items.filter((item) => item.date && new Date(item.date) > today && new Date(item.date) <= week),
      stale: items.filter((item) => item.stale),
      escalated: items.filter((item) => item.escalated),
    }
  }, [tasks, deliverables])
  const total = new Set(Object.values(groups).flat().map((item) => `${item.kind}:${item.id}`)).size

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="متابعتي اليوم" subtitle="كل ما يحتاج انتباهك في مكان واحد." />
      {total === 0 ? <div className="card"><EmptyState icon={Inbox} title="لا شيء يحتاج متابعتك الآن" hint="ستظهر هنا المواعيد والتصعيدات والعناصر التي لم تُحدّث." /></div> : (
        <div className="space-y-5">
          <FocusSection title="المتأخر" icon={AlertTriangle} color="var(--danger)" items={groups.overdue} onTask={setSelectedTask} onDeliverable={setSelectedDeliverable} />
          <FocusSection title="مطلوب اليوم" icon={CalendarClock} color="var(--brand)" items={groups.today} onTask={setSelectedTask} onDeliverable={setSelectedDeliverable} />
          <FocusSection title="القادم خلال أسبوع" icon={CalendarClock} color="var(--info)" items={groups.upcoming} onTask={setSelectedTask} onDeliverable={setSelectedDeliverable} />
          <FocusSection title="يحتاج تحديثًا" icon={RefreshCw} color="var(--warning)" items={groups.stale} onTask={setSelectedTask} onDeliverable={setSelectedDeliverable} />
          <FocusSection title="التصعيدات" icon={AlertTriangle} color="var(--warning)" items={groups.escalated} onTask={setSelectedTask} onDeliverable={setSelectedDeliverable} />
        </div>
      )}
      <TaskDetailModal task={selectedTask} canUpdate onClose={() => setSelectedTask(null)} />
      <QuickDeliverable item={selectedDeliverable} onClose={() => setSelectedDeliverable(null)} />
    </div>
  )
}

function FocusSection({ title, icon: Icon, color, items, onTask, onDeliverable }: { title: string; icon: typeof Inbox; color: string; items: FocusItem[]; onTask: (task: TaskFull) => void; onDeliverable: (item: DeliverableFull) => void }) {
  if (items.length === 0) return null
  return <section><h2 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color }}><Icon size={16} /> {title}<span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>{items.length}</span></h2><div className="card overflow-hidden divide-y" style={{ borderColor: 'var(--border)' }}>{items.map((item) => item.kind === 'TASK' ? <TaskRow key={`task-${item.id}`} task={item.task} onClick={() => onTask(item.task)} /> : <button key={`deliverable-${item.id}`} className="w-full px-4 py-3 flex items-center gap-3 text-right hover:bg-[var(--surface-2)]" onClick={() => onDeliverable(item.deliverable)}><Milestone size={17} style={{ color: 'var(--gold-dark)' }} /><span className="flex-1"><span className="block text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{item.deliverable.title}</span><span className="text-xs" style={{ color: 'var(--text-3)' }}>{item.deliverable.dueDate ? formatDate(item.deliverable.dueDate) : 'بلا موعد'} · استحقاق</span></span><TaskStatusBadge status={item.deliverable.status} /></button>)}</div></section>
}

function QuickDeliverable({ item, onClose }: { item: DeliverableFull | null; onClose: () => void }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  if (!item) return null
  async function setStatus(status: TaskStatus) { setBusy(true); const result = await apiSend(`/api/deliverables/${item!.id}`, 'PATCH', { status }); setBusy(false); if (!result.success) { alert(result.error); return } router.refresh(); onClose() }
  return <Modal open onClose={onClose} title="الاستحقاق"><div className="space-y-4"><div><h3 className="font-bold" style={{ color: 'var(--text-1)' }}>{item.title}</h3>{item.description && <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>{item.description}</p>}</div>{item.dueDate && <p className="text-sm" style={{ color: 'var(--text-2)' }}>الاستحقاق: {formatDate(item.dueDate)}</p>}<div className="flex gap-1.5 flex-wrap">{(['NEW', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as TaskStatus[]).map((status) => <button key={status} className="badge" disabled={busy} onClick={() => setStatus(status)} style={item.status === status ? { background: 'var(--brand)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--text-2)' }}>{TASK_STATUS_LABELS[status]}</button>)}</div></div></Modal>
}

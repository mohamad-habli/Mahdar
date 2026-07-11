'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Building2, CalendarClock, FileText, Loader2, Milestone, Plus, Send, User } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Field'
import { TaskStatusBadge } from '@/components/badges'
import TaskDetailModal from '@/components/tasks/TaskDetailModal'
import TaskRow from '@/components/tasks/TaskRow'
import { apiSend } from '@/lib/client'
import { formatDate, isOverdue } from '@/lib/utils'
import { TASK_STATUS_LABELS, type TaskStatus } from '@/types'
import type { DeliverableFull } from '@/lib/deliverables'
import type { TaskFull } from '@/lib/tasks'

const OPEN = ['NEW', 'IN_PROGRESS', 'LATE']

export default function DeliverablesClient({ deliverables, councils, departments, members, initialSelectedId }: {
  deliverables: DeliverableFull[]
  councils: { id: string; name: string }[]
  departments: { id: string; name: string; councilId: string }[]
  members: { id: string; name: string }[]
  initialSelectedId: string | null
}) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<DeliverableFull | null>(() => deliverables.find((item) => item.id === initialSelectedId) ?? null)
  const [selectedTask, setSelectedTask] = useState<TaskFull | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    if (!selected) return
    setSelected(deliverables.find((item) => item.id === selected.id) ?? null)
  }, [deliverables])

  const filtered = useMemo(() => deliverables.filter((item) => !statusFilter || item.status === statusFilter), [deliverables, statusFilter])
  const overdueCount = deliverables.filter((item) => OPEN.includes(item.status) && isOverdue(item.dueDate)).length

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title="الاستحقاقات" subtitle="الملفات الكبرى وتكليفاتها الفرعية ومتابعاتها." action={<button className="btn btn-primary" onClick={() => setCreateOpen(true)}><Plus size={17} /> استحقاق جديد</button>} />
      <div className="flex items-end gap-3 mb-4 flex-wrap">
        <div className="w-56"><SelectField label="الحالة" placeholder="كل الحالات" options={Object.entries(TASK_STATUS_LABELS).map(([value, label]) => ({ value, label }))} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} /></div>
        {overdueCount > 0 && <span className="badge mb-2" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}><AlertTriangle size={12} /> {overdueCount} متأخر</span>}
      </div>
      <div className="card overflow-hidden">
        {filtered.length === 0 ? <EmptyState icon={Milestone} title="لا استحقاقات مطابقة" hint="غيّر الفلتر أو أضف استحقاقًا جديدًا." /> : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {filtered.map((item) => <DeliverableRow key={item.id} item={item} onClick={() => setSelected(item)} />)}
          </div>
        )}
      </div>
      <DeliverableDetail item={selected} onClose={() => { setSelected(null); router.replace('/secretary/deliverables') }} onTask={setSelectedTask} />
      <TaskDetailModal task={selectedTask} canUpdate onClose={() => setSelectedTask(null)} />
      <CreateDeliverable open={createOpen} onClose={() => setCreateOpen(false)} councils={councils} departments={departments} members={members} />
    </div>
  )
}

function DeliverableRow({ item, onClick }: { item: DeliverableFull; onClick: () => void }) {
  const overdue = OPEN.includes(item.status) && isOverdue(item.dueDate)
  return (
    <button className="w-full text-right px-4 py-3 flex items-center gap-3 flex-wrap hover:bg-[var(--surface-2)]" onClick={onClick}>
      <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--gold-bg)', color: 'var(--gold-dark)' }}><Milestone size={17} /></span>
      <span className="flex-1 min-w-0">
        <span className="block font-semibold text-sm truncate" style={{ color: 'var(--text-1)' }}>{item.title}</span>
        <span className="text-xs mt-1 flex gap-2 flex-wrap" style={{ color: 'var(--text-3)' }}>
          {item.departmentName && <span className="flex items-center gap-1"><Building2 size={11} /> {item.departmentName}</span>}
          {item.ownerName && <span className="flex items-center gap-1"><User size={11} /> {item.ownerName}</span>}
          {item.dueDate && <span className="flex items-center gap-1" style={overdue ? { color: 'var(--danger)' } : undefined}><CalendarClock size={11} /> {formatDate(item.dueDate)}</span>}
          <span>{item.tasks.length} تكليف</span>
          <span>{item.followUps.length} متابعة</span>
        </span>
      </span>
      {overdue && <span className="badge" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>متأخر</span>}
      <TaskStatusBadge status={item.status} />
    </button>
  )
}

function DeliverableDetail({ item, onClose, onTask }: { item: DeliverableFull | null; onClose: () => void; onTask: (task: TaskFull) => void }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [escalate, setEscalate] = useState(false)
  if (!item) return null

  async function setStatus(status: TaskStatus) {
    setBusy(true)
    const result = await apiSend(`/api/deliverables/${item!.id}`, 'PATCH', { status })
    setBusy(false)
    if (!result.success) { alert(result.error); return }
    router.refresh()
  }
  async function addFollowUp() {
    if (!note.trim()) return
    setBusy(true)
    const result = await apiSend(`/api/deliverables/${item!.id}/follow-ups`, 'POST', { body: note, needsEscalation: escalate })
    setBusy(false)
    if (!result.success) { alert(result.error); return }
    setNote(''); setEscalate(false); router.refresh()
  }

  return (
    <Modal open onClose={onClose} title="تفاصيل الاستحقاق">
      <div className="space-y-5">
        <div><h3 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>{item.title}</h3>{item.description && <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>{item.description}</p>}</div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {item.councilName && <Info icon={FileText} label="المجلس" value={item.councilName} />}
          {item.departmentName && <Info icon={Building2} label="القسم" value={item.departmentName} />}
          {item.ownerName && <Info icon={User} label="المسؤول" value={item.ownerName} />}
          {item.dueDate && <Info icon={CalendarClock} label="الاستحقاق" value={formatDate(item.dueDate)} />}
        </div>
        <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}><p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-2)' }}>الحالة</p><div className="flex gap-1.5 flex-wrap">{(['NEW', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as TaskStatus[]).map((status) => <button key={status} className="badge" disabled={busy} onClick={() => setStatus(status)} style={item.status === status ? { background: 'var(--brand)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--text-2)' }}>{TASK_STATUS_LABELS[status]}</button>)}</div></div>
        <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}><p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-2)' }}>التكليفات الفرعية</p>{item.tasks.length === 0 ? <p className="text-xs" style={{ color: 'var(--text-3)' }}>لا تكليفات فرعية.</p> : <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border)' }}>{item.tasks.map((task) => <TaskRow key={task.id} task={task} onClick={() => onTask(task)} />)}</div>}</div>
        <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-2)' }}>خط المتابعة</p>
          <div className="flex gap-2 mb-2"><input className="input flex-1" value={note} onChange={(event) => setNote(event.target.value)} placeholder="أضف تحديثًا…" /><button className="btn btn-primary px-3" onClick={addFollowUp} disabled={busy}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}</button></div>
          <label className="flex items-center gap-2 text-xs mb-3" style={{ color: 'var(--text-2)' }}><input type="checkbox" checked={escalate} onChange={(event) => setEscalate(event.target.checked)} /> يحتاج تصعيدًا</label>
          <div className="space-y-2">{item.followUps.map((entry) => <div key={entry.id} className="p-3 rounded-lg" style={{ background: entry.needsEscalation ? 'var(--warning-bg)' : 'var(--surface-2)' }}><p className="text-sm" style={{ color: 'var(--text-1)' }}>{entry.body}</p><p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{entry.authorName} · {formatDate(entry.createdAt)}</p></div>)}</div>
        </div>
      </div>
    </Modal>
  )
}

function CreateDeliverable({ open, onClose, councils, departments, members }: { open: boolean; onClose: () => void; councils: { id: string; name: string }[]; departments: { id: string; name: string; councilId: string }[]; members: { id: string; name: string }[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', councilId: '', departmentId: '', ownerId: '', dueDate: '' })
  async function create() {
    setBusy(true)
    const result = await apiSend<{ id: string }>('/api/deliverables', 'POST', form)
    setBusy(false)
    if (!result.success) { alert(result.error); return }
    onClose(); setForm({ title: '', description: '', councilId: '', departmentId: '', ownerId: '', dueDate: '' }); router.refresh()
  }
  return <Modal open={open} onClose={onClose} title="استحقاق جديد" footer={<><button className="btn btn-ghost" onClick={onClose}>إلغاء</button><button className="btn btn-primary" onClick={create} disabled={busy}>{busy && <Loader2 size={15} className="animate-spin" />} حفظ</button></>}><div className="space-y-4"><TextField label="العنوان" required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /><TextAreaField label="الوصف" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /><div className="grid grid-cols-2 gap-3"><SelectField label="المجلس" placeholder="بدون" options={councils.map((item) => ({ value: item.id, label: item.name }))} value={form.councilId} onChange={(event) => setForm({ ...form, councilId: event.target.value, departmentId: '' })} /><SelectField label="القسم" placeholder="بدون" options={departments.filter((item) => !form.councilId || item.councilId === form.councilId).map((item) => ({ value: item.id, label: item.name }))} value={form.departmentId} onChange={(event) => setForm({ ...form, departmentId: event.target.value })} /><SelectField label="المسؤول العام" placeholder="بدون" options={members.map((item) => ({ value: item.id, label: item.name }))} value={form.ownerId} onChange={(event) => setForm({ ...form, ownerId: event.target.value })} /><TextField label="تاريخ الاستحقاق" type="date" dir="ltr" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></div></div></Modal>
}

function Info({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string }) { return <div className="flex items-center gap-1.5" style={{ color: 'var(--text-2)' }}><Icon size={14} style={{ color: 'var(--text-3)' }} /><span className="text-xs" style={{ color: 'var(--text-3)' }}>{label}:</span><span className="truncate">{value}</span></div> }

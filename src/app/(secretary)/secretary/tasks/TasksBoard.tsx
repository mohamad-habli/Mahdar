'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ClipboardList, Loader2, Filter } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { TextField, TextAreaField, SelectField } from '@/components/ui/Field'
import TaskRow from '@/components/tasks/TaskRow'
import TaskDetailModal from '@/components/tasks/TaskDetailModal'
import { apiSend } from '@/lib/client'
import { isOverdue } from '@/lib/utils'
import {
  TASK_STATUS_LABELS, TASK_PRIORITY_LABELS,
  type TaskStatus, type TaskPriority,
} from '@/types'
import type { TaskFull } from '@/lib/tasks'

type Quick = 'ALL' | 'TODAY' | 'OVERDUE' | 'WEEK' | 'DONE'
const OPEN = ['NEW', 'IN_PROGRESS', 'LATE']

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export default function TasksBoard({
  tasks, departments, members,
}: {
  tasks: TaskFull[]
  departments: { id: string; name: string }[]
  members: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [quick, setQuick] = useState<Quick>('ALL')
  const [fStatus, setFStatus] = useState('')
  const [fPriority, setFPriority] = useState('')
  const [fDept, setFDept] = useState('')
  const [fAssignee, setFAssignee] = useState('')
  const [selected, setSelected] = useState<TaskFull | null>(null)

  const filtered = useMemo(() => {
    const now = new Date()
    const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7)
    return tasks.filter((t) => {
      if (fStatus && t.status !== fStatus) return false
      if (fPriority && t.priority !== fPriority) return false
      if (fDept && t.departmentId !== fDept) return false
      if (fAssignee && t.assigneeId !== fAssignee && !t.assignees.some((a) => a.userId === fAssignee)) return false
      const due = t.dueDate ? new Date(t.dueDate) : null
      if (quick === 'TODAY') return due && sameDay(due, now)
      if (quick === 'OVERDUE') return OPEN.includes(t.status) && isOverdue(t.dueDate)
      if (quick === 'WEEK') return OPEN.includes(t.status) && due && due >= new Date(now.toDateString()) && due <= weekEnd
      if (quick === 'DONE') return t.status === 'DONE'
      return true
    })
  }, [tasks, quick, fStatus, fPriority, fDept, fAssignee])

  const counts = useMemo(() => {
    const now = new Date(); const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7)
    return {
      ALL: tasks.length,
      TODAY: tasks.filter((t) => t.dueDate && sameDay(new Date(t.dueDate), now)).length,
      OVERDUE: tasks.filter((t) => OPEN.includes(t.status) && isOverdue(t.dueDate)).length,
      WEEK: tasks.filter((t) => OPEN.includes(t.status) && t.dueDate && new Date(t.dueDate) >= new Date(now.toDateString()) && new Date(t.dueDate) <= weekEnd).length,
      DONE: tasks.filter((t) => t.status === 'DONE').length,
    }
  }, [tasks])

  // إنشاء تكليف
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ title: '', description: '', departmentId: '', assigneeIds: [] as string[], primaryAssigneeId: '', dueDate: '', priority: 'MEDIUM' })
  async function create() {
    setSaving(true); setError('')
    const res = await apiSend('/api/tasks', 'POST', form)
    setSaving(false)
    if (!res.success) { setError(res.error ?? 'تعذّر الحفظ'); return }
    setOpen(false)
    setForm({ title: '', description: '', departmentId: '', assigneeIds: [], primaryAssigneeId: '', dueDate: '', priority: 'MEDIUM' })
    router.refresh()
  }

  const QUICK_LABELS: Record<Quick, string> = { ALL: 'الكل', TODAY: 'اليوم', OVERDUE: 'متأخر', WEEK: 'خلال أسبوع', DONE: 'مكتمل' }

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title="التكليفات" subtitle="متابعة كل التكليفات وتصفيتها."
        action={<button className="btn btn-primary" onClick={() => { setError(''); setOpen(true) }}><Plus size={18} /> تكليف جديد</button>} />

      {/* عروض سريعة */}
      <div className="flex gap-2 flex-wrap mb-4">
        {(Object.keys(QUICK_LABELS) as Quick[]).map((q) => (
          <button key={q} onClick={() => setQuick(q)} className="badge transition-colors"
            style={quick === q ? { background: 'var(--brand)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'pointer' }}>
            {QUICK_LABELS[q]} <span className="opacity-70">({counts[q]})</span>
          </button>
        ))}
      </div>

      {/* فلاتر */}
      <div className="card p-3 mb-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
        <SelectField label="الحالة" placeholder="كل الحالات" options={Object.entries(TASK_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          value={fStatus} onChange={(e) => setFStatus(e.target.value)} />
        <SelectField label="الأولوية" placeholder="كل الأولويات" options={Object.entries(TASK_PRIORITY_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          value={fPriority} onChange={(e) => setFPriority(e.target.value)} />
        <SelectField label="القسم" placeholder="كل الأقسام" options={departments.map((d) => ({ value: d.id, label: d.name }))}
          value={fDept} onChange={(e) => setFDept(e.target.value)} />
        <SelectField label="المسؤول" placeholder="الكل" options={members.map((m) => ({ value: m.id, label: m.name }))}
          value={fAssignee} onChange={(e) => setFAssignee(e.target.value)} />
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-2.5 border-b flex items-center gap-2 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}>
          <Filter size={14} /> {filtered.length} تكليف
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={ClipboardList} title="لا تكليفات مطابقة" hint="غيّر الفلاتر أو أنشئ تكليفًا جديدًا." />
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {filtered.map((t) => <TaskRow key={t.id} task={t} onClick={() => setSelected(t)} />)}
          </div>
        )}
      </div>

      <TaskDetailModal task={selected} canUpdate onClose={() => setSelected(null)} />

      <Modal open={open} onClose={() => setOpen(false)} title="تكليف جديد"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setOpen(false)} disabled={saving}>إلغاء</button>
          <button className="btn btn-primary" onClick={create} disabled={saving}>{saving && <Loader2 size={16} className="animate-spin" />} حفظ</button>
        </>}>
        <div className="space-y-4">
          <TextField label="العنوان" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: إعداد التقرير الشهري" />
          <TextAreaField label="الوصف" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="القسم" placeholder="بدون" options={departments.map((d) => ({ value: d.id, label: d.name }))}
              value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} />
            <TextField label="الاستحقاق" type="date" dir="ltr" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            <SelectField label="الأولوية" options={Object.entries(TASK_PRIORITY_LABELS).map(([v, l]) => ({ value: v, label: l }))}
              value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
            {form.assigneeIds.length > 1 && (
              <SelectField label="المسؤول الرئيسي" options={members.filter((m) => form.assigneeIds.includes(m.id)).map((m) => ({ value: m.id, label: m.name }))}
                value={form.primaryAssigneeId || form.assigneeIds[0] || ''} onChange={(e) => setForm({ ...form, primaryAssigneeId: e.target.value })} />
            )}
          </div>
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="block text-sm font-semibold" style={{ color: 'var(--text-2)' }}>المكلفون</label>
              <button type="button" className="text-xs font-semibold" style={{ color: 'var(--brand)' }}
                onClick={() => setForm({ ...form, assigneeIds: members.map((m) => m.id), primaryAssigneeId: form.primaryAssigneeId || members[0]?.id || '' })}>
                تحديد الجميع
              </button>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {members.map((m) => {
                const active = form.assigneeIds.includes(m.id)
                return (
                  <button key={m.id} type="button" className="badge"
                    onClick={() => {
                      const next = active ? form.assigneeIds.filter((id) => id !== m.id) : [...form.assigneeIds, m.id]
                      setForm({ ...form, assigneeIds: next, primaryAssigneeId: next.includes(form.primaryAssigneeId) ? form.primaryAssigneeId : next[0] ?? '' })
                    }}
                    style={active ? { background: 'var(--brand)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--text-2)' }}>
                    {m.name}
                  </button>
                )
              })}
            </div>
          </div>
          {error && <div className="text-sm rounded-lg px-3 py-2" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</div>}
        </div>
      </Modal>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2, User, CalendarClock, FileText, Wallet, MessageSquarePlus,
  Loader2, Send, FolderKanban, BellRing,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { TaskStatusBadge, PriorityBadge } from '@/components/badges'
import { apiSend } from '@/lib/client'
import { formatDate, formatMoney } from '@/lib/utils'
import {
  TASK_STATUS_LABELS, PAYMENT_STATUS_LABELS,
  type TaskStatus, type PaymentStatus,
} from '@/types'
import type { TaskFull } from '@/lib/tasks'

// الحالات التي يمكن للمستخدم اختيارها (LATE محسوبة تلقائيًا)
const SELECTABLE: TaskStatus[] = ['NEW', 'IN_PROGRESS', 'DONE', 'CANCELLED']

export default function TaskDetailModal({
  task, canUpdate, onClose,
}: {
  task: TaskFull | null
  canUpdate: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  if (!task) return null

  async function setStatus(status: TaskStatus) {
    setBusy(true)
    const res = await apiSend(`/api/tasks/${task!.id}`, 'PATCH', { status })
    setBusy(false)
    if (!res.success) { alert(res.error); return }
    router.refresh()
  }

  async function addNote() {
    if (!note.trim()) return
    setBusy(true)
    const res = await apiSend(`/api/tasks/${task!.id}/notes`, 'POST', { body: note })
    setBusy(false)
    if (!res.success) { alert(res.error); return }
    setNote('')
    router.refresh()
  }

  async function remind(offsetType: 'NOW' | 'DAY_BEFORE' | 'HOURS_BEFORE' | 'REPEAT_UNTIL_CLOSED') {
    setBusy(true)
    const res = await apiSend(`/api/tasks/${task!.id}/reminders`, 'POST', { offsetType, hoursBefore: offsetType === 'HOURS_BEFORE' ? 3 : undefined })
    setBusy(false)
    if (!res.success) { alert(res.error); return }
    router.refresh()
  }

  return (
    <Modal open={!!task} onClose={onClose} title="تفاصيل التكليف">
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-bold text-lg" style={{ color: 'var(--text-1)' }}>{task.title}</h3>
            <PriorityBadge priority={task.priority} />
            <TaskStatusBadge status={task.status} />
          </div>
          {task.description && <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-2)' }}>{task.description}</p>}
        </div>

        {/* بيانات */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {task.departmentName && <Info icon={Building2} label="القسم" value={task.departmentName} />}
          {task.projectName && <Info icon={FolderKanban} label="المشروع" value={task.projectName} />}
          {(task.assignees.length > 0 || task.assigneeName) && <Info icon={User} label="المكلفون" value={task.assignees.map((a) => `${a.name}${a.isPrimary ? ' (رئيسي)' : ''}`).join('، ') || task.assigneeName || ''} />}
          {task.dueDate && <Info icon={CalendarClock} label="الاستحقاق" value={formatDate(task.dueDate)} />}
          {task.sourceMeetingTitle && <Info icon={FileText} label="من اجتماع" value={task.sourceMeetingTitle} />}
        </div>

        {/* التكاليف المرتبطة */}
        {task.costs.length > 0 && (
          <div className="rounded-lg p-3" style={{ background: 'var(--surface-2)' }}>
            <div className="flex items-center gap-1.5 mb-2 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
              <Wallet size={15} /> التكاليف المرتبطة
            </div>
            {task.costs.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-xs py-1" style={{ color: 'var(--text-2)' }}>
                <span>{c.description}</span>
                <span className="flex items-center gap-2">
                  <span dir="ltr">{formatMoney(c.actualAmount ?? c.expectedAmount, c.currency)}</span>
                  <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>{PAYMENT_STATUS_LABELS[c.paymentStatus as PaymentStatus]}</span>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* تحديث الحالة */}
        {canUpdate && (
          <div className="pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-2)' }}>تحديث الحالة</p>
            <div className="flex gap-1.5 flex-wrap">
              {SELECTABLE.map((s) => (
                <button key={s} onClick={() => setStatus(s)} disabled={busy} className="badge transition-colors"
                  style={task.status === s ? { background: 'var(--brand)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'pointer' }}>
                  {TASK_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        )}

        {canUpdate && (
          <div className="pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-2)' }}>
              <BellRing size={15} /> تذكير
            </p>
            <div className="flex gap-1.5 flex-wrap">
              <button className="badge" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }} onClick={() => remind('NOW')} disabled={busy}>الآن</button>
              <button className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }} onClick={() => remind('DAY_BEFORE')} disabled={busy}>قبل يوم</button>
              <button className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }} onClick={() => remind('HOURS_BEFORE')} disabled={busy}>قبل 3 ساعات</button>
              <button className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }} onClick={() => remind('REPEAT_UNTIL_CLOSED')} disabled={busy}>متكرر حتى الإغلاق</button>
            </div>
          </div>
        )}

        {/* الملاحظات */}
        <div className="pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-2)' }}>
            <MessageSquarePlus size={15} /> ملاحظات المتابعة
          </p>
          {canUpdate && (
            <div className="flex gap-2 mb-3">
              <input className="input flex-1" value={note} onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNote() } }}
                placeholder="أضِف ملاحظة متابعة…" />
              <button className="btn btn-primary px-3" onClick={addNote} disabled={busy}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          )}
          {task.followUps.length === 0 && task.notes.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>لا ملاحظات بعد.</p>
          ) : (
            <ul className="space-y-2">
              {task.followUps.map((n) => (
                <li key={`f-${n.id}`} className="px-3 py-2 rounded-lg text-sm" style={{ background: n.needsEscalation ? 'var(--warning-bg)' : 'var(--surface-2)' }}>
                  <p style={{ color: 'var(--text-1)' }}>{n.body}</p>
                  <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>{n.authorName} · {formatDate(n.createdAt)} · {n.type}</p>
                </li>
              ))}
              {task.notes.map((n) => (
                <li key={n.id} className="px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--surface-2)' }}>
                  <p style={{ color: 'var(--text-1)' }}>{n.body}</p>
                  <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>{n.authorName} · {formatDate(n.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}

function Info({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5" style={{ color: 'var(--text-2)' }}>
      <Icon size={14} style={{ color: 'var(--text-3)' }} />
      <span className="text-xs" style={{ color: 'var(--text-3)' }}>{label}:</span>
      <span className="truncate">{value}</span>
    </div>
  )
}

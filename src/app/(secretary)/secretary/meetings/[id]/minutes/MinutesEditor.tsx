'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight, FileText, Plus, Trash2, Loader2, Send, Lock,
  Undo2, FilePlus2,
  History, RotateCcw, CheckCircle2, AlertCircle,
} from 'lucide-react'
import { TextField, TextAreaField, SelectField } from '@/components/ui/Field'
import MinuteItemCard, { type MinuteItemData } from '@/components/MinuteItemCard'
import { MinutesStatusBadge } from '@/components/badges'
import { apiSend } from '@/lib/client'
import { formatDate } from '@/lib/utils'
import { MINUTE_ITEM_LABELS, type MinuteItemType } from '@/types'
import type { FullMinutes, MeetingContext } from '@/lib/minutes'
import type { MinutesWorkflowChecks } from '@/lib/minutes-workflow'
import MeetingWorkflowSteps from '@/components/meetings/MeetingWorkflowSteps'

interface Dept { id: string; name: string; projects: { id: string; name: string }[] }
interface Member { id: string; name: string }
interface AgendaSeed { id: string; order: number; title: string; notes: string | null; used: boolean }

const ITEM_TYPES: MinuteItemType[] = ['DISCUSSION', 'DECISION', 'TASK', 'DELIVERABLE', 'FOLLOWUP', 'COST', 'NOTE', 'VOTE']

export default function MinutesEditor({
  meeting, minutes, departments, members, agendaItems, workflowChecks,
}: {
  meeting: MeetingContext
  minutes: FullMinutes | null
  departments: Dept[]
  members: Member[]
  agendaItems: AgendaSeed[]
  workflowChecks: MinutesWorkflowChecks | null
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  // ===== لا يوجد محضر بعد =====
  async function startMinutes() {
    setBusy(true)
    await apiSend(`/api/meetings/${meeting.id}/minutes`, 'POST')
    setBusy(false)
    router.refresh()
  }

  const back = (
    <Link href={`/secretary/meetings/${meeting.id}`} className="inline-flex items-center gap-1.5 text-sm mb-4" style={{ color: 'var(--text-2)' }}>
      <ArrowRight size={16} /> {meeting.title}
    </Link>
  )

  if (!minutes) {
    return (
      <div className="max-w-3xl mx-auto">
        {back}
        <div className="card p-10 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
            <FileText size={26} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-1)' }}>محضر {meeting.title}</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>
            ابدأ بكتابة المحضر: أضِف بنود النقاش والقرارات، وحوّلها مباشرةً إلى تكليفات وتكاليف.
          </p>
          <button className="btn btn-primary mx-auto" onClick={startMinutes} disabled={busy}>
            {busy ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />} ابدأ كتابة المحضر
          </button>
        </div>
      </div>
    )
  }

  const editable = minutes.status === 'DRAFT'
  const carriedItems = minutes.items.filter((item) => item.carriedFrom)
  const currentItems = minutes.items.filter((item) => !item.carriedFrom)
  const blockingMessages = workflowChecks ? [
    ...(!workflowChecks.meetingHeld ? ['حدد حالة الجلسة «منعقد»'] : []),
    ...(!workflowChecks.attendanceSaved ? ['احفظ الحضور والغياب'] : []),
    ...(!workflowChecks.hasAgenda ? ['أضف نقاط جدول الأعمال'] : !workflowChecks.agendaResolved ? [`عالج ${workflowChecks.pendingAgendaCount} من نقاط جدول الأعمال`] : []),
    ...(!workflowChecks.previousItemsSettled ? [`سدّد ${workflowChecks.pendingPreviousCount} من بنود المحضر السابق`] : []),
    ...(!workflowChecks.hasMinuteItems ? ['أضف بندًا واحدًا على الأقل للمحضر'] : []),
  ] : []

  // ===== الإجراءات =====
  async function act(action: 'submit' | 'return' | 'lock') {
    setBusy(true)
    const res = await apiSend(`/api/minutes/${minutes!.id}`, 'PATCH', { action })
    setBusy(false)
    if (!res.success) { alert(res.error); return }
    router.refresh()
  }

  return (
    <div className="max-w-3xl mx-auto">
      {back}

      <MeetingWorkflowSteps state={{
        meetingHeld: meeting.status === 'HELD',
        attendanceSaved: workflowChecks?.attendanceSaved ?? false,
        agendaReady: workflowChecks?.agendaResolved ?? false,
        previousSettled: workflowChecks?.previousItemsSettled ?? false,
        minutesWritten: workflowChecks?.hasMinuteItems ?? false,
        reviewStarted: ['IN_REVIEW', 'APPROVED', 'LOCKED'].includes(minutes.status),
        locked: minutes.status === 'LOCKED',
      }} />

      {/* رأس المحضر */}
      <div className="card p-5 mb-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MinutesTitle minutesId={minutes.id} initial={minutes.title ?? `محضر ${meeting.title}`} editable={editable} />
              <MinutesStatusBadge status={minutes.status} />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>
              {meeting.title} · {meeting.councilName} · {formatDate(meeting.meetingDate)}
            </p>
            {minutes.approvedByName && (
              <p className="text-xs mt-1" style={{ color: 'var(--success)' }}>
                اعتمده {minutes.approvedByName}{minutes.approvedAt ? ` · ${formatDate(minutes.approvedAt)}` : ''}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {minutes.status === 'DRAFT' && (
              <button className="btn btn-primary" onClick={() => act('submit')} disabled={busy || blockingMessages.length > 0}>
                <Send size={16} /> إرسال للمراجعة
              </button>
            )}
            {minutes.status === 'IN_REVIEW' && (
              <button className="btn btn-ghost" onClick={() => act('return')} disabled={busy}>
                <Undo2 size={16} /> استرجاع إلى مسودة
              </button>
            )}
            {minutes.status === 'APPROVED' && (
              <button className="btn btn-gold" onClick={() => act('lock')} disabled={busy}>
                <Lock size={16} /> إقفال المحضر
              </button>
            )}
          </div>
        </div>

        {minutes.status === 'IN_REVIEW' && (
          <div className="mt-3 text-sm rounded-lg px-3 py-2" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
            المحضر بانتظار اعتماد رئيس المجلس. لا يمكن تعديله حتى يُعتمد أو يُعاد إلى مسودة.
          </div>
        )}
        {minutes.status === 'DRAFT' && blockingMessages.length > 0 && (
          <div className="mt-3 rounded-lg px-3 py-2" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
            <p className="text-sm font-semibold flex items-center gap-1.5"><AlertCircle size={15} /> قبل الإرسال للمراجعة</p>
            <ul className="mt-1 text-xs space-y-1">
              {blockingMessages.map((message) => <li key={message}>• {message}</li>)}
            </ul>
          </div>
        )}
        {minutes.status === 'LOCKED' && (
          <div className="mt-3 text-sm rounded-lg px-3 py-2 flex items-center gap-2" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
            <Lock size={15} /> المحضر مقفل ومعتمد. لا يمكن تعديله إلا بإضافة ملحق رسمي.
          </div>
        )}
      </div>

      {/* الملخص */}
      <SummaryBox minutesId={minutes.id} initial={minutes.summary} editable={editable} />

      {editable && <VersionsBox minutesId={minutes.id} versions={minutes.versions} />}

      {carriedItems.length > 0 && (
        <CarriedItemsBox items={carriedItems} editable={editable} members={members} onDone={() => router.refresh()} />
      )}

      {editable && <AgendaToMinutesBox minutesId={minutes.id} agendaItems={agendaItems} members={members} onAdded={() => router.refresh()} />}

      {/* البنود */}
      <div className="card p-5 mb-5">
        <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
          <FileText size={18} style={{ color: 'var(--brand)' }} /> بنود المحضر
          <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>{currentItems.length}</span>
        </h3>

        {currentItems.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: 'var(--text-3)' }}>لا بنود بعد. أضِف أول بند أدناه.</p>
        ) : (
          <ol className="space-y-4">
            {currentItems.map((it) => (
              <li key={it.id} className="relative">
                <MinuteItemCard item={it} />
                {editable && (
                  <>
                    <button
                      onClick={async () => { await apiSend(`/api/minute-items/${it.id}`, 'DELETE'); router.refresh() }}
                      className="absolute top-0 left-0 w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }}
                      title="حذف البند"
                    >
                      <Trash2 size={14} />
                    </button>
                    <MinuteItemOutcomeActions item={it} members={members} onDone={() => router.refresh()} />
                  </>
                )}
              </li>
            ))}
          </ol>
        )}

        {editable && <ItemComposer minutesId={minutes.id} departments={departments} members={members} onAdded={() => router.refresh()} />}
      </div>

      {/* الملاحق */}
      {(minutes.addenda.length > 0 || minutes.status === 'LOCKED') && (
        <AddendaBox minutesId={minutes.id} addenda={minutes.addenda} canAdd={minutes.status === 'LOCKED'} />
      )}
    </div>
  )
}

/* ====== الملخص ====== */
function MinutesTitle({ minutesId, initial, editable }: { minutesId: string; initial: string; editable: boolean }) {
  const [value, setValue] = useState(initial)
  const [saving, setSaving] = useState(false)
  const lastSaved = useRef(initial)

  useEffect(() => {
    if (!editable || value.trim().length < 2 || value === lastSaved.current) return
    setSaving(true)
    const timer = setTimeout(async () => {
      const result = await apiSend(`/api/minutes/${minutesId}`, 'PATCH', { title: value })
      if (result.success) lastSaved.current = value
      setSaving(false)
    }, 700)
    return () => clearTimeout(timer)
  }, [editable, minutesId, value])

  if (!editable) return <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>{value}</h1>
  return (
    <div className="flex items-center gap-2">
      <input
        className="input font-bold text-lg py-1.5"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label="عنوان المحضر"
      />
      {saving && <Loader2 size={14} className="animate-spin shrink-0" style={{ color: 'var(--text-3)' }} />}
    </div>
  )
}

function SummaryBox({ minutesId, initial, editable }: { minutesId: string; initial: string | null; editable: boolean }) {
  const [value, setValue] = useState(initial ?? '')
  const [status, setStatus] = useState<'IDLE' | 'SAVING' | 'SAVED' | 'ERROR'>('IDLE')
  const lastSaved = useRef(initial ?? '')

  useEffect(() => {
    if (!editable || value === lastSaved.current) return
    setStatus('SAVING')
    const timer = setTimeout(async () => {
      const result = await apiSend(`/api/minutes/${minutesId}`, 'PATCH', { summary: value })
      if (result.success) {
        lastSaved.current = value
        setStatus('SAVED')
      } else {
        setStatus('ERROR')
      }
    }, 900)
    return () => clearTimeout(timer)
  }, [editable, minutesId, value])

  if (!editable && !value) return null
  return (
    <div className="card p-5 mb-5">
      <h3 className="font-bold mb-3" style={{ color: 'var(--text-1)' }}>ملخص المحضر</h3>
      {editable ? (
        <textarea
          className="input min-h-20 resize-y"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="ملخص موجز لأهم ما دار في الاجتماع…"
        />
      ) : (
        <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-2)' }}>{value}</p>
      )}
      {editable && (
        <p className="text-xs mt-1 flex items-center gap-1" style={{ color: status === 'ERROR' ? 'var(--danger)' : status === 'SAVED' ? 'var(--success)' : 'var(--text-3)' }}>
          {status === 'SAVING' && <><Loader2 size={12} className="animate-spin" /> جارٍ الحفظ…</>}
          {status === 'SAVED' && <><CheckCircle2 size={12} /> تم الحفظ تلقائيًا</>}
          {status === 'ERROR' && <><AlertCircle size={12} /> تعذر الحفظ</>}
          {status === 'IDLE' && 'محفوظ'}
        </p>
      )}
    </div>
  )
}

function VersionsBox({ minutesId, versions }: { minutesId: string; versions: FullMinutes['versions'] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busyId, setBusyId] = useState('')
  const labels: Record<string, string> = {
    AUTO_SAVE: 'حفظ تلقائي', ITEM_CREATED: 'إضافة بند', ITEM_UPDATED: 'تحديث بند',
    ITEM_SETTLED: 'تسديد بند', BEFORE_ITEM_DELETE: 'قبل حذف بند', BEFORE_RESTORE: 'قبل الاسترجاع',
    SUBMITTED: 'إرسال للمراجعة',
  }

  async function restore(versionId: string) {
    if (!confirm('استرجاع هذه النسخة؟ لن تُحذف التكليفات أو الاستحقاقات الحالية.')) return
    setBusyId(versionId)
    const result = await apiSend(`/api/minutes/${minutesId}/versions/${versionId}/restore`, 'POST')
    setBusyId('')
    if (!result.success) { alert(result.error); return }
    router.refresh()
  }

  return (
    <div className="card mb-5 overflow-hidden">
      <button className="w-full px-5 py-4 flex items-center gap-2 text-right" onClick={() => setOpen(!open)}>
        <History size={17} style={{ color: 'var(--brand)' }} />
        <span className="font-bold flex-1" style={{ color: 'var(--text-1)' }}>سجل النسخ</span>
        <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>{versions.length}</span>
      </button>
      {open && (
        <div className="border-t divide-y" style={{ borderColor: 'var(--border)' }}>
          {versions.length === 0 ? (
            <p className="text-sm text-center py-5" style={{ color: 'var(--text-3)' }}>تظهر النسخ بعد أول تعديل.</p>
          ) : versions.map((version) => (
            <div key={version.id} className="px-5 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{labels[version.reason] ?? 'نسخة محفوظة'}</p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>{version.authorName} · {formatDate(version.createdAt)}</p>
              </div>
              <button className="btn btn-ghost px-3" onClick={() => restore(version.id)} disabled={!!busyId} title="استرجاع النسخة">
                {busyId === version.id ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
                استرجاع
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CarriedItemsBox({ items, editable, members, onDone }: {
  items: MinuteItemData[]
  editable: boolean
  members: Member[]
  onDone: () => void
}) {
  const settled = items.filter((item) => ['CONVERTED_TO_TASK', 'CONVERTED_TO_DELIVERABLE', 'NOTE_ONLY', 'CLOSED'].includes(item.outcome)).length
  return (
    <div className="card p-5 mb-5" style={{ borderColor: settled === items.length ? 'var(--success)' : 'var(--gold)' }}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
            <History size={18} style={{ color: 'var(--gold-dark)' }} /> تسديد المحضر السابق
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>حدّد مصير كل بند قبل الانتقال إلى مراجعة المحضر.</p>
        </div>
        <span className="badge" style={{ background: settled === items.length ? 'var(--success-bg)' : 'var(--gold-bg)', color: settled === items.length ? 'var(--success)' : 'var(--gold-dark)' }}>
          {settled}/{items.length}
        </span>
      </div>
      <ol className="space-y-4">
        {items.map((item) => (
          <li key={item.id}>
            <MinuteItemCard item={item} />
            {editable && <MinuteItemOutcomeActions item={item} members={members} onDone={onDone} />}
          </li>
        ))}
      </ol>
    </div>
  )
}

/* ====== الملاحق الرسمية ====== */
function AddendaBox({ minutesId, addenda, canAdd }: { minutesId: string; addenda: FullMinutes['addenda']; canAdd: boolean }) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  async function add() {
    if (!text.trim()) return
    setBusy(true)
    const res = await apiSend(`/api/minutes/${minutesId}/addendum`, 'POST', { content: text })
    setBusy(false)
    if (!res.success) { alert(res.error); return }
    setText('')
    router.refresh()
  }
  return (
    <div className="card p-5 mb-5">
      <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
        <FilePlus2 size={18} style={{ color: 'var(--gold-dark)' }} /> الملاحق الرسمية
      </h3>
      {addenda.length > 0 && (
        <ul className="space-y-2 mb-4">
          {addenda.map((a) => (
            <li key={a.id} className="px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--gold-bg)' }}>
              <p className="whitespace-pre-wrap" style={{ color: 'var(--text-1)' }}>{a.content}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{a.authorName} · {formatDate(a.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
      {canAdd && (
        <div className="flex gap-2">
          <textarea className="input min-h-16 resize-y flex-1" value={text} onChange={(e) => setText(e.target.value)} placeholder="نص الملحق الرسمي…" />
          <button className="btn btn-gold self-start" onClick={add} disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} إضافة
          </button>
        </div>
      )}
    </div>
  )
}

function AgendaToMinutesBox({ minutesId, agendaItems, members, onAdded }: {
  minutesId: string
  agendaItems: AgendaSeed[]
  members: Member[]
  onAdded: () => void
}) {
  const [busyId, setBusyId] = useState('')
  const pending = agendaItems.filter((a) => !a.used)

  async function addAgendaItem(agenda: AgendaSeed, type: MinuteItemType | 'SKIPPED') {
    setBusyId(`${agenda.id}-${type}`)
    const content = agenda.notes?.trim() || agenda.title
    const payload: Record<string, unknown> = {
      sourceAgendaItemId: agenda.id,
      title: agenda.title,
      content: type === 'SKIPPED' ? `لم تُناقش: ${content}` : content,
      type: type === 'SKIPPED' ? 'FOLLOWUP' : type,
    }
    if (type === 'TASK') {
      payload.task = {
        assigneeIds: members[0] ? [members[0].id] : [],
        primaryAssigneeId: members[0]?.id ?? null,
        priority: 'MEDIUM',
        description: content,
      }
    }
    if (type === 'DELIVERABLE') {
      payload.deliverable = {
        ownerId: members[0]?.id ?? null,
        description: content,
      }
    }
    const res = await apiSend(`/api/minutes/${minutesId}/items`, 'POST', payload)
    if (res.success && type === 'SKIPPED') {
      // يبقى كبند متابعة مفتوحة حتى يظهر في الجلسة القادمة إذا لم يُسدد.
    }
    setBusyId('')
    if (!res.success) { alert(res.error); return }
    onAdded()
  }

  if (agendaItems.length === 0) return null

  return (
    <div className="card p-5 mb-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-bold flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
          <FileText size={18} style={{ color: 'var(--brand)' }} /> نقاط جدول الأعمال
        </h3>
        <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>{pending.length}/{agendaItems.length}</span>
      </div>
      {pending.length === 0 ? (
        <p className="text-sm text-center py-4" style={{ color: 'var(--text-3)' }}>تم تحويل كل نقاط جدول الأعمال إلى بنود محضر.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((a) => (
            <div key={a.id} className="rounded-lg p-3" style={{ background: 'var(--surface-2)' }}>
              <div className="flex items-start gap-2 mb-2">
                <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'var(--gold-bg)', color: 'var(--gold-dark)' }}>{a.order}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{a.title}</p>
                  {a.notes && <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{a.notes}</p>}
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <button className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }} disabled={!!busyId} onClick={() => addAgendaItem(a, 'DISCUSSION')}>إضافة كنقاش</button>
                <button className="badge" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }} disabled={!!busyId} onClick={() => addAgendaItem(a, 'DECISION')}>إضافة كقرار</button>
                <button className="badge" style={{ background: 'var(--gold-bg)', color: 'var(--gold-dark)' }} disabled={!!busyId} onClick={() => addAgendaItem(a, 'FOLLOWUP')}>إضافة كمتابعة</button>
                <button className="badge" style={{ background: 'var(--info-bg)', color: 'var(--info)' }} disabled={!!busyId} onClick={() => addAgendaItem(a, 'TASK')}>تحويل لتكليف</button>
                <button className="badge" style={{ background: 'var(--gold-bg)', color: 'var(--gold-dark)' }} disabled={!!busyId} onClick={() => addAgendaItem(a, 'DELIVERABLE')}>تحويل لاستحقاق</button>
                <button className="badge" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }} disabled={!!busyId} onClick={() => addAgendaItem(a, 'SKIPPED')}>لم تُناقش</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AssigneePicker({
  members, selected, primaryId, onChange,
}: {
  members: Member[]
  selected: string[]
  primaryId: string
  onChange: (selected: string[], primaryId: string) => void
}) {
  function toggle(id: string) {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]
    onChange(next, next.includes(primaryId) ? primaryId : next[0] ?? '')
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <label className="block text-sm font-semibold" style={{ color: 'var(--text-2)' }}>المكلفون</label>
        <button
          type="button"
          className="text-xs font-semibold"
          style={{ color: 'var(--brand)' }}
          onClick={() => onChange(members.map((m) => m.id), primaryId || members[0]?.id || '')}
        >
          تحديد الجميع
        </button>
      </div>
      <div className="flex gap-1.5 flex-wrap mb-2">
        {members.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => toggle(m.id)}
            className="badge transition-colors"
            style={selected.includes(m.id) ? { background: 'var(--brand)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'pointer' }}
          >
            {m.name}
          </button>
        ))}
      </div>
      {selected.length > 1 && (
        <SelectField
          label="المسؤول الرئيسي"
          options={members.filter((m) => selected.includes(m.id)).map((m) => ({ value: m.id, label: m.name }))}
          value={primaryId || selected[0] || ''}
          onChange={(e) => onChange(selected, e.target.value)}
        />
      )}
    </div>
  )
}

function MinuteItemOutcomeActions({ item, members, onDone }: { item: MinuteItemData; members: Member[]; onDone: () => void }) {
  const [mode, setMode] = useState<'TASK' | 'DELIVERABLE' | null>(null)
  const [busy, setBusy] = useState(false)
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [primaryAssigneeId, setPrimaryAssigneeId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [ownerId, setOwnerId] = useState('')

  async function simple(action: 'OPEN' | 'NOTE_ONLY' | 'CLOSE') {
    setBusy(true)
    const res = await apiSend(`/api/minute-items/${item.id}`, 'PATCH', { action })
    setBusy(false)
    if (!res.success) { alert(res.error); return }
    onDone()
  }

  async function convert() {
    setBusy(true)
    const res = await apiSend(`/api/minute-items/${item.id}`, 'PATCH', mode === 'TASK'
      ? { action: 'TO_TASK', task: { assigneeIds, primaryAssigneeId: primaryAssigneeId || assigneeIds[0] || null, dueDate: dueDate || null, title: item.title || item.content.slice(0, 80), description: item.content } }
      : { action: 'TO_DELIVERABLE', deliverable: { ownerId: ownerId || null, dueDate: dueDate || null, title: item.title || item.content.slice(0, 80), description: item.content } })
    setBusy(false)
    if (!res.success) { alert(res.error); return }
    setMode(null)
    onDone()
  }

  return (
    <div className="mt-3 mr-12 rounded-lg p-3" style={{ background: 'var(--surface-2)' }}>
      <div className="flex gap-1.5 flex-wrap">
        <button className="badge" style={{ background: 'var(--info-bg)', color: 'var(--info)' }} onClick={() => setMode('TASK')} disabled={busy}>تحويل لتكليف</button>
        <button className="badge" style={{ background: 'var(--gold-bg)', color: 'var(--gold-dark)' }} onClick={() => setMode('DELIVERABLE')} disabled={busy}>تحويل لاستحقاق</button>
        <button className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }} onClick={() => simple('OPEN')} disabled={busy}>متابعة مفتوحة</button>
        <button className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }} onClick={() => simple('NOTE_ONLY')} disabled={busy}>ملاحظة فقط</button>
        <button className="badge" style={{ background: 'var(--success-bg)', color: 'var(--success)' }} onClick={() => simple('CLOSE')} disabled={busy}>إغلاق</button>
      </div>

      {mode && (
        <div className="mt-3 space-y-3">
          {mode === 'TASK' ? (
            <AssigneePicker members={members} selected={assigneeIds} primaryId={primaryAssigneeId} onChange={(ids, primary) => { setAssigneeIds(ids); setPrimaryAssigneeId(primary) }} />
          ) : (
            <SelectField label="المسؤول العام" placeholder="بدون" options={members.map((m) => ({ value: m.id, label: m.name }))} value={ownerId} onChange={(e) => setOwnerId(e.target.value)} />
          )}
          <div className="flex gap-2 items-end">
            <TextField label="الموعد" type="date" dir="ltr" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <button className="btn btn-primary" onClick={convert} disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />} حفظ التحويل</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ====== مُنشئ البند ====== */
function ItemComposer({ minutesId, departments, members, onAdded }: {
  minutesId: string; departments: Dept[]; members: Member[]; onAdded: () => void
}) {
  const [type, setType] = useState<MinuteItemType>('DISCUSSION')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [f, setF] = useState({
    title: '', content: '', departmentId: '', projectId: '',
    voteResult: 'APPROVED', votesFor: '', votesAgainst: '', votesAbstain: '',
    assigneeId: '', assigneeIds: [] as string[], primaryAssigneeId: '', dueDate: '', priority: 'MEDIUM',
    deliverableOwnerId: '', deliverableDueDate: '',
    expectedAmount: '', actualAmount: '', currency: 'USD', responsibleId: '', paymentStatus: 'UNPAID',
  })

  const projects = departments.find((d) => d.id === f.departmentId)?.projects ?? []
  const needsTitle = type === 'TASK' || type === 'DELIVERABLE' || type === 'COST'

  function reset() {
    setF({ title: '', content: '', departmentId: '', projectId: '', voteResult: 'APPROVED', votesFor: '', votesAgainst: '', votesAbstain: '', assigneeId: '', assigneeIds: [], primaryAssigneeId: '', dueDate: '', priority: 'MEDIUM', deliverableOwnerId: '', deliverableDueDate: '', expectedAmount: '', actualAmount: '', currency: 'USD', responsibleId: '', paymentStatus: 'UNPAID' })
  }

  async function add() {
    setError('')
    const content = f.content.trim() || f.title.trim()
    if (!content) { setError('النص مطلوب'); return }
    if (needsTitle && !f.title.trim()) { setError('العنوان مطلوب'); return }

    const payload: Record<string, unknown> = {
      type, title: f.title || undefined, content,
      departmentId: f.departmentId || null, projectId: f.projectId || null,
    }
    if (type === 'VOTE') {
      payload.voteResult = f.voteResult
      payload.votesFor = Number(f.votesFor) || 0
      payload.votesAgainst = Number(f.votesAgainst) || 0
      payload.votesAbstain = Number(f.votesAbstain) || 0
    }
    if (type === 'TASK') {
      payload.task = { assigneeIds: f.assigneeIds, primaryAssigneeId: f.primaryAssigneeId || f.assigneeIds[0] || null, dueDate: f.dueDate || null, priority: f.priority, description: f.content || undefined }
    }
    if (type === 'DELIVERABLE') {
      payload.deliverable = { ownerId: f.deliverableOwnerId || null, dueDate: f.deliverableDueDate || null, description: f.content || undefined }
    }
    if (type === 'COST') {
      payload.cost = {
        expectedAmount: f.expectedAmount ? Number(f.expectedAmount) : null,
        actualAmount: f.actualAmount ? Number(f.actualAmount) : null,
        currency: f.currency, responsibleId: f.responsibleId || null, paymentStatus: f.paymentStatus,
      }
    }

    setBusy(true)
    const res = await apiSend(`/api/minutes/${minutesId}/items`, 'POST', payload)
    setBusy(false)
    if (!res.success) { setError(res.error ?? 'تعذّر الحفظ'); return }
    reset()
    onAdded()
  }

  const deptOptions = departments.map((d) => ({ value: d.id, label: d.name }))
  const memberOptions = members.map((m) => ({ value: m.id, label: m.name }))

  return (
    <div className="mt-5 pt-5 border-t" style={{ borderColor: 'var(--border)' }}>
      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-2)' }}>إضافة بند جديد</p>

      {/* نوع البند */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {ITEM_TYPES.map((t) => (
          <button key={t} onClick={() => setType(t)} className="badge transition-colors"
            style={type === t ? { background: 'var(--brand)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'pointer' }}>
            {MINUTE_ITEM_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {(needsTitle || type === 'DECISION') && (
          <TextField label={type === 'COST' ? 'وصف التكلفة' : 'العنوان'} required={needsTitle}
            value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })}
            placeholder={type === 'TASK' ? 'مثال: إعداد مسودة المنهج' : type === 'COST' ? 'مثال: طباعة المناهج' : 'عنوان القرار'} />
        )}

        <TextAreaField label={needsTitle ? 'تفاصيل' : 'النص'} required={!needsTitle}
          value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })}
          placeholder={type === 'DISCUSSION' ? 'ملخص النقاش…' : type === 'DECISION' ? 'نص القرار…' : 'تفاصيل…'} />

        {/* ربط بقسم/مشروع — للقرار والتكليف والاستحقاق والتكلفة والمتابعة */}
        {['DECISION', 'TASK', 'DELIVERABLE', 'COST', 'FOLLOWUP'].includes(type) && (
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="القسم / اللجنة" placeholder="بدون" options={deptOptions}
              value={f.departmentId} onChange={(e) => setF({ ...f, departmentId: e.target.value, projectId: '' })} />
            <SelectField label="المشروع / الملف" placeholder="بدون" options={projects.map((p) => ({ value: p.id, label: p.name }))}
              value={f.projectId} onChange={(e) => setF({ ...f, projectId: e.target.value })} />
          </div>
        )}

        {/* حقول التكليف */}
        {type === 'TASK' && (
          <div className="space-y-3">
            <AssigneePicker
              members={members}
              selected={f.assigneeIds}
              primaryId={f.primaryAssigneeId}
              onChange={(assigneeIds, primaryAssigneeId) => setF({ ...f, assigneeIds, primaryAssigneeId })}
            />
            <div className="grid grid-cols-2 gap-3">
            <TextField label="الاستحقاق" type="date" dir="ltr" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} />
            <SelectField label="الأولوية" options={[
              { value: 'LOW', label: 'منخفضة' }, { value: 'MEDIUM', label: 'متوسطة' },
              { value: 'HIGH', label: 'عالية' }, { value: 'URGENT', label: 'عاجلة' },
            ]} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })} />
            </div>
          </div>
        )}

        {type === 'DELIVERABLE' && (
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="المسؤول العام" placeholder="بدون" options={memberOptions}
              value={f.deliverableOwnerId} onChange={(e) => setF({ ...f, deliverableOwnerId: e.target.value })} />
            <TextField label="تاريخ الاستحقاق" type="date" dir="ltr" value={f.deliverableDueDate} onChange={(e) => setF({ ...f, deliverableDueDate: e.target.value })} />
          </div>
        )}

        {/* حقول التكلفة */}
        {type === 'COST' && (
          <div className="grid grid-cols-2 gap-3">
            <TextField label="المبلغ المتوقع ($)" type="number" dir="ltr" value={f.expectedAmount} onChange={(e) => setF({ ...f, expectedAmount: e.target.value })} />
            <TextField label="المبلغ الفعلي ($)" type="number" dir="ltr" value={f.actualAmount} onChange={(e) => setF({ ...f, actualAmount: e.target.value })} />
            <SelectField label="المسؤول" placeholder="بدون" options={memberOptions}
              value={f.responsibleId} onChange={(e) => setF({ ...f, responsibleId: e.target.value })} />
            <SelectField label="حالة الدفع" options={[
              { value: 'UNPAID', label: 'غير مدفوع' }, { value: 'PARTIAL', label: 'مدفوع جزئيًا' }, { value: 'PAID', label: 'مدفوع' },
            ]} value={f.paymentStatus} onChange={(e) => setF({ ...f, paymentStatus: e.target.value })} />
          </div>
        )}

        {/* حقول التصويت */}
        {type === 'VOTE' && (
          <div className="grid grid-cols-4 gap-3">
            <SelectField label="النتيجة" options={[{ value: 'APPROVED', label: 'اعتُمد' }, { value: 'REJECTED', label: 'رُفض' }]}
              value={f.voteResult} onChange={(e) => setF({ ...f, voteResult: e.target.value })} />
            <TextField label="موافق" type="number" dir="ltr" value={f.votesFor} onChange={(e) => setF({ ...f, votesFor: e.target.value })} />
            <TextField label="معارض" type="number" dir="ltr" value={f.votesAgainst} onChange={(e) => setF({ ...f, votesAgainst: e.target.value })} />
            <TextField label="ممتنع" type="number" dir="ltr" value={f.votesAbstain} onChange={(e) => setF({ ...f, votesAbstain: e.target.value })} />
          </div>
        )}

        {error && <div className="text-sm rounded-lg px-3 py-2" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</div>}

        <button className="btn btn-primary" onClick={add} disabled={busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} إضافة البند
        </button>
      </div>
    </div>
  )
}

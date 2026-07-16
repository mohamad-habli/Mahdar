'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight, CalendarDays, Clock, MapPin, Video, ListChecks, Plus, X,
  Users, Loader2, Check, UserPlus, FileText, Trash2, BellRing, Link2, ExternalLink,
  Pencil,
} from 'lucide-react'
import { REMINDER_LABELS, type ReminderOffset } from '@/lib/notifications'
import Modal from '@/components/ui/Modal'
import { apiSend } from '@/lib/client'
import { formatDate } from '@/lib/utils'
import { ROLE_LABELS, ATTENDANCE_LABELS, type UserRole, type AttendanceStatus } from '@/types'
import MeetingWorkflowSteps, { type MeetingWorkflowState } from '@/components/meetings/MeetingWorkflowSteps'
import { TextAreaField, TextField } from '@/components/ui/Field'

interface Meeting {
  id: string; title: string; description: string | null; councilName: string
  meetingDate: string; startTime: string | null; endTime: string | null
  location: string | null; onlineUrl: string | null; status: string
}
interface Agenda { id: string; order: number; title: string; notes: string | null }
interface RosterRow { userId: string; name: string; role: string; membershipType: string; status: string | null; notes: string | null }
interface Guest { guestName: string; status: string }
interface Reminder { id: string; offsetType: string; scheduledFor: string; status: string }
interface DocumentLink { id: string; title: string; url: string; description: string | null }

const ATT_STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'EXCUSED']
const ATT_TONE: Record<AttendanceStatus, [string, string]> = {
  PRESENT: ['var(--success-bg)', 'var(--success)'],
  ABSENT: ['var(--danger-bg)', 'var(--danger)'],
  EXCUSED: ['var(--warning-bg)', 'var(--warning)'],
}
const M_STATUS: { value: string; label: string }[] = [
  { value: 'SCHEDULED', label: 'مجدول' },
  { value: 'NEEDS_UPDATE', label: 'بحاجة لتحديث الحالة' },
  { value: 'HELD', label: 'منعقد' },
  { value: 'CANCELLED', label: 'ملغى' },
]

export default function MeetingDetailClient({
  meeting, agenda, roster, guests: initialGuests, hasAttendance, reminders, documentLinks, workflow,
}: {
  meeting: Meeting; agenda: Agenda[]; roster: RosterRow[]; guests: Guest[]; hasAttendance: boolean; reminders: Reminder[]; documentLinks: DocumentLink[]; workflow: MeetingWorkflowState
}) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState('')
  const [editForm, setEditForm] = useState({
    title: meeting.title,
    description: meeting.description ?? '',
    meetingDate: meeting.meetingDate.slice(0, 10),
    startTime: meeting.startTime ?? '',
    endTime: meeting.endTime ?? '',
    location: meeting.location ?? '',
    onlineUrl: meeting.onlineUrl ?? '',
  })

  async function saveMeetingDetails() {
    setEditBusy(true); setEditError('')
    const res = await apiSend(`/api/meetings/${meeting.id}`, 'PATCH', editForm)
    setEditBusy(false)
    if (!res.success) { setEditError(res.error ?? 'تعذّر حفظ تفاصيل الاجتماع'); return }
    setEditOpen(false)
    router.refresh()
  }

  const ALL_OFFSETS: ReminderOffset[] = ['DAY_BEFORE', 'HOURS_3', 'HOUR_1']
  async function addReminder(offset: string) {
    await apiSend(`/api/meetings/${meeting.id}/reminders`, 'POST', { offsetType: offset })
    router.refresh()
  }
  async function removeReminder(rid: string) {
    await apiSend(`/api/meeting-reminders/${rid}`, 'DELETE')
    router.refresh()
  }
  const presentOffsets = new Set(reminders.map((r) => r.offsetType))
  const [docTitle, setDocTitle] = useState('')
  const [docUrl, setDocUrl] = useState('')
  const [docDescription, setDocDescription] = useState('')
  const [savingDoc, setSavingDoc] = useState(false)

  async function addDocumentLink() {
    if (!docTitle.trim() || !docUrl.trim()) return
    setSavingDoc(true)
    const res = await apiSend('/api/document-links', 'POST', {
      title: docTitle,
      url: docUrl,
      description: docDescription || null,
      entityType: 'MEETING',
      entityId: meeting.id,
    })
    setSavingDoc(false)
    if (!res.success) { alert(res.error); return }
    setDocTitle('')
    setDocUrl('')
    setDocDescription('')
    router.refresh()
  }

  // ===== الحالة =====
  const [status, setStatus] = useState(meeting.status)
  async function changeStatus(s: string) {
    setStatus(s)
    await apiSend(`/api/meetings/${meeting.id}`, 'PATCH', { status: s })
    router.refresh()
  }

  // ===== جدول الأعمال =====
  const [agendaInput, setAgendaInput] = useState('')
  const [addingAgenda, setAddingAgenda] = useState(false)
  async function addAgenda() {
    const v = agendaInput.trim()
    if (!v) return
    setAddingAgenda(true)
    await apiSend(`/api/meetings/${meeting.id}/agenda`, 'POST', { title: v })
    setAddingAgenda(false)
    setAgendaInput('')
    router.refresh()
  }
  async function delAgenda(id: string) {
    await apiSend(`/api/agenda-items/${id}`, 'DELETE')
    router.refresh()
  }

  // ===== الحضور =====
  const [att, setAtt] = useState<Record<string, AttendanceStatus>>(
    Object.fromEntries(roster.map((r) => [r.userId, (r.status as AttendanceStatus) ?? 'PRESENT']))
  )
  const [guests, setGuests] = useState<Guest[]>(initialGuests)
  const [guestName, setGuestName] = useState('')
  const [savingAtt, setSavingAtt] = useState(false)
  const [savedAtt, setSavedAtt] = useState(false)

  function setAllPresent() {
    setAtt(Object.fromEntries(roster.map((r) => [r.userId, 'PRESENT'])))
  }
  function addGuest() {
    const v = guestName.trim()
    if (!v) return
    setGuests([...guests, { guestName: v, status: 'PRESENT' }])
    setGuestName('')
  }
  async function saveAttendance() {
    setSavingAtt(true); setSavedAtt(false)
    const res = await apiSend(`/api/meetings/${meeting.id}/attendance`, 'PUT', {
      entries: roster.map((r) => ({ userId: r.userId, status: att[r.userId], attendeeType: r.membershipType === 'GUEST' ? 'GUEST' : 'PERMANENT' })),
      guests: guests.map((g) => ({ guestName: g.guestName, status: g.status })),
    })
    setSavingAtt(false)
    if (res.success) {
      setSavedAtt(true)
      setTimeout(() => setSavedAtt(false), 2500)
      router.refresh()
    }
  }

  const presentCount = roster.filter((r) => att[r.userId] === 'PRESENT').length

  return (
    <div className="max-w-5xl mx-auto">
      <Link href="/secretary/meetings" className="inline-flex items-center gap-1.5 text-sm mb-4" style={{ color: 'var(--text-2)' }}>
        <ArrowRight size={16} /> الاجتماعات
      </Link>

      <MeetingWorkflowSteps state={workflow} />

      {/* رأس الاجتماع */}
      <div className="card p-5 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-xl lg:text-2xl font-bold mb-1" style={{ color: 'var(--text-1)' }}>{meeting.title}</h1>
            <div className="text-sm flex items-center gap-3 flex-wrap" style={{ color: 'var(--text-2)' }}>
              <span>{meeting.councilName}</span>
              <span className="flex items-center gap-1"><CalendarDays size={14} /> {formatDate(meeting.meetingDate)}</span>
              {meeting.startTime && <span className="flex items-center gap-1" dir="ltr"><Clock size={14} /> {meeting.startTime}{meeting.endTime ? ` - ${meeting.endTime}` : ''}</span>}
              {meeting.location && <span className="flex items-center gap-1"><MapPin size={14} /> {meeting.location}</span>}
              {meeting.onlineUrl && <a href={meeting.onlineUrl} target="_blank" className="flex items-center gap-1" style={{ color: 'var(--brand)' }}><Video size={14} /> رابط</a>}
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={() => { setEditError(''); setEditOpen(true) }}><Pencil size={16} /> تعديل</button>
            <Link href={`/secretary/meetings/${meeting.id}/minutes`} className="btn btn-gold">
              <FileText size={17} /> المحضر
            </Link>
          </div>
        </div>

        {/* حالة الاجتماع */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>الحالة:</span>
          {M_STATUS.map((s) => (
            <button key={s.value} onClick={() => changeStatus(s.value)}
              className="badge transition-colors"
              style={status === s.value
                ? { background: 'var(--brand)', color: '#fff' }
                : { background: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'pointer' }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="تعديل تفاصيل الاجتماع"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setEditOpen(false)} disabled={editBusy}>إلغاء</button>
          <button className="btn btn-primary" onClick={saveMeetingDetails} disabled={editBusy}>{editBusy && <Loader2 size={16} className="animate-spin" />} حفظ</button>
        </>}
      >
        <div className="space-y-4">
          <TextField label="عنوان الاجتماع" required value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
          <TextAreaField label="الوصف" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="التاريخ" type="date" dir="ltr" value={editForm.meetingDate} onChange={(e) => setEditForm({ ...editForm, meetingDate: e.target.value })} />
            <TextField label="المكان" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
            <TextField label="وقت البداية" type="time" dir="ltr" value={editForm.startTime} onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })} />
            <TextField label="وقت النهاية" type="time" dir="ltr" value={editForm.endTime} onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })} />
          </div>
          <TextField label="رابط الاجتماع" type="url" dir="ltr" value={editForm.onlineUrl} onChange={(e) => setEditForm({ ...editForm, onlineUrl: e.target.value })} />
          {editError && <div className="text-sm rounded-lg px-3 py-2" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{editError}</div>}
        </div>
      </Modal>

      {/* التذكيرات */}
      <div className="card p-5 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <BellRing size={18} style={{ color: 'var(--brand)' }} />
          <h3 className="font-bold" style={{ color: 'var(--text-1)' }}>تذكيرات الاجتماع</h3>
        </div>
        {reminders.length === 0 ? (
          <p className="text-sm mb-3" style={{ color: 'var(--text-3)' }}>لا تذكيرات. أضِف تذكيرًا قبل الموعد.</p>
        ) : (
          <div className="flex flex-wrap gap-2 mb-3">
            {reminders.map((r) => (
              <span key={r.id} className="badge" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                <BellRing size={12} /> {REMINDER_LABELS[r.offsetType as ReminderOffset] ?? r.offsetType}
                {r.status === 'SENT' && <Check size={12} style={{ color: 'var(--success)' }} />}
                <button onClick={() => removeReminder(r.id)} style={{ color: 'var(--danger)' }} title="حذف"><X size={12} /></button>
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {ALL_OFFSETS.filter((o) => !presentOffsets.has(o)).map((o) => (
            <button key={o} onClick={() => addReminder(o)} className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'pointer' }}>
              <Plus size={12} /> {REMINDER_LABELS[o]}
            </button>
          ))}
        </div>
        <p className="text-xs mt-3" style={{ color: 'var(--text-3)' }}>تُرسَل التذكيرات كإشعارات داخلية لأعضاء المجلس. (البنية جاهزة لـ WhatsApp/Email لاحقًا.)</p>
      </div>

      <div className="card p-5 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Link2 size={18} style={{ color: 'var(--brand)' }} />
          <h3 className="font-bold" style={{ color: 'var(--text-1)' }}>روابط المستندات</h3>
        </div>
        {documentLinks.length > 0 && (
          <div className="space-y-2 mb-4">
            {documentLinks.map((d) => (
              <a key={d.id} href={d.url} target="_blank" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--surface-2)', color: 'var(--text-1)' }}>
                <ExternalLink size={14} style={{ color: 'var(--brand)' }} />
                <span className="font-semibold">{d.title}</span>
                {d.description && <span className="text-xs" style={{ color: 'var(--text-3)' }}>{d.description}</span>}
              </a>
            ))}
          </div>
        )}
        <div className="grid lg:grid-cols-3 gap-2">
          <input className="input" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="اسم الرابط" />
          <input className="input" dir="ltr" value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="https://..." />
          <div className="flex gap-2">
            <input className="input flex-1" value={docDescription} onChange={(e) => setDocDescription(e.target.value)} placeholder="وصف قصير" />
            <button className="btn btn-ghost" onClick={addDocumentLink} disabled={savingDoc}>
              {savingDoc ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* جدول الأعمال */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
            <ListChecks size={18} style={{ color: 'var(--brand)' }} />
            <h3 className="font-bold" style={{ color: 'var(--text-1)' }}>جدول الأعمال</h3>
            <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>{agenda.length}</span>
          </div>
          <div className="p-4">
            <div className="flex gap-2 mb-3">
              <input className="input flex-1" value={agendaInput} onChange={(e) => setAgendaInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAgenda() } }}
                placeholder="أضِف بندًا واضغط Enter" />
              <button className="btn btn-ghost" onClick={addAgenda} disabled={addingAgenda}>
                {addingAgenda ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              </button>
            </div>
            {agenda.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: 'var(--text-3)' }}>لا بنود بعد.</p>
            ) : (
              <ul className="space-y-1.5">
                {agenda.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--surface-2)' }}>
                    <span className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'var(--gold-bg)', color: 'var(--gold-dark)' }}>{a.order}</span>
                    <span className="flex-1" style={{ color: 'var(--text-1)' }}>{a.title}</span>
                    <button onClick={() => delAgenda(a.id)} style={{ color: 'var(--danger)' }}><X size={15} /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* الحضور */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between gap-2" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <Users size={18} style={{ color: 'var(--brand)' }} />
              <h3 className="font-bold" style={{ color: 'var(--text-1)' }}>الحضور</h3>
              <span className="badge" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>{presentCount}/{roster.length}</span>
            </div>
            <button className="text-xs font-semibold" style={{ color: 'var(--brand)' }} onClick={setAllPresent}>تحديد الكل حاضر</button>
          </div>
          <div className="p-4">
            {roster.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: 'var(--text-3)' }}>
                لا أعضاء في هذا المجلس. أضِف الأعضاء من صفحة المجلس.
              </p>
            ) : (
              <div className="space-y-2">
                {roster.map((r) => (
                  <div key={r.userId} className="flex items-center gap-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{r.name}</div>
                      <div className="text-[11px]" style={{ color: 'var(--text-3)' }}>{ROLE_LABELS[r.role as UserRole]}</div>
                    </div>
                    <div className="flex gap-1">
                      {ATT_STATUSES.map((s) => {
                        const active = att[r.userId] === s
                        const [bg, fg] = ATT_TONE[s]
                        return (
                          <button key={s} onClick={() => setAtt({ ...att, [r.userId]: s })}
                            className="badge transition-all"
                            style={active ? { background: bg, color: fg, outline: `1.5px solid ${fg}` } : { background: 'var(--surface-2)', color: 'var(--text-3)', cursor: 'pointer' }}>
                            {ATTENDANCE_LABELS[s]}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {/* الضيوف */}
                <div className="pt-3 mt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex gap-2">
                    <input className="input flex-1" value={guestName} onChange={(e) => setGuestName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGuest() } }}
                      placeholder="إضافة ضيف بالاسم" />
                    <button className="btn btn-ghost" onClick={addGuest}><UserPlus size={16} /></button>
                  </div>
                  {guests.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {guests.map((g, i) => (
                        <li key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm" style={{ background: 'var(--surface-2)' }}>
                          <span className="flex-1" style={{ color: 'var(--text-1)' }}>{g.guestName}</span>
                          <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>ضيف</span>
                          <button onClick={() => setGuests(guests.filter((_, j) => j !== i))} style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <button className="btn btn-primary w-full mt-3" onClick={saveAttendance} disabled={savingAtt}>
                  {savingAtt ? <Loader2 size={16} className="animate-spin" /> : savedAtt ? <Check size={16} /> : null}
                  {savedAtt ? 'تم الحفظ' : hasAttendance ? 'تحديث الحضور' : 'حفظ الحضور'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

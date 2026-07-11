'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, CalendarDays, Clock, MapPin, Video, Users, ListChecks,
  ChevronLeft, Loader2, X,
} from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { TextField, TextAreaField, SelectField } from '@/components/ui/Field'
import { MinutesStatusBadge } from '@/components/badges'
import { apiSend } from '@/lib/client'
import { formatDate } from '@/lib/utils'

interface Meeting {
  id: string
  title: string
  councilName: string
  meetingDate: string
  startTime: string | null
  endTime: string | null
  location: string | null
  onlineUrl: string | null
  status: string
  attendanceCount: number
  agendaCount: number
  minutesStatus: string | null
}

const STATUS_LABEL: Record<string, string> = { SCHEDULED: 'مجدول', NEEDS_UPDATE: 'بحاجة لتحديث الحالة', HELD: 'منعقد', CANCELLED: 'ملغى' }
const STATUS_TONE: Record<string, [string, string]> = {
  SCHEDULED: ['var(--info-bg)', 'var(--info)'],
  NEEDS_UPDATE: ['var(--warning-bg)', 'var(--warning)'],
  HELD: ['var(--success-bg)', 'var(--success)'],
  CANCELLED: ['var(--surface-3)', 'var(--text-3)'],
}

export default function MeetingsClient({
  meetings,
  councils,
}: {
  meetings: Meeting[]
  councils: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [agenda, setAgenda] = useState<string[]>([])
  const [agendaInput, setAgendaInput] = useState('')
  const [form, setForm] = useState({
    councilId: councils[0]?.id ?? '',
    title: '',
    description: '',
    meetingDate: '',
    startTime: '',
    endTime: '',
    location: '',
    onlineUrl: '',
  })

  const now = new Date()
  const upcoming = meetings.filter((m) => m.status === 'SCHEDULED' && new Date(m.meetingDate) >= new Date(now.toDateString()))
  const past = meetings.filter((m) => !(m.status === 'SCHEDULED' && new Date(m.meetingDate) >= new Date(now.toDateString())))

  function addAgenda() {
    const v = agendaInput.trim()
    if (!v) return
    setAgenda([...agenda, v])
    setAgendaInput('')
  }

  async function save() {
    setSaving(true); setError('')
    const res = await apiSend<{ id: string }>('/api/meetings', 'POST', { ...form, agenda })
    setSaving(false)
    if (!res.success) { setError(res.error ?? 'تعذّر الحفظ'); return }
    setOpen(false)
    router.push(`/secretary/meetings/${res.data!.id}`)
  }

  function openCreate() {
    if (councils.length === 0) { alert('أنشئ مجلسًا أولًا من صفحة المجالس.'); return }
    setError(''); setAgenda([]); setAgendaInput('')
    setForm({ councilId: councils[0]?.id ?? '', title: '', description: '', meetingDate: '', startTime: '', endTime: '', location: '', onlineUrl: '' })
    setOpen(true)
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="الاجتماعات"
        subtitle="أنشئ الجلسات، جهّز جدول الأعمال، وسجّل الحضور."
        action={<button className="btn btn-primary" onClick={openCreate}><Plus size={18} /> اجتماع جديد</button>}
      />

      {meetings.length === 0 ? (
        <div className="card">
          <EmptyState icon={CalendarDays} title="لا اجتماعات بعد" hint="ابدأ بإنشاء أول جلسة لمجلسك."
            action={<button className="btn btn-primary" onClick={openCreate}><Plus size={18} /> اجتماع جديد</button>} />
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && <Section title="القادمة" meetings={upcoming} />}
          {past.length > 0 && <Section title="السابقة" meetings={past} />}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="اجتماع جديد"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setOpen(false)} disabled={saving}>إلغاء</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving && <Loader2 size={16} className="animate-spin" />} إنشاء
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <SelectField label="المجلس / اللجنة" required options={councils.map((c) => ({ value: c.id, label: c.name }))}
            value={form.councilId} onChange={(e) => setForm({ ...form, councilId: e.target.value })} />
          <TextField label="عنوان الاجتماع" required value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: الجلسة الأسبوعية رقم 14" />
          <div className="grid grid-cols-3 gap-3">
            <TextField label="التاريخ" required type="date" dir="ltr" value={form.meetingDate}
              onChange={(e) => setForm({ ...form, meetingDate: e.target.value })} />
            <TextField label="البداية" type="time" dir="ltr" value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            <TextField label="النهاية" type="time" dir="ltr" value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="المكان" value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="قاعة الاجتماعات" />
            <TextField label="رابط أونلاين" dir="ltr" value={form.onlineUrl}
              onChange={(e) => setForm({ ...form, onlineUrl: e.target.value })} placeholder="https://…" />
          </div>
          <TextAreaField label="ملاحظات" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />

          {/* جدول الأعمال */}
          <div>
            <label className="block mb-1.5 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>جدول الأعمال</label>
            <div className="flex gap-2">
              <input className="input flex-1" value={agendaInput} onChange={(e) => setAgendaInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAgenda() } }}
                placeholder="أضِف بندًا واضغط Enter" />
              <button type="button" className="btn btn-ghost" onClick={addAgenda}><Plus size={16} /></button>
            </div>
            {agenda.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {agenda.map((a, i) => (
                  <li key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--surface-2)' }}>
                    <span className="font-bold" style={{ color: 'var(--gold-dark)' }}>{i + 1}</span>
                    <span className="flex-1" style={{ color: 'var(--text-1)' }}>{a}</span>
                    <button type="button" onClick={() => setAgenda(agenda.filter((_, j) => j !== i))} style={{ color: 'var(--danger)' }}><X size={15} /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <div className="text-sm rounded-lg px-3 py-2" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</div>}
        </div>
      </Modal>
    </div>
  )

  function Section({ title, meetings }: { title: string; meetings: Meeting[] }) {
    return (
      <div>
        <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--text-2)' }}>{title}</h2>
        <div className="space-y-3">
          {meetings.map((m) => {
            const [bg, fg] = STATUS_TONE[m.status] ?? STATUS_TONE.SCHEDULED
            return (
              <Link key={m.id} href={`/secretary/meetings/${m.id}`} className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow group">
                <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 leading-none" style={{ background: 'var(--brand)', color: '#fff' }}>
                  <span className="text-lg font-bold">{new Date(m.meetingDate).getDate()}</span>
                  <span className="text-[9px] opacity-80">{new Intl.DateTimeFormat('ar-EG-u-nu-latn', { month: 'short' }).format(new Date(m.meetingDate))}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>{m.title}</span>
                    <span className="badge" style={{ background: bg, color: fg }}>{STATUS_LABEL[m.status]}</span>
                    {m.minutesStatus && <MinutesStatusBadge status={m.minutesStatus} />}
                  </div>
                  <div className="text-xs mt-1 flex items-center gap-3 flex-wrap" style={{ color: 'var(--text-3)' }}>
                    <span>{m.councilName}</span>
                    <span className="flex items-center gap-1"><CalendarDays size={12} /> {formatDate(m.meetingDate)}</span>
                    {m.startTime && <span className="flex items-center gap-1" dir="ltr"><Clock size={12} /> {m.startTime}</span>}
                    {m.location && <span className="flex items-center gap-1"><MapPin size={12} /> {m.location}</span>}
                    {m.onlineUrl && <Video size={12} />}
                    <span className="flex items-center gap-1"><ListChecks size={12} /> {m.agendaCount}</span>
                    <span className="flex items-center gap-1"><Users size={12} /> {m.attendanceCount}</span>
                  </div>
                </div>
                <ChevronLeft size={18} style={{ color: 'var(--text-3)' }} className="group-hover:-translate-x-1 transition-transform" />
              </Link>
            )
          })}
        </div>
      </div>
    )
  }
}

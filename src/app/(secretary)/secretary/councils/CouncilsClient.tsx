'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus,
  Network,
  Users,
  Building2,
  CalendarDays,
  ChevronLeft,
  Loader2,
  Repeat,
} from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { TextField, TextAreaField, SelectField } from '@/components/ui/Field'
import { apiSend } from '@/lib/client'

interface Council {
  id: string
  name: string
  type: string
  description: string | null
  recurrence: string
  isActive: boolean
  _count: { departments: number; members: number; meetings: number }
}

const RECURRENCE_LABEL: Record<string, string> = {
  NONE: 'بدون تكرار',
  WEEKLY: 'أسبوعي',
  MONTHLY: 'شهري',
}

const WEEKDAYS = [
  { value: '0', label: 'الأحد' },
  { value: '1', label: 'الاثنين' },
  { value: '2', label: 'الثلاثاء' },
  { value: '3', label: 'الأربعاء' },
  { value: '4', label: 'الخميس' },
  { value: '5', label: 'الجمعة' },
  { value: '6', label: 'السبت' },
]

export default function CouncilsClient({ councils }: { councils: Council[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    type: 'COUNCIL',
    description: '',
    recurrence: 'WEEKLY',
    recurrenceDay: '1',
    defaultStartTime: '16:00',
    defaultEndTime: '18:00',
    defaultLocation: '',
  })

  async function save() {
    setSaving(true)
    setError('')
    const res = await apiSend('/api/councils', 'POST', {
      name: form.name,
      type: form.type,
      description: form.description,
      recurrence: form.recurrence,
      recurrenceDay: form.recurrence === 'NONE' ? null : Number(form.recurrenceDay),
      defaultStartTime: form.defaultStartTime,
      defaultEndTime: form.defaultEndTime,
      defaultLocation: form.defaultLocation,
    })
    setSaving(false)
    if (!res.success) {
      setError(res.error ?? 'تعذّر الحفظ')
      return
    }
    setOpen(false)
    router.refresh()
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="المجالس واللجان"
        subtitle="أنشئ المجالس واللجان وحدّد دورية اجتماعاتها."
        action={
          <button className="btn btn-primary" onClick={() => { setError(''); setOpen(true) }}>
            <Plus size={18} /> مجلس / لجنة
          </button>
        }
      />

      {councils.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Network}
            title="لا توجد مجالس بعد"
            hint="ابدأ بإنشاء المجلس الرئيسي ثم أضف اللجان والأقسام."
            action={
              <button className="btn btn-primary" onClick={() => setOpen(true)}>
                <Plus size={18} /> إنشاء مجلس
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {councils.map((c) => (
            <Link
              key={c.id}
              href={`/secretary/councils/${c.id}`}
              className="card p-5 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}
                >
                  <Network size={22} />
                </div>
                <ChevronLeft size={18} style={{ color: 'var(--text-3)' }} className="mt-2 group-hover:-translate-x-1 transition-transform" />
              </div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-bold" style={{ color: 'var(--text-1)' }}>
                  {c.name}
                </h3>
                <span className="badge" style={{ background: 'var(--gold-bg)', color: 'var(--gold-dark)' }}>
                  {c.type === 'COMMITTEE' ? 'لجنة' : 'مجلس'}
                </span>
                {!c.isActive && (
                  <span className="badge" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
                    معطّل
                  </span>
                )}
              </div>
              {c.description && (
                <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--text-2)' }}>
                  {c.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-xs mt-3" style={{ color: 'var(--text-3)' }}>
                <span className="flex items-center gap-1"><Users size={13} /> {c._count.members} عضو</span>
                <span className="flex items-center gap-1"><Building2 size={13} /> {c._count.departments} قسم</span>
                <span className="flex items-center gap-1"><CalendarDays size={13} /> {c._count.meetings} اجتماع</span>
                {c.recurrence !== 'NONE' && (
                  <span className="flex items-center gap-1"><Repeat size={13} /> {RECURRENCE_LABEL[c.recurrence]}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="إنشاء مجلس / لجنة"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setOpen(false)} disabled={saving}>إلغاء</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving && <Loader2 size={16} className="animate-spin" />} حفظ
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <TextField
            label="الاسم"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="مثال: المجلس الرئيسي"
          />
          <SelectField
            label="النوع"
            options={[{ value: 'COUNCIL', label: 'مجلس' }, { value: 'COMMITTEE', label: 'لجنة' }]}
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          />
          <TextAreaField
            label="وصف مختصر"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="الغرض من المجلس…"
          />

          <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-2)' }}>
              دورية الاجتماعات (تُستخدم للتذكير والجدولة)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="التكرار"
                options={[
                  { value: 'NONE', label: 'بدون تكرار' },
                  { value: 'WEEKLY', label: 'أسبوعي' },
                  { value: 'MONTHLY', label: 'شهري' },
                ]}
                value={form.recurrence}
                onChange={(e) => setForm({ ...form, recurrence: e.target.value })}
              />
              {form.recurrence === 'WEEKLY' && (
                <SelectField
                  label="يوم الأسبوع"
                  options={WEEKDAYS}
                  value={form.recurrenceDay}
                  onChange={(e) => setForm({ ...form, recurrenceDay: e.target.value })}
                />
              )}
              {form.recurrence === 'MONTHLY' && (
                <TextField
                  label="يوم الشهر"
                  type="number"
                  min={1}
                  max={31}
                  dir="ltr"
                  value={form.recurrenceDay}
                  onChange={(e) => setForm({ ...form, recurrenceDay: e.target.value })}
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <TextField
                label="وقت البداية"
                type="time"
                dir="ltr"
                value={form.defaultStartTime}
                onChange={(e) => setForm({ ...form, defaultStartTime: e.target.value })}
              />
              <TextField
                label="وقت النهاية"
                type="time"
                dir="ltr"
                value={form.defaultEndTime}
                onChange={(e) => setForm({ ...form, defaultEndTime: e.target.value })}
              />
            </div>
            <TextField
              className="mt-3"
              label="المكان الافتراضي"
              value={form.defaultLocation}
              onChange={(e) => setForm({ ...form, defaultLocation: e.target.value })}
              placeholder="قاعة الاجتماعات / رابط أونلاين"
            />
          </div>

          {error && (
            <div className="text-sm rounded-lg px-3 py-2" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
              {error}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

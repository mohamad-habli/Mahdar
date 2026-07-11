'use client'

import { useState } from 'react'
import { BellRing, CalendarClock, Check, Clock3, Loader2 } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { Field } from '@/components/ui/Field'
import { apiSend } from '@/lib/client'

export interface ReminderSettings {
  enabled: boolean
  taskEnabled: boolean
  deliverableEnabled: boolean
  periodicEnabled: boolean
  intervalDays: number
  reminderTime: string
  beforeDueEnabled: boolean
  beforeDueHours: number[]
  includeOverdue: boolean
}

const HOUR_OPTIONS = [1, 3, 6, 12, 24, 48, 72]

export default function ReminderSettingsClient({ initial }: { initial: ReminderSettings }) {
  const [settings, setSettings] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  function update<K extends keyof ReminderSettings>(key: K, value: ReminderSettings[K]) {
    setSaved(false)
    setSettings((current) => ({ ...current, [key]: value }))
  }

  function toggleHour(hour: number) {
    const selected = settings.beforeDueHours.includes(hour)
    update('beforeDueHours', selected
      ? settings.beforeDueHours.filter((item) => item !== hour)
      : [...settings.beforeDueHours, hour])
  }

  async function save() {
    setBusy(true)
    setSaved(false)
    const result = await apiSend('/api/reminder-preferences', 'PUT', settings)
    setBusy(false)
    if (!result.success) {
      alert(result.error)
      return
    }
    setSaved(true)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title="إعدادات التذكير" subtitle="نظامك الشخصي للتكليفات والاستحقاقات" />

      <div className="card p-5 space-y-6">
        <ToggleRow
          icon={BellRing}
          title="تشغيل التذكيرات الشخصية"
          checked={settings.enabled}
          onChange={(checked) => update('enabled', checked)}
        />

        <div className={settings.enabled ? 'space-y-6' : 'space-y-6 opacity-50 pointer-events-none'}>
          <section className="pt-5 border-t" style={{ borderColor: 'var(--border)' }}>
            <h2 className="font-bold mb-3" style={{ color: 'var(--text-1)' }}>العناصر المشمولة</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <CheckOption label="التكليفات المسندة إليّ" checked={settings.taskEnabled} onChange={(value) => update('taskEnabled', value)} />
              <CheckOption label="الاستحقاقات التي أديرها" checked={settings.deliverableEnabled} onChange={(value) => update('deliverableEnabled', value)} />
            </div>
          </section>

          <section className="pt-5 border-t" style={{ borderColor: 'var(--border)' }}>
            <ToggleRow
              icon={Clock3}
              title="تذكير دوري"
              checked={settings.periodicEnabled}
              onChange={(checked) => update('periodicEnabled', checked)}
            />
            {settings.periodicEnabled && (
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <Field label="التكرار">
                  <select className="input" value={settings.intervalDays} onChange={(event) => update('intervalDays', Number(event.target.value))}>
                    <option value={1}>يوميًا</option>
                    <option value={2}>كل يومين</option>
                    <option value={3}>كل 3 أيام</option>
                    <option value={7}>أسبوعيًا</option>
                    <option value={14}>كل أسبوعين</option>
                  </select>
                </Field>
                <Field label="وقت التذكير">
                  <input className="input" type="time" value={settings.reminderTime} onChange={(event) => update('reminderTime', event.target.value)} />
                </Field>
                <CheckOption className="sm:col-span-2" label="الاستمرار بعد تأخر الموعد" checked={settings.includeOverdue} onChange={(value) => update('includeOverdue', value)} />
              </div>
            )}
          </section>

          <section className="pt-5 border-t" style={{ borderColor: 'var(--border)' }}>
            <ToggleRow
              icon={CalendarClock}
              title="قبل موعد الاستحقاق"
              checked={settings.beforeDueEnabled}
              onChange={(checked) => update('beforeDueEnabled', checked)}
            />
            {settings.beforeDueEnabled && (
              <div className="mt-4">
                <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-2)' }}>أوقات التنبيه</p>
                <div className="flex flex-wrap gap-2">
                  {HOUR_OPTIONS.map((hour) => {
                    const active = settings.beforeDueHours.includes(hour)
                    return (
                      <button
                        key={hour}
                        type="button"
                        className="btn"
                        aria-pressed={active}
                        onClick={() => toggleHour(hour)}
                        style={active
                          ? { background: 'var(--brand)', color: '#fff', borderColor: 'var(--brand)' }
                          : { background: 'var(--surface-2)', color: 'var(--text-2)', borderColor: 'var(--border)' }}
                      >
                        {hour < 24 ? `قبل ${hour} ${hour === 1 ? 'ساعة' : 'ساعات'}` : `قبل ${hour / 24} ${hour === 24 ? 'يوم' : 'أيام'}`}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="pt-5 border-t flex items-center gap-3" style={{ borderColor: 'var(--border)' }}>
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}
            حفظ الإعدادات
          </button>
          {saved && <span className="text-sm" style={{ color: 'var(--success)' }}>تم الحفظ</span>}
        </div>
      </div>
    </div>
  )
}

function ToggleRow({ icon: Icon, title, checked, onChange }: {
  icon: typeof BellRing
  title: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <span className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
        <Icon size={18} />
      </span>
      <span className="font-semibold flex-1" style={{ color: 'var(--text-1)' }}>{title}</span>
      <input type="checkbox" className="w-5 h-5 accent-[var(--brand)]" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  )
}

function CheckOption({ label, checked, onChange, className = '' }: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string
}) {
  return (
    <label className={`flex items-center gap-2.5 p-3 border rounded-lg cursor-pointer ${className}`} style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
      <input type="checkbox" className="w-4 h-4 accent-[var(--brand)]" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="text-sm font-medium">{label}</span>
    </label>
  )
}

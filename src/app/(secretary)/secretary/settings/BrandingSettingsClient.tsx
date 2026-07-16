'use client'

import { useRef, useState } from 'react'
import { ImageUp, Loader2, Palette, Save } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { SelectField, TextField } from '@/components/ui/Field'
import { apiSend } from '@/lib/client'
import { REPORT_THEME_LABELS, type OrganizationBranding, type ReportTheme } from '@/lib/branding'

interface Initial extends OrganizationBranding {
  name: string
  logoUrl: string | null
}

export default function BrandingSettingsClient({ initial }: { initial: Initial }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function save() {
    setSaving(true); setError(''); setMessage('')
    const result = await apiSend('/api/organization/branding', 'PATCH', form)
    setSaving(false)
    if (!result.success) { setError(result.error ?? 'تعذر حفظ الهوية'); return }
    setMessage('تم حفظ هوية المركز وتطبيقها على التقارير.')
  }

  async function upload(file?: File) {
    if (!file) return
    setUploading(true); setError(''); setMessage('')
    const data = new FormData()
    data.append('logo', file)
    const response = await fetch('/api/organization/branding/logo', { method: 'POST', body: data })
    const result = await response.json().catch(() => ({}))
    setUploading(false)
    if (!response.ok || !result.success) { setError(result.error ?? 'تعذر رفع الشعار'); return }
    setForm({ ...form, logoUrl: result.data.logoUrl })
    setMessage('تم رفع الشعار.')
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="هوية المركز والتقارير" subtitle="الهوية الرسمية التي تظهر تلقائيًا في المحاضر والتقارير المصدّرة." />
      <div className="grid lg:grid-cols-[280px_1fr] gap-5">
        <div className="card p-5">
          <div className="text-sm font-bold mb-3" style={{ color: 'var(--text-1)' }}>شعار المركز</div>
          <button
            className="w-full aspect-square border flex items-center justify-center overflow-hidden"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', borderRadius: 8 }}
            onClick={() => inputRef.current?.click()}
            title="رفع شعار"
          >
            {form.logoUrl ? <img src={form.logoUrl} alt="شعار المركز" className="max-w-[80%] max-h-[80%] object-contain" /> : <ImageUp size={42} style={{ color: 'var(--text-3)' }} />}
          </button>
          <input ref={inputRef} type="file" accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml" hidden onChange={(event) => upload(event.target.files?.[0])} />
          <button className="btn btn-ghost w-full mt-3" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImageUp size={16} />} رفع الشعار
          </button>
          <p className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>PNG أو JPG أو SVG، حتى 2MB.</p>
        </div>

        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Palette size={19} style={{ color: 'var(--brand)' }} />
            <h2 className="font-bold">تنسيق المحاضر والتقارير</h2>
          </div>
          <TextField label="اسم المركز الرسمي" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <div className="grid sm:grid-cols-2 gap-3">
            <SelectField
              label="الثيم"
              options={(Object.keys(REPORT_THEME_LABELS) as ReportTheme[]).map((value) => ({ value, label: REPORT_THEME_LABELS[value] }))}
              value={form.reportTheme}
              onChange={(event) => setForm({ ...form, reportTheme: event.target.value as ReportTheme })}
            />
            <SelectField
              label="نمط المسافات"
              options={[{ value: 'COMPACT', label: 'مضغوط' }, { value: 'BALANCED', label: 'متوازن' }, { value: 'SPACIOUS', label: 'واسع' }]}
              value={form.reportStyle}
              onChange={(event) => setForm({ ...form, reportStyle: event.target.value as OrganizationBranding['reportStyle'] })}
            />
            <ColorField label="اللون الرئيسي" value={form.primaryColor} onChange={(primaryColor) => setForm({ ...form, primaryColor })} />
            <ColorField label="اللون الثانوي" value={form.secondaryColor} onChange={(secondaryColor) => setForm({ ...form, secondaryColor })} />
          </div>
          <div className="rounded-lg border p-4" style={{ borderColor: form.secondaryColor, borderRightWidth: 5 }}>
            <div className="font-bold" style={{ color: form.primaryColor }}>{form.name || 'اسم المركز'}</div>
            <div className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>{REPORT_THEME_LABELS[form.reportTheme]} · نموذج معاينة للهوية</div>
          </div>
          {error && <div className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</div>}
          {message && <div className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>{message}</div>}
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} حفظ الهوية</button>
        </div>
      </div>
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="block mb-1.5 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>{label}</span>
      <span className="input flex items-center gap-3">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="w-8 h-8 p-0 border-0 bg-transparent" />
        <span dir="ltr" className="text-sm">{value}</span>
      </span>
    </label>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, Loader2, Pencil, Phone, Plus, Power, Trash2, UserCog } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { PasswordField, TextField } from '@/components/ui/Field'
import { apiSend } from '@/lib/client'

export interface SecretaryRow {
  id: string
  name: string
  loginName: string | null
  username: string
  jobTitle: string | null
  phone: string | null
  email: string | null
  isActive: boolean
}

interface Props {
  organizationId: string
  organizationName: string
  loginPrefix: string | null
  secretaries: SecretaryRow[]
}

type Mode = 'list' | 'create' | 'edit' | 'delete'

const emptyForm = {
  name: '',
  loginName: '',
  phone: '',
  jobTitle: '',
  password: '',
}

function finalLogin(prefix: string | null, loginName: string) {
  if (!prefix || !loginName.trim()) return ''
  return `${prefix}-${loginName.trim().toLowerCase()}`
}

export default function SecretaryManager({ organizationId, organizationName, loginPrefix, secretaries }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('list')
  const [selected, setSelected] = useState<SecretaryRow | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function openManager() {
    setMode('list')
    setSelected(null)
    setError('')
    setOpen(true)
  }

  function openCreate() {
    setMode('create')
    setSelected(null)
    setForm(emptyForm)
    setError('')
  }

  function openEdit(secretary: SecretaryRow) {
    setMode('edit')
    setSelected(secretary)
    setForm({
      name: secretary.name,
      loginName: secretary.loginName ?? '',
      phone: secretary.phone ?? '',
      jobTitle: secretary.jobTitle ?? '',
      password: '',
    })
    setError('')
  }

  function backToList() {
    setMode('list')
    setSelected(null)
    setError('')
  }

  async function saveSecretary() {
    setSaving(true)
    setError('')
    const payload = {
      name: form.name,
      phone: form.phone,
      jobTitle: form.jobTitle,
      ...(mode === 'create' ? { organizationId, role: 'SECRETARY' } : {}),
      ...(mode === 'create' || form.loginName.trim() ? { loginName: form.loginName } : {}),
      ...(form.password ? { password: form.password } : {}),
    }
    const result = mode === 'edit' && selected
      ? await apiSend(`/api/users/${selected.id}`, 'PATCH', payload)
      : await apiSend('/api/users', 'POST', payload)
    setSaving(false)
    if (!result.success) return setError(result.error ?? 'تعذّر حفظ حساب أمين السر')
    backToList()
    router.refresh()
  }

  async function toggleSecretary(secretary: SecretaryRow) {
    setSaving(true)
    setError('')
    const result = await apiSend(`/api/users/${secretary.id}`, 'PATCH', { isActive: !secretary.isActive })
    setSaving(false)
    if (!result.success) return setError(result.error ?? 'تعذّر تحديث حساب أمين السر')
    router.refresh()
  }

  async function deleteSecretary() {
    if (!selected) return
    setSaving(true)
    setError('')
    const result = await apiSend(`/api/users/${selected.id}`, 'DELETE')
    setSaving(false)
    if (!result.success) return setError(result.error ?? 'تعذّر حذف حساب أمين السر')
    backToList()
    router.refresh()
  }

  const preview = finalLogin(loginPrefix, form.loginName)
  const title = mode === 'list'
    ? `أمناء سر ${organizationName}`
    : mode === 'create'
      ? 'إضافة أمين سر'
      : mode === 'edit'
        ? 'تعديل أمين السر'
        : 'حذف أمين السر نهائيًا'

  return (
    <>
      <button className="btn btn-ghost text-sm" onClick={openManager}>
        <UserCog size={16} /> أمناء السر
        <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>{secretaries.length}</span>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        footer={mode === 'list' ? (
          <>
            <button className="btn btn-ghost" onClick={() => setOpen(false)}>إغلاق</button>
            <button className="btn btn-primary" onClick={openCreate} disabled={!loginPrefix} title={loginPrefix ? 'إضافة أمين سر' : 'حدد معرّف المركز أولًا'}>
              <Plus size={16} /> إضافة أمين سر
            </button>
          </>
        ) : mode === 'delete' ? (
          <>
            <button className="btn btn-ghost" onClick={backToList} disabled={saving}>رجوع</button>
            <button className="btn" onClick={deleteSecretary} disabled={saving} style={{ background: 'var(--danger)', color: 'white' }}>
              {saving && <Loader2 size={16} className="animate-spin" />} حذف نهائي
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-ghost" onClick={backToList} disabled={saving}>رجوع</button>
            <button
              className="btn btn-primary"
              onClick={saveSecretary}
              disabled={saving || !loginPrefix || !form.name.trim() || !form.phone.trim() || (mode === 'create' && (!form.loginName.trim() || !form.password))}
            >
              {saving && <Loader2 size={16} className="animate-spin" />} حفظ
            </button>
          </>
        )}
      >
        {mode === 'list' && (
          <div className="space-y-3">
            {!loginPrefix && (
              <div className="rounded-lg px-3 py-2 text-sm flex items-center gap-2" style={{ background: 'var(--gold-bg)', color: 'var(--gold-dark)' }}>
                <KeyRound size={16} /> حدد معرّف المركز قبل إضافة أمين سر جديد.
              </div>
            )}
            {error && <div className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</div>}
            {secretaries.length === 0 ? (
              <div className="py-8 text-center text-sm" style={{ color: 'var(--text-3)' }}>لا يوجد أمين سر في هذا المركز.</div>
            ) : secretaries.map((secretary) => (
              <div key={secretary.id} className="flex items-center gap-3 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold shrink-0" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                  {secretary.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{secretary.name}</span>
                    {!secretary.isActive && <span className="badge" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>مجمّد</span>}
                  </div>
                  <div className="mt-1 flex items-center gap-3 flex-wrap text-xs" style={{ color: 'var(--text-3)' }}>
                    <span dir="ltr" className="flex items-center gap-1"><KeyRound size={11} /> {secretary.username}</span>
                    {secretary.phone && <span dir="ltr" className="flex items-center gap-1"><Phone size={11} /> {secretary.phone}</span>}
                  </div>
                </div>
                <button className="btn btn-ghost px-2.5 py-1.5" onClick={() => openEdit(secretary)} title="تعديل أمين السر" aria-label="تعديل أمين السر"><Pencil size={15} /></button>
                <button className="btn btn-ghost px-2.5 py-1.5" onClick={() => toggleSecretary(secretary)} disabled={saving} title={secretary.isActive ? 'تجميد أمين السر' : 'إعادة تفعيل أمين السر'} aria-label={secretary.isActive ? 'تجميد أمين السر' : 'إعادة تفعيل أمين السر'} style={{ color: secretary.isActive ? 'var(--warning)' : 'var(--success)' }}><Power size={15} /></button>
                <button className="btn btn-ghost px-2.5 py-1.5" onClick={() => { setSelected(secretary); setMode('delete'); setError('') }} title="حذف أمين السر" aria-label="حذف أمين السر" style={{ color: 'var(--danger)' }}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        )}

        {(mode === 'create' || mode === 'edit') && (
          <div className="space-y-4">
            <TextField label="الاسم الكامل" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="مثال: إبراهيم عقل" />
            <TextField
              label="اسم المستخدم بالإنجليزية"
              required={mode === 'create' || !!form.loginName}
              dir="ltr"
              value={form.loginName}
              onChange={(event) => setForm({ ...form, loginName: event.target.value.replace(/[^a-zA-Z0-9]/g, '') })}
              placeholder="IbrahimAkel"
              hint={mode === 'edit' && !selected?.loginName ? 'حساب قديم؛ اتركه فارغًا للإبقاء على معرّف دخوله الحالي، أو أدخل اسمًا إنجليزيًا لنقله إلى الصيغة الجديدة.' : 'يبدأ بحرف إنجليزي ويقبل الأحرف الإنجليزية والأرقام فقط.'}
            />
            <div className="rounded-lg px-3 py-2" style={{ background: 'var(--surface-2)' }}>
              <div className="text-xs" style={{ color: 'var(--text-3)' }}>معرّف الدخول النهائي</div>
              <code className="font-bold" dir="ltr" style={{ color: 'var(--brand)' }}>{preview || selected?.username || `${loginPrefix ?? 'ABT'}-ibrahimakel`}</code>
            </div>
            <TextField label="رقم الهاتف" required dir="ltr" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="05xxxxxxxx" />
            <TextField label="المسمى الوظيفي / الصفة" value={form.jobTitle} onChange={(event) => setForm({ ...form, jobTitle: event.target.value })} placeholder="مثال: أمين سر المركز" />
            <PasswordField label={mode === 'edit' ? 'كلمة مرور جديدة' : 'كلمة المرور'} required={mode === 'create'} dir="ltr" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={mode === 'edit' ? 'اتركها فارغة لعدم التغيير' : '••••••'} />
            {error && <div className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</div>}
          </div>
        )}

        {mode === 'delete' && (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>
              سيُحذف <strong>{selected?.name}</strong> نهائيًا، وستصبح التكليفات والاستحقاقات والمسؤوليات المرتبطة به بلا مكلّف.
            </p>
            <div className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>لا يمكن التراجع عن هذا الإجراء.</div>
            {error && <div className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</div>}
          </div>
        )}
      </Modal>
    </>
  )
}

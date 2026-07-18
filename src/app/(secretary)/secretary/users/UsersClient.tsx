'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Users, Pencil, Power, Loader2, Phone, Trash2, KeyRound } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { PasswordField, TextField, SelectField } from '@/components/ui/Field'
import { apiSend } from '@/lib/client'
import { ROLE_LABELS, type UserRole } from '@/types'

interface Row {
  id: string
  name: string
  username: string
  identifierCode: string
  role: string
  jobTitle: string | null
  phone: string | null
  email: string | null
  isActive: boolean
}

interface AvailableIdentifier {
  id: string
  code: string
}

const ROLE_OPTIONS = (Object.keys(ROLE_LABELS) as UserRole[])
  .filter((role) => role !== 'SUPER_USER')
  .map((role) => ({ value: role, label: ROLE_LABELS[role] }))

const ROLE_TONE: Record<string, [string, string]> = {
  SECRETARY: ['var(--brand-soft)', 'var(--brand)'],
  CHAIR: ['var(--gold-bg)', 'var(--gold-dark)'],
  DEPT_MANAGER: ['var(--info-bg)', 'var(--info)'],
  MEMBER: ['var(--surface-3)', 'var(--text-2)'],
}

const emptyForm = { name: '', identifierId: '', password: '', role: 'MEMBER', jobTitle: '', phone: '' }

export default function UsersClient({ users, availableIdentifiers, meId }: { users: Row[]; availableIdentifiers: AvailableIdentifier[]; meId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)

  function openCreate() {
    setEditing(null)
    setError('')
    setForm({ ...emptyForm, identifierId: availableIdentifiers[0]?.id ?? '' })
    setOpen(true)
  }

  function openEdit(user: Row) {
    setEditing(user)
    setError('')
    setForm({ name: user.name, identifierId: '', password: '', role: user.role, jobTitle: user.jobTitle ?? '', phone: user.phone ?? '' })
    setOpen(true)
  }

  async function save() {
    setSaving(true)
    setError('')
    const res = editing
      ? await apiSend(`/api/users/${editing.id}`, 'PATCH', {
          name: form.name,
          role: form.role,
          jobTitle: form.jobTitle,
          phone: form.phone,
          ...(form.password ? { password: form.password } : {}),
        })
      : await apiSend('/api/users', 'POST', form)
    setSaving(false)
    if (!res.success) return setError(res.error ?? 'تعذّر الحفظ')
    setOpen(false)
    router.refresh()
  }

  async function toggleActive(user: Row) {
    setError('')
    const res = await apiSend(`/api/users/${user.id}`, 'PATCH', { isActive: !user.isActive })
    if (!res.success) return setError(res.error ?? 'تعذر تحديث المستخدم')
    router.refresh()
  }

  async function deleteUser() {
    if (!deleteTarget) return
    setSaving(true)
    setError('')
    const res = await apiSend(`/api/users/${deleteTarget.id}`, 'DELETE')
    setSaving(false)
    if (!res.success) return setError(res.error ?? 'تعذر حذف المستخدم')
    setDeleteTarget(null)
    router.refresh()
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="المستخدمون"
        subtitle="إضافة الأعضاء بمعرفات صادرة من السوبر يوزر وإدارة حالتهم وصلاحياتهم."
        action={<button className="btn btn-primary" onClick={openCreate} disabled={availableIdentifiers.length === 0} title={availableIdentifiers.length ? 'إضافة مستخدم' : 'يجب أن يصدر السوبر يوزر معرفًا أولًا'}><UserPlus size={18} /> إضافة مستخدم</button>}
      />

      {availableIdentifiers.length === 0 && (
        <div className="mb-3 rounded-lg px-3 py-2 text-sm flex items-center gap-2" style={{ background: 'var(--gold-bg)', color: 'var(--gold-dark)' }}>
          <KeyRound size={16} /> لا توجد معرفات متاحة. اطلب من السوبر يوزر إصدار معرف جديد لهذا المركز.
        </div>
      )}
      {error && !open && !deleteTarget && <div className="mb-3 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</div>}

      {users.length === 0 ? (
        <div className="card"><EmptyState icon={Users} title="لا يوجد مستخدمون بعد" hint="ابدأ بإضافة أعضاء المجلس بعد إصدار معرفاتهم." /></div>
      ) : (
        <div className="card divide-y" style={{ borderColor: 'var(--border)' }}>
          {users.map((user) => {
            const [bg, fg] = ROLE_TONE[user.role] ?? ROLE_TONE.MEMBER
            return (
              <div key={user.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0" style={{ background: 'var(--gold-bg)', color: 'var(--gold-dark)' }}>{user.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{user.name}</span>
                    {!user.isActive && <span className="badge" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>مجمّد</span>}
                  </div>
                  <div className="text-xs mt-0.5 flex items-center gap-2 flex-wrap" style={{ color: 'var(--text-3)' }}>
                    <span className="flex items-center gap-1" dir="ltr"><KeyRound size={11} /> {user.identifierCode}</span>
                    {user.jobTitle && <span>· {user.jobTitle}</span>}
                    {user.phone && <span className="flex items-center gap-1" dir="ltr"><Phone size={11} /> {user.phone}</span>}
                  </div>
                </div>
                <span className="badge" style={{ background: bg, color: fg }}>{ROLE_LABELS[user.role as UserRole] ?? user.role}</span>
                <button className="btn btn-ghost px-2.5 py-1.5" onClick={() => openEdit(user)} title="تعديل"><Pencil size={15} /></button>
                {user.id !== meId && <>
                  <button className="btn btn-ghost px-2.5 py-1.5" onClick={() => toggleActive(user)} title={user.isActive ? 'تجميد' : 'إعادة تفعيل'} style={{ color: user.isActive ? 'var(--warning)' : 'var(--success)' }}><Power size={15} /></button>
                  <button className="btn btn-ghost px-2.5 py-1.5" onClick={() => { setError(''); setDeleteTarget(user) }} title="حذف نهائي" style={{ color: 'var(--danger)' }}><Trash2 size={15} /></button>
                </>}
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'تعديل مستخدم' : 'إضافة مستخدم'}
        footer={<><button className="btn btn-ghost" onClick={() => setOpen(false)} disabled={saving}>إلغاء</button><button className="btn btn-primary" onClick={save} disabled={saving || (!editing && !form.identifierId)}>{saving && <Loader2 size={16} className="animate-spin" />} حفظ</button></>}
      >
        <div className="space-y-4">
          <TextField label="الاسم الكامل" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: عبدالله الأمين" />
          {editing ? (
            <TextField label="المعرّف" dir="ltr" value={editing.identifierCode} disabled hint="المعرّف ثابت ولا يمكن تغييره" />
          ) : (
            <SelectField label="المعرّف" required dir="ltr" value={form.identifierId} onChange={(e) => setForm({ ...form, identifierId: e.target.value })} options={availableIdentifiers.map((identifier) => ({ value: identifier.id, label: identifier.code }))} placeholder="اختر معرفًا متاحًا" hint="يصدر المعرّف من السوبر يوزر ويستخدم لتسجيل الدخول" />
          )}
          <PasswordField label={editing ? 'كلمة مرور جديدة' : 'كلمة المرور'} required={!editing} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editing ? 'اترك فارغًا لعدم التغيير' : '••••••'} />
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="الدور" required options={ROLE_OPTIONS} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
            <TextField label="الجوال" required dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="05xxxxxxxx" />
          </div>
          <TextField label="المسمى الوظيفي / الصفة" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} placeholder="مثال: مسؤول لجنة التعليم" />
          {error && <div className="text-sm rounded-lg px-3 py-2" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</div>}
        </div>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="حذف المستخدم نهائيًا"
        footer={<><button className="btn btn-ghost" onClick={() => setDeleteTarget(null)} disabled={saving}>إلغاء</button><button className="btn" onClick={deleteUser} disabled={saving} style={{ background: 'var(--danger)', color: 'white' }}>{saving && <Loader2 size={16} className="animate-spin" />} حذف المستخدم</button></>}
      >
        <div className="space-y-3">
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>سيُحذف <strong>{deleteTarget?.name}</strong> نهائيًا، وتصبح تكليفاته واستحقاقاته ومسؤولياته بلا مكلف. ستبقى المحاضر والمتابعات التاريخية محفوظة باسم «مستخدم محذوف».</p>
          <div className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>لا يمكن التراجع عن هذا الإجراء.</div>
          {error && <div className="text-sm rounded-lg px-3 py-2" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</div>}
        </div>
      </Modal>
    </div>
  )
}

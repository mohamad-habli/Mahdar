'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Users, Pencil, Power, Loader2, Phone } from 'lucide-react'
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
  role: string
  jobTitle: string | null
  phone: string | null
  email: string | null
  isActive: boolean
}

const ROLE_OPTIONS = (Object.keys(ROLE_LABELS) as UserRole[]).map((r) => ({
  value: r,
  label: ROLE_LABELS[r],
}))

const ROLE_TONE: Record<string, [string, string]> = {
  SECRETARY: ['var(--brand-soft)', 'var(--brand)'],
  CHAIR: ['var(--gold-bg)', 'var(--gold-dark)'],
  DEPT_MANAGER: ['var(--info-bg)', 'var(--info)'],
  MEMBER: ['var(--surface-3)', 'var(--text-2)'],
}

export default function UsersClient({ users, meId }: { users: Row[]; meId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '',
    role: 'MEMBER',
    jobTitle: '',
    phone: '',
  })

  function openCreate() {
    setEditing(null)
    setError('')
    setForm({ name: '', username: '', password: '', role: 'MEMBER', jobTitle: '', phone: '' })
    setOpen(true)
  }

  function openEdit(u: Row) {
    setEditing(u)
    setError('')
    setForm({
      name: u.name,
      username: u.username,
      password: '',
      role: u.role,
      jobTitle: u.jobTitle ?? '',
      phone: u.phone ?? '',
    })
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
    if (!res.success) {
      setError(res.error ?? 'تعذّر الحفظ')
      return
    }
    setOpen(false)
    router.refresh()
  }

  async function toggleActive(u: Row) {
    await apiSend(`/api/users/${u.id}`, 'PATCH', { isActive: !u.isActive })
    router.refresh()
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="المستخدمون"
        subtitle="أضِف أعضاء المجلس وحدّد أدوارهم وصلاحياتهم."
        action={
          <button className="btn btn-primary" onClick={openCreate}>
            <UserPlus size={18} /> إضافة مستخدم
          </button>
        }
      />

      {users.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Users}
            title="لا يوجد مستخدمون بعد"
            hint="ابدأ بإضافة أعضاء المجلس ومسؤولي اللجان."
            action={
              <button className="btn btn-primary" onClick={openCreate}>
                <UserPlus size={18} /> إضافة مستخدم
              </button>
            }
          />
        </div>
      ) : (
        <div className="card divide-y" style={{ borderColor: 'var(--border)' }}>
          {users.map((u) => {
            const [bg, fg] = ROLE_TONE[u.role] ?? ROLE_TONE.MEMBER
            return (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0"
                  style={{ background: 'var(--gold-bg)', color: 'var(--gold-dark)' }}
                >
                  {u.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
                      {u.name}
                    </span>
                    {!u.isActive && (
                      <span className="badge" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
                        معطّل
                      </span>
                    )}
                  </div>
                  <div className="text-xs mt-0.5 flex items-center gap-2 flex-wrap" style={{ color: 'var(--text-3)' }}>
                    <span dir="ltr">@{u.username}</span>
                    {u.jobTitle && <span>· {u.jobTitle}</span>}
                    {u.phone && (
                      <span className="flex items-center gap-1" dir="ltr">
                        <Phone size={11} /> {u.phone}
                      </span>
                    )}
                  </div>
                </div>
                <span className="badge" style={{ background: bg, color: fg }}>
                  {ROLE_LABELS[u.role as UserRole] ?? u.role}
                </span>
                <button
                  className="btn btn-ghost px-2.5 py-1.5"
                  onClick={() => openEdit(u)}
                  title="تعديل"
                >
                  <Pencil size={15} />
                </button>
                {u.id !== meId && (
                  <button
                    className="btn btn-ghost px-2.5 py-1.5"
                    onClick={() => toggleActive(u)}
                    title={u.isActive ? 'تعطيل' : 'تفعيل'}
                    style={u.isActive ? { color: 'var(--danger)' } : { color: 'var(--success)' }}
                  >
                    <Power size={15} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'تعديل مستخدم' : 'إضافة مستخدم'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setOpen(false)} disabled={saving}>
              إلغاء
            </button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving && <Loader2 size={16} className="animate-spin" />}
              حفظ
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <TextField
            label="الاسم الكامل"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="مثال: عبدالله الأمين"
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="اسم المستخدم"
              required
              dir="ltr"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="amin"
              disabled={!!editing}
              hint={editing ? 'لا يمكن تغييره' : 'إنجليزي وأرقام'}
            />
            <PasswordField
              label={editing ? 'كلمة مرور جديدة' : 'كلمة المرور'}
              required={!editing}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={editing ? 'اترك فارغًا لعدم التغيير' : '••••••'}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="الدور"
              required
              options={ROLE_OPTIONS}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            />
            <TextField
              label="الجوال"
              dir="ltr"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="05xxxxxxxx"
            />
          </div>
          <TextField
            label="المسمى الوظيفي / الصفة"
            value={form.jobTitle}
            onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
            placeholder="مثال: مسؤول لجنة التعليم"
          />
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

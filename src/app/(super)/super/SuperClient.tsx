'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Plus, Loader2, Users } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/ui/Modal'
import { TextField } from '@/components/ui/Field'
import { apiSend } from '@/lib/client'

interface OrganizationRow {
  id: string
  name: string
  usersCount: number
  councilsCount: number
}

export default function SuperClient({ organizations }: { organizations: OrganizationRow[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', secretaryName: '', secretaryUsername: '', secretaryPassword: '' })

  async function create() {
    setSaving(true); setError('')
    const res = await apiSend('/api/organizations', 'POST', form)
    setSaving(false)
    if (!res.success) { setError(res.error ?? 'تعذر الحفظ'); return }
    setOpen(false)
    setForm({ name: '', secretaryName: '', secretaryUsername: '', secretaryPassword: '' })
    router.refresh()
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="إدارة المراكز"
        subtitle="إنشاء المراكز وتعيين أمناء السر."
        action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={18} /> مركز جديد</button>}
      />

      <div className="grid md:grid-cols-2 gap-3">
        {organizations.map((org) => (
          <div key={org.id} className="card p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                <Building2 size={20} />
              </div>
              <div className="flex-1">
                <div className="font-bold" style={{ color: 'var(--text-1)' }}>{org.name}</div>
                <div className="text-xs mt-1 flex gap-3" style={{ color: 'var(--text-3)' }}>
                  <span className="flex items-center gap-1"><Users size={12} /> {org.usersCount} مستخدم</span>
                  <span>{org.councilsCount} مجلس/لجنة</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="مركز جديد"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setOpen(false)} disabled={saving}>إلغاء</button>
          <button className="btn btn-primary" onClick={create} disabled={saving}>{saving && <Loader2 size={16} className="animate-spin" />} إنشاء</button>
        </>}
      >
        <div className="space-y-3">
          <TextField label="اسم المركز" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField label="اسم أمين السر" required value={form.secretaryName} onChange={(e) => setForm({ ...form, secretaryName: e.target.value })} />
          <TextField label="اسم المستخدم" required dir="ltr" value={form.secretaryUsername} onChange={(e) => setForm({ ...form, secretaryUsername: e.target.value })} />
          <TextField label="كلمة المرور" required type="password" dir="ltr" value={form.secretaryPassword} onChange={(e) => setForm({ ...form, secretaryPassword: e.target.value })} />
          {error && <div className="text-sm rounded-lg px-3 py-2" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</div>}
        </div>
      </Modal>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Plus, Loader2, Users, KeyRound, Power, Trash2, Copy, Check } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/ui/Modal'
import { PasswordField, TextField } from '@/components/ui/Field'
import { apiSend } from '@/lib/client'

interface IdentifierRow {
  id: string
  code: string
  isActive: boolean
  assignedUser: { id: string; name: string } | null
}

interface OrganizationRow {
  id: string
  name: string
  isActive: boolean
  isCurrent: boolean
  usersCount: number
  councilsCount: number
  identifiers: IdentifierRow[]
}

const emptyForm = {
  name: '',
  secretaryName: '',
  secretaryIdentifier: '',
  secretaryPhone: '',
  secretaryPassword: '',
}

function generatedIdentifier() {
  return `MHD-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

export default function SuperClient({ organizations }: { organizations: OrganizationRow[] }) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [identifiersFor, setIdentifiersFor] = useState<OrganizationRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OrganizationRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [newIdentifier, setNewIdentifier] = useState('')
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [copied, setCopied] = useState('')

  async function createOrganization() {
    setSaving(true)
    setError('')
    const res = await apiSend('/api/organizations', 'POST', form)
    setSaving(false)
    if (!res.success) return setError(res.error ?? 'تعذر إنشاء المركز')
    setCreateOpen(false)
    setForm(emptyForm)
    router.refresh()
  }

  async function toggleOrganization(organization: OrganizationRow) {
    setError('')
    const res = await apiSend(`/api/organizations/${organization.id}`, 'PATCH', { isActive: !organization.isActive })
    if (!res.success) return setError(res.error ?? 'تعذر تحديث المركز')
    router.refresh()
  }

  async function deleteOrganization() {
    if (!deleteTarget) return
    setSaving(true)
    setError('')
    const res = await apiSend(`/api/organizations/${deleteTarget.id}`, 'DELETE', { confirmation: deleteConfirmation })
    setSaving(false)
    if (!res.success) return setError(res.error ?? 'تعذر حذف المركز')
    setDeleteTarget(null)
    setDeleteConfirmation('')
    router.refresh()
  }

  async function createIdentifier() {
    if (!identifiersFor) return
    setSaving(true)
    setError('')
    const res = await apiSend(`/api/organizations/${identifiersFor.id}/identifiers`, 'POST', { code: newIdentifier })
    setSaving(false)
    if (!res.success) return setError(res.error ?? 'تعذر إنشاء المعرّف')
    setNewIdentifier('')
    setIdentifiersFor(null)
    router.refresh()
  }

  async function deleteIdentifier(identifierId: string) {
    if (!identifiersFor) return
    setError('')
    const res = await apiSend(`/api/organizations/${identifiersFor.id}/identifiers/${identifierId}`, 'DELETE')
    if (!res.success) return setError(res.error ?? 'تعذر حذف المعرّف')
    setIdentifiersFor(null)
    router.refresh()
  }

  async function copyIdentifier(code: string) {
    await navigator.clipboard.writeText(code)
    setCopied(code)
    window.setTimeout(() => setCopied(''), 1500)
  }

  function openCreate() {
    setError('')
    setForm({ ...emptyForm, secretaryIdentifier: generatedIdentifier() })
    setCreateOpen(true)
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="إدارة المراكز"
        subtitle="إنشاء المراكز، إصدار معرفات المستخدمين، والتحكم في حالة كل مركز."
        action={<button className="btn btn-primary" onClick={openCreate}><Plus size={18} /> مركز جديد</button>}
      />

      {error && !createOpen && !identifiersFor && !deleteTarget && (
        <div className="mb-3 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {organizations.map((org) => (
          <div key={org.id} className="card p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                <Building2 size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-bold" style={{ color: 'var(--text-1)' }}>{org.name}</div>
                  {!org.isActive && <span className="badge" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>مجمّد</span>}
                  {org.isCurrent && <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>مركز النظام</span>}
                </div>
                <div className="text-xs mt-1 flex gap-3 flex-wrap" style={{ color: 'var(--text-3)' }}>
                  <span className="flex items-center gap-1"><Users size={12} /> {org.usersCount} مستخدم</span>
                  <span>{org.councilsCount} مجلس/لجنة</span>
                  <span>{org.identifiers.filter((item) => !item.assignedUser).length} معرف متاح</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t flex items-center gap-2 flex-wrap" style={{ borderColor: 'var(--border)' }}>
              <button className="btn btn-ghost text-sm" onClick={() => { setError(''); setNewIdentifier(generatedIdentifier()); setIdentifiersFor(org) }}>
                <KeyRound size={16} /> المعرفات
              </button>
              <button className="btn btn-ghost text-sm" onClick={() => toggleOrganization(org)} style={{ color: org.isActive ? 'var(--warning)' : 'var(--success)' }}>
                <Power size={16} /> {org.isActive ? 'تجميد' : 'إعادة تفعيل'}
              </button>
              <button
                className="btn btn-ghost text-sm"
                onClick={() => { setError(''); setDeleteConfirmation(''); setDeleteTarget(org) }}
                disabled={org.isCurrent}
                title={org.isCurrent ? 'لا يمكن حذف المركز الذي يحتوي حسابك' : 'حذف المركز نهائيًا'}
                style={{ color: 'var(--danger)', marginInlineStart: 'auto' }}
              >
                <Trash2 size={16} /> حذف
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="مركز جديد"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setCreateOpen(false)} disabled={saving}>إلغاء</button>
          <button className="btn btn-primary" onClick={createOrganization} disabled={saving}>{saving && <Loader2 size={16} className="animate-spin" />} إنشاء</button>
        </>}
      >
        <div className="space-y-3">
          <TextField label="اسم المركز" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField label="اسم أمين السر" required value={form.secretaryName} onChange={(e) => setForm({ ...form, secretaryName: e.target.value })} />
          <div className="flex items-end gap-2">
            <TextField className="flex-1" label="معرّف أمين السر" required dir="ltr" value={form.secretaryIdentifier} onChange={(e) => setForm({ ...form, secretaryIdentifier: e.target.value.toUpperCase() })} hint="يستخدم لتسجيل الدخول" />
            <button className="btn btn-ghost mb-0.5" type="button" onClick={() => setForm({ ...form, secretaryIdentifier: generatedIdentifier() })}><KeyRound size={16} /> توليد</button>
          </div>
          <TextField label="رقم هاتف أمين السر" required dir="ltr" value={form.secretaryPhone} onChange={(e) => setForm({ ...form, secretaryPhone: e.target.value })} />
          <PasswordField label="كلمة المرور" required dir="ltr" value={form.secretaryPassword} onChange={(e) => setForm({ ...form, secretaryPassword: e.target.value })} />
          {error && <div className="text-sm rounded-lg px-3 py-2" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</div>}
        </div>
      </Modal>

      <Modal
        open={!!identifiersFor}
        onClose={() => setIdentifiersFor(null)}
        title={`معرفات ${identifiersFor?.name ?? ''}`}
        footer={<button className="btn btn-ghost" onClick={() => setIdentifiersFor(null)}>إغلاق</button>}
      >
        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <TextField className="flex-1" label="معرّف جديد" required dir="ltr" value={newIdentifier} onChange={(e) => setNewIdentifier(e.target.value.toUpperCase())} />
            <button className="btn btn-ghost mb-0.5" type="button" onClick={() => setNewIdentifier(generatedIdentifier())} title="توليد معرف"><KeyRound size={17} /></button>
            <button className="btn btn-primary mb-0.5" onClick={createIdentifier} disabled={saving || !newIdentifier}>{saving && <Loader2 size={16} className="animate-spin" />} إضافة</button>
          </div>
          <div className="divide-y border rounded-lg" style={{ borderColor: 'var(--border)' }}>
            {identifiersFor?.identifiers.length ? identifiersFor.identifiers.map((identifier) => (
              <div key={identifier.id} className="flex items-center gap-2 px-3 py-2.5">
                <code className="font-semibold" dir="ltr">{identifier.code}</code>
                <span className="text-xs flex-1" style={{ color: 'var(--text-3)' }}>{identifier.assignedUser ? `مستخدم بواسطة ${identifier.assignedUser.name}` : 'متاح'}</span>
                <button className="btn btn-ghost px-2" onClick={() => copyIdentifier(identifier.code)} title="نسخ المعرّف">{copied === identifier.code ? <Check size={15} /> : <Copy size={15} />}</button>
                {!identifier.assignedUser && <button className="btn btn-ghost px-2" onClick={() => deleteIdentifier(identifier.id)} title="حذف المعرّف" style={{ color: 'var(--danger)' }}><Trash2 size={15} /></button>}
              </div>
            )) : <div className="px-3 py-5 text-center text-sm" style={{ color: 'var(--text-3)' }}>لا توجد معرفات بعد.</div>}
          </div>
          {error && <div className="text-sm rounded-lg px-3 py-2" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</div>}
        </div>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="حذف المركز نهائيًا"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)} disabled={saving}>إلغاء</button>
          <button className="btn" onClick={deleteOrganization} disabled={saving || deleteConfirmation !== deleteTarget?.name} style={{ background: 'var(--danger)', color: 'white' }}>{saving && <Loader2 size={16} className="animate-spin" />} حذف نهائي</button>
        </>}
      >
        <div className="space-y-3">
          <div className="rounded-lg px-3 py-3 text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
            سيُحذف المركز وجميع مجالسه ومحاضره وتكليفاته واستحقاقاته ومستخدميه وملفاته. لا يمكن التراجع عن هذا الإجراء.
          </div>
          <TextField label={`اكتب «${deleteTarget?.name ?? ''}» للتأكيد`} value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} autoComplete="off" />
          {error && <div className="text-sm rounded-lg px-3 py-2" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</div>}
        </div>
      </Modal>
    </div>
  )
}

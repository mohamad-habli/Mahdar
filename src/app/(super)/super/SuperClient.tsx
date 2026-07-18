'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Plus, Loader2, Users, KeyRound, Power, Trash2 } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/ui/Modal'
import { PasswordField, TextField } from '@/components/ui/Field'
import { apiSend } from '@/lib/client'

interface OrganizationRow {
  id: string
  name: string
  loginPrefix: string | null
  isActive: boolean
  isCurrent: boolean
  usersCount: number
  councilsCount: number
}

const emptyForm = {
  name: '',
  centerIdentifier: '',
  secretaryName: '',
  secretaryUsername: '',
  secretaryPhone: '',
  secretaryPassword: '',
}

function finalLogin(prefix: string, loginName: string) {
  if (!prefix.trim() || !loginName.trim()) return ''
  return `${prefix.trim().toUpperCase()}-${loginName.trim().toLowerCase()}`
}

export default function SuperClient({ organizations }: { organizations: OrganizationRow[] }) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [prefixTarget, setPrefixTarget] = useState<OrganizationRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OrganizationRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [prefixValue, setPrefixValue] = useState('')
  const [deleteConfirmation, setDeleteConfirmation] = useState('')

  async function createOrganization() {
    setSaving(true)
    setError('')
    const result = await apiSend('/api/organizations', 'POST', form)
    setSaving(false)
    if (!result.success) return setError(result.error ?? 'تعذر إنشاء المركز')
    setCreateOpen(false)
    setForm(emptyForm)
    router.refresh()
  }

  async function savePrefix() {
    if (!prefixTarget) return
    setSaving(true)
    setError('')
    const result = await apiSend(`/api/organizations/${prefixTarget.id}`, 'PATCH', { loginPrefix: prefixValue })
    setSaving(false)
    if (!result.success) return setError(result.error ?? 'تعذر حفظ معرّف المركز')
    setPrefixTarget(null)
    router.refresh()
  }

  async function toggleOrganization(organization: OrganizationRow) {
    setError('')
    const result = await apiSend(`/api/organizations/${organization.id}`, 'PATCH', { isActive: !organization.isActive })
    if (!result.success) return setError(result.error ?? 'تعذر تحديث المركز')
    router.refresh()
  }

  async function deleteOrganization() {
    if (!deleteTarget) return
    setSaving(true)
    setError('')
    const result = await apiSend(`/api/organizations/${deleteTarget.id}`, 'DELETE', { confirmation: deleteConfirmation })
    setSaving(false)
    if (!result.success) return setError(result.error ?? 'تعذر حذف المركز')
    setDeleteTarget(null)
    setDeleteConfirmation('')
    router.refresh()
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="إدارة المراكز"
        subtitle="تحديد معرّف كل مركز وإدارة حالته وحساب أمين السر."
        action={<button className="btn btn-primary" onClick={() => { setError(''); setForm(emptyForm); setCreateOpen(true) }}><Plus size={18} /> مركز جديد</button>}
      />

      {error && !createOpen && !prefixTarget && !deleteTarget && (
        <div className="mb-3 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {organizations.map((organization) => (
          <div key={organization.id} className="card p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}><Building2 size={20} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-bold" style={{ color: 'var(--text-1)' }}>{organization.name}</div>
                  {organization.loginPrefix && <code className="badge" dir="ltr" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>{organization.loginPrefix}</code>}
                  {!organization.isActive && <span className="badge" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>مجمّد</span>}
                  {organization.isCurrent && <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>مركز النظام</span>}
                </div>
                <div className="text-xs mt-1 flex gap-3 flex-wrap" style={{ color: 'var(--text-3)' }}>
                  <span className="flex items-center gap-1"><Users size={12} /> {organization.usersCount} مستخدم</span>
                  <span>{organization.councilsCount} مجلس/لجنة</span>
                  {!organization.loginPrefix && <span style={{ color: 'var(--warning)' }}>المعرّف غير محدد</span>}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t flex items-center gap-2 flex-wrap" style={{ borderColor: 'var(--border)' }}>
              <button className="btn btn-ghost text-sm" onClick={() => { setError(''); setPrefixValue(organization.loginPrefix ?? ''); setPrefixTarget(organization) }}><KeyRound size={16} /> معرّف المركز</button>
              <button className="btn btn-ghost text-sm" onClick={() => toggleOrganization(organization)} style={{ color: organization.isActive ? 'var(--warning)' : 'var(--success)' }}><Power size={16} /> {organization.isActive ? 'تجميد' : 'إعادة تفعيل'}</button>
              <button className="btn btn-ghost text-sm" onClick={() => { setError(''); setDeleteConfirmation(''); setDeleteTarget(organization) }} disabled={organization.isCurrent} title={organization.isCurrent ? 'لا يمكن حذف المركز الذي يحتوي حسابك' : 'حذف المركز نهائيًا'} style={{ color: 'var(--danger)', marginInlineStart: 'auto' }}><Trash2 size={16} /> حذف</button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="مركز جديد"
        footer={<><button className="btn btn-ghost" onClick={() => setCreateOpen(false)} disabled={saving}>إلغاء</button><button className="btn btn-primary" onClick={createOrganization} disabled={saving}>{saving && <Loader2 size={16} className="animate-spin" />} إنشاء</button></>}
      >
        <div className="space-y-3">
          <TextField label="اسم المركز" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <TextField label="معرّف المركز" required dir="ltr" value={form.centerIdentifier} onChange={(event) => setForm({ ...form, centerIdentifier: event.target.value.toUpperCase() })} placeholder="ABT" hint="حرفان إلى 10 أحرف إنجليزية كبيرة أو أرقام، ويظهر قبل أسماء مستخدمي المركز" />
          <TextField label="اسم أمين السر" required value={form.secretaryName} onChange={(event) => setForm({ ...form, secretaryName: event.target.value })} />
          <TextField label="اسم مستخدم أمين السر بالإنجليزية" required dir="ltr" value={form.secretaryUsername} onChange={(event) => setForm({ ...form, secretaryUsername: event.target.value.replace(/[^a-zA-Z0-9]/g, '') })} placeholder="IbrahimAkel" hint="يبدأ بحرف إنجليزي ويقبل الأحرف الإنجليزية والأرقام فقط" />
          <div className="rounded-lg px-3 py-2" style={{ background: 'var(--surface-2)' }}>
            <div className="text-xs" style={{ color: 'var(--text-3)' }}>معرّف الدخول النهائي</div>
            <code className="font-bold" dir="ltr" style={{ color: 'var(--brand)' }}>{finalLogin(form.centerIdentifier, form.secretaryUsername) || 'ABT-ibrahimakel'}</code>
          </div>
          <TextField label="رقم هاتف أمين السر" required dir="ltr" value={form.secretaryPhone} onChange={(event) => setForm({ ...form, secretaryPhone: event.target.value })} />
          <PasswordField label="كلمة المرور" required dir="ltr" value={form.secretaryPassword} onChange={(event) => setForm({ ...form, secretaryPassword: event.target.value })} />
          {error && <div className="text-sm rounded-lg px-3 py-2" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</div>}
        </div>
      </Modal>

      <Modal
        open={!!prefixTarget}
        onClose={() => setPrefixTarget(null)}
        title={`معرّف مركز ${prefixTarget?.name ?? ''}`}
        footer={<><button className="btn btn-ghost" onClick={() => setPrefixTarget(null)} disabled={saving}>إلغاء</button><button className="btn btn-primary" onClick={savePrefix} disabled={saving || !prefixValue.trim()}>{saving && <Loader2 size={16} className="animate-spin" />} حفظ</button></>}
      >
        <div className="space-y-3">
          <TextField label="معرّف المركز" required dir="ltr" value={prefixValue} onChange={(event) => setPrefixValue(event.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())} placeholder="ABT" hint="سيظهر قبل اسم المستخدم: ABT-username. تغيير المعرّف يحدّث حسابات المركز التي تستخدم الصيغة الجديدة." />
          {error && <div className="text-sm rounded-lg px-3 py-2" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</div>}
        </div>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="حذف المركز نهائيًا"
        footer={<><button className="btn btn-ghost" onClick={() => setDeleteTarget(null)} disabled={saving}>إلغاء</button><button className="btn" onClick={deleteOrganization} disabled={saving || deleteConfirmation !== deleteTarget?.name} style={{ background: 'var(--danger)', color: 'white' }}>{saving && <Loader2 size={16} className="animate-spin" />} حذف نهائي</button></>}
      >
        <div className="space-y-3">
          <div className="rounded-lg px-3 py-3 text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>سيُحذف المركز وجميع مجالسه ومحاضره وتكليفاته واستحقاقاته ومستخدميه وملفاته. لا يمكن التراجع.</div>
          <TextField label={`اكتب «${deleteTarget?.name ?? ''}» للتأكيد`} value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} autoComplete="off" />
          {error && <div className="text-sm rounded-lg px-3 py-2" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</div>}
        </div>
      </Modal>
    </div>
  )
}

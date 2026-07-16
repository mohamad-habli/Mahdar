'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  Users,
  Building2,
  UserPlus,
  Plus,
  Trash2,
  Repeat,
  Clock,
  MapPin,
  Loader2,
  ClipboardList,
  FolderKanban,
  Pencil,
  Archive,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { TextField, TextAreaField, SelectField } from '@/components/ui/Field'
import { apiSend } from '@/lib/client'
import { ROLE_LABELS, type UserRole } from '@/types'
import { weekDayName } from '@/lib/utils'

interface Council {
  id: string
  name: string
  type: string
  description: string | null
  recurrence: string
  recurrenceDay: number | null
  defaultStartTime: string | null
  defaultEndTime: string | null
  defaultLocation: string | null
  chairId: string | null
  chairName: string | null
  isActive: boolean
}
interface Member {
  id: string
  userId: string
  name: string
  role: string
  membershipType: string
  roleInCouncil: string | null
}
interface Dept {
  id: string
  name: string
  description: string | null
  managerId: string | null
  managerName: string | null
  taskCount: number
  projectCount: number
  memberIds: string[]
  memberNames: string[]
  isActive: boolean
}
interface OrgUser {
  id: string
  name: string
  role: string
}

const RECURRENCE_LABEL: Record<string, string> = { NONE: 'بدون تكرار', WEEKLY: 'أسبوعي', MONTHLY: 'شهري' }

export default function CouncilDetailClient({
  council,
  members,
  departments,
  orgUsers,
}: {
  council: Council
  members: Member[]
  departments: Dept[]
  orgUsers: OrgUser[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [councilModal, setCouncilModal] = useState(false)
  const [councilErr, setCouncilErr] = useState('')
  const [councilForm, setCouncilForm] = useState({
    name: council.name,
    type: council.type,
    description: council.description ?? '',
    chairId: council.chairId ?? '',
    isActive: council.isActive,
  })

  async function saveCouncil() {
    setBusy(true); setCouncilErr('')
    const res = await apiSend(`/api/councils/${council.id}`, 'PATCH', {
      ...councilForm,
      chairId: councilForm.chairId || null,
    })
    setBusy(false)
    if (!res.success) { setCouncilErr(res.error ?? 'تعذّر الحفظ'); return }
    setCouncilModal(false)
    router.refresh()
  }

  async function archiveCouncil() {
    if (!confirm('حذف المجلس إن كان فارغًا، أو أرشفته مع الحفاظ على كل بياناته إن كان مستخدمًا؟')) return
    const res = await apiSend<{ archived: boolean; message?: string }>(`/api/councils/${council.id}`, 'DELETE')
    if (!res.success) { alert(res.error); return }
    if (res.data?.message) alert(res.data.message)
    router.push('/secretary/councils')
    router.refresh()
  }

  // ===== إضافة عضو =====
  const [memberModal, setMemberModal] = useState(false)
  const [memberForm, setMemberForm] = useState({ userId: '', membershipType: 'PERMANENT', roleInCouncil: '' })
  const [memberErr, setMemberErr] = useState('')

  const availableUsers = orgUsers.filter((u) => !members.some((m) => m.userId === u.id))

  async function addMember() {
    if (!memberForm.userId) { setMemberErr('اختر المستخدم'); return }
    setBusy(true); setMemberErr('')
    const res = await apiSend('/api/council-members', 'POST', { councilId: council.id, ...memberForm })
    setBusy(false)
    if (!res.success) { setMemberErr(res.error ?? 'تعذّر الحفظ'); return }
    setMemberModal(false)
    setMemberForm({ userId: '', membershipType: 'PERMANENT', roleInCouncil: '' })
    router.refresh()
  }

  async function removeMember(id: string) {
    if (!confirm('إزالة هذا العضو من المجلس؟')) return
    await apiSend(`/api/council-members/${id}`, 'DELETE')
    router.refresh()
  }

  // ===== قسم =====
  const [deptModal, setDeptModal] = useState(false)
  const [editingDept, setEditingDept] = useState<Dept | null>(null)
  const [deptForm, setDeptForm] = useState({ name: '', description: '', managerId: '', memberIds: [] as string[], isActive: true })
  const [deptErr, setDeptErr] = useState('')

  function openAddDept() {
    setEditingDept(null)
    setDeptForm({ name: '', description: '', managerId: '', memberIds: [], isActive: true })
    setDeptErr('')
    setDeptModal(true)
  }

  function openEditDept(dept: Dept) {
    setEditingDept(dept)
    setDeptForm({
      name: dept.name,
      description: dept.description ?? '',
      managerId: dept.managerId ?? '',
      memberIds: dept.memberIds,
      isActive: dept.isActive,
    })
    setDeptErr('')
    setDeptModal(true)
  }

  async function saveDept() {
    setBusy(true); setDeptErr('')
    const payload = {
      name: deptForm.name,
      description: deptForm.description,
      managerId: deptForm.managerId || null,
      memberIds: deptForm.memberIds,
      isActive: deptForm.isActive,
    }
    const res = editingDept
      ? await apiSend(`/api/departments/${editingDept.id}`, 'PATCH', payload)
      : await apiSend('/api/departments', 'POST', { councilId: council.id, ...payload })
    setBusy(false)
    if (!res.success) { setDeptErr(res.error ?? 'تعذّر الحفظ'); return }
    setDeptModal(false)
    setDeptForm({ name: '', description: '', managerId: '', memberIds: [], isActive: true })
    router.refresh()
  }

  async function removeDept(id: string) {
    if (!confirm('حذف القسم إن كان فارغًا، أو أرشفته مع الحفاظ على بياناته إن كان مستخدمًا؟')) return
    const res = await apiSend<{ archived: boolean; message?: string }>(`/api/departments/${id}`, 'DELETE')
    if (!res.success) alert(res.error)
    else if (res.data?.message) alert(res.data.message)
    router.refresh()
  }

  const userOptions = orgUsers.map((u) => ({ value: u.id, label: `${u.name} — ${ROLE_LABELS[u.role as UserRole] ?? u.role}` }))
  const availableUserOptions = availableUsers.map((u) => ({ value: u.id, label: `${u.name} — ${ROLE_LABELS[u.role as UserRole] ?? u.role}` }))

  return (
    <div className="max-w-5xl mx-auto">
      <Link href="/secretary/councils" className="inline-flex items-center gap-1.5 text-sm mb-4" style={{ color: 'var(--text-2)' }}>
        <ArrowRight size={16} /> المجالس واللجان
      </Link>

      {/* رأس المجلس */}
      <div className="card p-5 mb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
          <h1 className="text-xl lg:text-2xl font-bold" style={{ color: 'var(--text-1)' }}>{council.name}</h1>
          <span className="badge" style={{ background: 'var(--gold-bg)', color: 'var(--gold-dark)' }}>
            {council.type === 'COMMITTEE' ? 'لجنة' : 'مجلس'}
          </span>
          {!council.isActive && <span className="badge" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>مؤرشف</span>}
          </div>
          {council.chairName && <p className="text-xs mb-2" style={{ color: 'var(--text-3)' }}>رئيس المجلس: {council.chairName}</p>}
          </div>
          <div className="flex gap-2">
            <button className="btn btn-ghost px-3" onClick={() => setCouncilModal(true)} title="تعديل المجلس"><Pencil size={16} /></button>
            <button className="btn btn-ghost px-3" onClick={archiveCouncil} title="حذف أو أرشفة" style={{ color: 'var(--danger)' }}><Archive size={16} /></button>
          </div>
        </div>
        {council.description && <p className="text-sm mb-3" style={{ color: 'var(--text-2)' }}>{council.description}</p>}
        <div className="flex items-center gap-4 text-xs flex-wrap" style={{ color: 'var(--text-3)' }}>
          {council.recurrence !== 'NONE' && (
            <span className="flex items-center gap-1">
              <Repeat size={13} /> {RECURRENCE_LABEL[council.recurrence]}
              {council.recurrence === 'WEEKLY' && council.recurrenceDay != null ? ` · ${weekDayName(council.recurrenceDay)}` : ''}
              {council.recurrence === 'MONTHLY' && council.recurrenceDay != null ? ` · يوم ${council.recurrenceDay}` : ''}
            </span>
          )}
          {(council.defaultStartTime || council.defaultEndTime) && (
            <span className="flex items-center gap-1" dir="ltr"><Clock size={13} /> {council.defaultStartTime} - {council.defaultEndTime}</span>
          )}
          {council.defaultLocation && <span className="flex items-center gap-1"><MapPin size={13} /> {council.defaultLocation}</span>}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* الأعضاء */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <Users size={18} style={{ color: 'var(--brand)' }} />
              <h3 className="font-bold" style={{ color: 'var(--text-1)' }}>الأعضاء</h3>
              <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>{members.length}</span>
            </div>
            <button className="btn btn-ghost px-3 py-1.5 text-sm" onClick={() => { setMemberErr(''); setMemberModal(true) }}>
              <UserPlus size={15} /> إضافة
            </button>
          </div>
          {members.length === 0 ? (
            <EmptyState icon={Users} title="لا أعضاء بعد" hint="أضف الأعضاء الدائمين والضيوف." />
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {members.map((m) => (
                <div key={m.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold shrink-0" style={{ background: 'var(--gold-bg)', color: 'var(--gold-dark)' }}>
                    {m.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-1)' }}>{m.name}</div>
                    <div className="text-xs" style={{ color: 'var(--text-3)' }}>
                      {m.roleInCouncil || ROLE_LABELS[m.role as UserRole]}
                    </div>
                  </div>
                  <span className="badge" style={m.membershipType === 'GUEST'
                    ? { background: 'var(--surface-3)', color: 'var(--text-2)' }
                    : { background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                    {m.membershipType === 'GUEST' ? 'ضيف' : 'دائم'}
                  </span>
                  <button className="btn btn-ghost px-2 py-1.5" style={{ color: 'var(--danger)' }} onClick={() => removeMember(m.id)} title="إزالة">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* الأقسام */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <Building2 size={18} style={{ color: 'var(--brand)' }} />
              <h3 className="font-bold" style={{ color: 'var(--text-1)' }}>الأقسام واللجان</h3>
              <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>{departments.length}</span>
            </div>
            <button className="btn btn-ghost px-3 py-1.5 text-sm" onClick={openAddDept}>
              <Plus size={15} /> إضافة
            </button>
          </div>
          {departments.length === 0 ? (
            <EmptyState icon={Building2} title="لا أقسام بعد" hint="أنشئ الأقسام واللجان وعيّن مسؤوليها." />
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {departments.map((d) => (
                <div key={d.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
                    <Building2 size={17} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-1)' }}>{d.name}</div>
                    <div className="text-xs flex items-center gap-2 flex-wrap" style={{ color: 'var(--text-3)' }}>
                      <span>{d.managerName ? `المسؤول: ${d.managerName}` : 'بلا مسؤول'}</span>
                      <span>{d.memberNames.length} عضو</span>
                      <span className="flex items-center gap-1"><ClipboardList size={11} /> {d.taskCount}</span>
                      <span className="flex items-center gap-1"><FolderKanban size={11} /> {d.projectCount}</span>
                    </div>
                  </div>
                  <button className="btn btn-ghost px-2 py-1.5" onClick={() => openEditDept(d)} title="تعديل"><Pencil size={15} /></button>
                  <button className="btn btn-ghost px-2 py-1.5" style={{ color: 'var(--danger)' }} onClick={() => removeDept(d.id)} title="حذف أو أرشفة">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* مودال العضو */}
      <Modal
        open={memberModal}
        onClose={() => setMemberModal(false)}
        title="إضافة عضو"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setMemberModal(false)} disabled={busy}>إلغاء</button>
            <button className="btn btn-primary" onClick={addMember} disabled={busy}>
              {busy && <Loader2 size={16} className="animate-spin" />} إضافة
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {availableUserOptions.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>كل المستخدمين أعضاء بالفعل. أضِف مستخدمين جددًا من صفحة المستخدمين.</p>
          ) : (
            <>
              <SelectField label="المستخدم" required placeholder="اختر مستخدمًا" options={availableUserOptions}
                value={memberForm.userId} onChange={(e) => setMemberForm({ ...memberForm, userId: e.target.value })} />
              <SelectField label="نوع العضوية" options={[{ value: 'PERMANENT', label: 'عضو دائم' }, { value: 'GUEST', label: 'ضيف' }]}
                value={memberForm.membershipType} onChange={(e) => setMemberForm({ ...memberForm, membershipType: e.target.value })} />
              <TextField label="الصفة في المجلس" value={memberForm.roleInCouncil}
                onChange={(e) => setMemberForm({ ...memberForm, roleInCouncil: e.target.value })} placeholder="رئيس / أمين السر / عضو" />
            </>
          )}
          {memberErr && <div className="text-sm rounded-lg px-3 py-2" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{memberErr}</div>}
        </div>
      </Modal>

      <Modal
        open={councilModal}
        onClose={() => setCouncilModal(false)}
        title="تعديل المجلس / اللجنة"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setCouncilModal(false)} disabled={busy}>إلغاء</button>
          <button className="btn btn-primary" onClick={saveCouncil} disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />} حفظ</button>
        </>}
      >
        <div className="space-y-4">
          <TextField label="الاسم" required value={councilForm.name} onChange={(e) => setCouncilForm({ ...councilForm, name: e.target.value })} />
          <SelectField label="النوع" options={[{ value: 'COUNCIL', label: 'مجلس' }, { value: 'COMMITTEE', label: 'لجنة' }]} value={councilForm.type} onChange={(e) => setCouncilForm({ ...councilForm, type: e.target.value })} />
          <SelectField label="الرئيس / المسؤول" placeholder="بلا رئيس محدد" options={userOptions} value={councilForm.chairId} onChange={(e) => setCouncilForm({ ...councilForm, chairId: e.target.value })} />
          <TextAreaField label="الوصف" value={councilForm.description} onChange={(e) => setCouncilForm({ ...councilForm, description: e.target.value })} />
          <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
            <input type="checkbox" checked={councilForm.isActive} onChange={(e) => setCouncilForm({ ...councilForm, isActive: e.target.checked })} />
            مجلس نشط
          </label>
          {councilErr && <div className="text-sm rounded-lg px-3 py-2" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{councilErr}</div>}
        </div>
      </Modal>

      {/* مودال القسم */}
      <Modal
        open={deptModal}
        onClose={() => setDeptModal(false)}
        title={editingDept ? 'تعديل القسم / المجموعة' : 'إضافة قسم / لجنة فرعية'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setDeptModal(false)} disabled={busy}>إلغاء</button>
            <button className="btn btn-primary" onClick={saveDept} disabled={busy}>
              {busy && <Loader2 size={16} className="animate-spin" />} حفظ
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <TextField label="اسم القسم" required value={deptForm.name}
            onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} placeholder="مثال: لجنة التعليم" />
          <SelectField label="المسؤول" placeholder="بلا مسؤول" options={userOptions}
            value={deptForm.managerId} onChange={(e) => setDeptForm({ ...deptForm, managerId: e.target.value })}
            hint="يمكن لمسؤول القسم متابعة تكليفاته وتحديث حالتها." />
          <TextAreaField label="وصف" value={deptForm.description}
            onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })} />
          <div>
            <div className="text-sm font-semibold mb-2" style={{ color: 'var(--text-2)' }}>أعضاء القسم</div>
            <div className="flex flex-wrap gap-2">
              {orgUsers.map((user) => {
                const selected = deptForm.memberIds.includes(user.id)
                return (
                  <button
                    key={user.id}
                    type="button"
                    className="badge"
                    style={selected ? { background: 'var(--brand)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--text-2)' }}
                    onClick={() => setDeptForm({
                      ...deptForm,
                      memberIds: selected ? deptForm.memberIds.filter((id) => id !== user.id) : [...deptForm.memberIds, user.id],
                    })}
                  >
                    {user.name}
                  </button>
                )
              })}
            </div>
          </div>
          {editingDept && (
            <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
              <input type="checkbox" checked={deptForm.isActive} onChange={(e) => setDeptForm({ ...deptForm, isActive: e.target.checked })} />
              قسم نشط
            </label>
          )}
          {deptErr && <div className="text-sm rounded-lg px-3 py-2" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{deptErr}</div>}
        </div>
      </Modal>
    </div>
  )
}

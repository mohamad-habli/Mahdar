'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronDown, ChevronLeft, Network, Building2, FolderKanban,
  Gavel, ClipboardList, Wallet, User, Milestone,
  ExternalLink,
} from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import { TaskStatusBadge } from '@/components/badges'
import TaskDetailModal from '@/components/tasks/TaskDetailModal'
import { formatMoney } from '@/lib/utils'
import { PAYMENT_STATUS_LABELS, type PaymentStatus } from '@/types'
import type { TreeCouncil, TreeDept, TreeProject, TreeDecision, TreeCost, TreeDeliverable } from '@/lib/tree'
import type { TaskFull } from '@/lib/tasks'

export default function TreeClient({ councils }: { councils: TreeCouncil[] }) {
  const [selected, setSelected] = useState<TaskFull | null>(null)

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="شجرة المتابعة" subtitle="المجلس ← القسم/اللجنة ← الاستحقاق ← التكليفات ← المتابعات ← الحالة." />

      {councils.length === 0 ? (
        <div className="card"><EmptyState icon={Network} title="لا بيانات بعد" hint="أنشئ مجلسًا وأقسامًا لعرض الشجرة." /></div>
      ) : (
        <div className="card p-3 space-y-1">
          {councils.map((c) => <CouncilNode key={c.id} c={c} onTask={setSelected} />)}
        </div>
      )}

      <TaskDetailModal task={selected} canUpdate onClose={() => setSelected(null)} />
    </div>
  )
}

function Row({ depth, open, onToggle, icon, color, label, badge, onClick }: {
  depth: number; open?: boolean; onToggle?: () => void; icon: React.ReactNode; color: string
  label: React.ReactNode; badge?: React.ReactNode; onClick?: () => void
}) {
  const pad = 8 + depth * 18
  return (
    <div
      className="flex items-center gap-2 py-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
      style={{ paddingRight: pad, paddingLeft: 8 }}
      onClick={onClick ?? onToggle}
    >
      {onToggle ? (
        <span style={{ color: 'var(--text-3)' }}>{open ? <ChevronDown size={15} /> : <ChevronLeft size={15} />}</span>
      ) : <span className="w-[15px]" />}
      <span className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--surface-2)', color }}>{icon}</span>
      <span className="flex-1 min-w-0 text-sm truncate" style={{ color: 'var(--text-1)' }}>{label}</span>
      {badge}
    </div>
  )
}

function CouncilNode({ c, onTask }: { c: TreeCouncil; onTask: (t: TaskFull) => void }) {
  const [open, setOpen] = useState(true)
  return (
    <div>
      <Row depth={0} open={open} onToggle={() => setOpen(!open)} icon={<Network size={14} />} color="var(--brand)"
        label={<span className="font-bold">{c.name}</span>}
        badge={<span className="badge" style={{ background: 'var(--gold-bg)', color: 'var(--gold-dark)' }}>{c.type === 'COMMITTEE' ? 'لجنة' : 'مجلس'}</span>} />
      {open && c.departments.map((d) => <DeptNode key={d.id} d={d} onTask={onTask} />)}
      {open && c.departments.length === 0 && <Empty depth={1} text="لا أقسام" />}
    </div>
  )
}

function DeptNode({ d, onTask }: { d: TreeDept; onTask: (t: TaskFull) => void }) {
  const [open, setOpen] = useState(true)
  const total = d.projects.length + d.deliverables.length + d.tasks.length + d.costs.length + d.decisions.length
  return (
    <div>
      <Row depth={1} open={open} onToggle={() => setOpen(!open)} icon={<Building2 size={14} />} color="var(--info)"
        label={<span className="font-semibold">{d.name}</span>}
        badge={d.managerName ? <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-3)' }}><User size={11} /> {d.managerName}</span> : undefined} />
      {open && (
        <>
          {d.deliverables.map((x) => <DeliverableNode key={x.id} d={x} onTask={onTask} />)}
          {d.projects.map((p) => <ProjectNode key={p.id} p={p} onTask={onTask} />)}
          {d.decisions.map((x) => <DecisionRow key={x.id} x={x} depth={2} />)}
          {d.tasks.map((t) => <TaskLeaf key={t.id} t={t} depth={2} onTask={onTask} />)}
          {d.costs.map((x) => <CostRow key={x.id} x={x} depth={2} />)}
          {total === 0 && <Empty depth={2} text="لا عناصر" />}
        </>
      )}
    </div>
  )
}

function DeliverableNode({ d, onTask }: { d: TreeDeliverable; onTask: (t: TaskFull) => void }) {
  const [open, setOpen] = useState(true)
  return (
    <div>
      <Row depth={2} open={open} onToggle={() => setOpen(!open)} icon={<Milestone size={14} />} color="var(--gold-dark)"
        label={<span className="font-medium flex items-center gap-2"><span className="truncate">{d.title}</span><Link href={`/secretary/deliverables?selected=${d.id}`} onClick={(event) => event.stopPropagation()} className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: 'var(--gold-bg)', color: 'var(--gold-dark)' }} title="فتح الاستحقاق"><ExternalLink size={13} /></Link></span>}
        badge={<span className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-3)' }}>
          {d.ownerName && <span className="flex items-center gap-1"><User size={11} /> {d.ownerName}</span>}
          <TaskStatusBadge status={d.status} />
        </span>} />
      {open && (
        <>
          {d.tasks.map((t) => <TaskLeaf key={t.id} t={t} depth={3} onTask={onTask} />)}
          {d.tasks.length === 0 && <Empty depth={3} text="لا تكليفات فرعية" />}
        </>
      )}
    </div>
  )
}

function ProjectNode({ p, onTask }: { p: TreeProject; onTask: (t: TaskFull) => void }) {
  const [open, setOpen] = useState(true)
  return (
    <div>
      <Row depth={2} open={open} onToggle={() => setOpen(!open)} icon={<FolderKanban size={14} />} color="var(--gold-dark)"
        label={<span className="font-medium">{p.name}</span>} />
      {open && (
        <>
          {p.decisions.map((x) => <DecisionRow key={x.id} x={x} depth={3} />)}
          {p.tasks.map((t) => <TaskLeaf key={t.id} t={t} depth={3} onTask={onTask} />)}
          {p.costs.map((x) => <CostRow key={x.id} x={x} depth={3} />)}
          {p.decisions.length + p.tasks.length + p.costs.length === 0 && <Empty depth={3} text="لا عناصر" />}
        </>
      )}
    </div>
  )
}

function DecisionRow({ x, depth }: { x: TreeDecision; depth: number }) {
  return <Row depth={depth} icon={<Gavel size={14} />} color="var(--brand)" label={x.title || x.content} />
}

function TaskLeaf({ t, depth, onTask }: { t: TaskFull; depth: number; onTask: (t: TaskFull) => void }) {
  return <Row depth={depth} icon={<ClipboardList size={14} />} color="var(--info)" onClick={() => onTask(t)}
    label={t.title} badge={<TaskStatusBadge status={t.status} />} />
}

function CostRow({ x, depth }: { x: TreeCost; depth: number }) {
  return <Row depth={depth} icon={<Wallet size={14} />} color="var(--success)" label={x.description}
    badge={<span className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-3)' }}>
      <span dir="ltr">{formatMoney(x.actualAmount ?? x.expectedAmount, x.currency)}</span>
      <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>{PAYMENT_STATUS_LABELS[x.paymentStatus as PaymentStatus]}</span>
    </span>} />
}

function Empty({ depth, text }: { depth: number; text: string }) {
  return <div className="text-xs py-1.5" style={{ paddingRight: 8 + depth * 18 + 23, color: 'var(--text-3)' }}>{text}</div>
}

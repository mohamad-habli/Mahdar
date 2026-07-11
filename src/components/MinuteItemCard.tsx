import {
  MessageSquare, Gavel, ClipboardList, Eye, Wallet, StickyNote, Vote,
  Building2, User, CalendarClock, Milestone, type LucideIcon,
} from 'lucide-react'
import { formatDate, formatMoney } from '@/lib/utils'
import {
  MINUTE_ITEM_LABELS, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, PAYMENT_STATUS_LABELS,
  MINUTE_ITEM_OUTCOME_LABELS,
  type MinuteItemType, type TaskStatus, type TaskPriority, type PaymentStatus, type MinuteItemOutcome,
} from '@/types'

export interface MinuteItemData {
  id: string
  order: number
  type: string
  title: string | null
  content: string
  outcome: string
  settledAt: string | null
  settlementNote: string | null
  carriedFrom: { id: string; title: string | null; content: string } | null
  departmentName: string | null
  projectName: string | null
  voteResult: string | null
  votesFor: number | null
  votesAgainst: number | null
  votesAbstain: number | null
  task: { assigneeName: string | null; assigneeNames: string[]; dueDate: string | null; priority: string; status: string } | null
  deliverable: { title: string; ownerName: string | null; dueDate: string | null; status: string } | null
  cost: { expectedAmount: number | null; actualAmount: number | null; currency: string; paymentStatus: string } | null
}

const TYPE_META: Record<MinuteItemType, { icon: LucideIcon; bg: string; fg: string }> = {
  DISCUSSION: { icon: MessageSquare, bg: 'var(--surface-3)', fg: 'var(--text-2)' },
  DECISION: { icon: Gavel, bg: 'var(--brand-soft)', fg: 'var(--brand)' },
  TASK: { icon: ClipboardList, bg: 'var(--info-bg)', fg: 'var(--info)' },
  DELIVERABLE: { icon: Milestone, bg: 'var(--gold-bg)', fg: 'var(--gold-dark)' },
  FOLLOWUP: { icon: Eye, bg: 'var(--gold-bg)', fg: 'var(--gold-dark)' },
  COST: { icon: Wallet, bg: 'var(--success-bg)', fg: 'var(--success)' },
  NOTE: { icon: StickyNote, bg: 'var(--surface-3)', fg: 'var(--text-2)' },
  VOTE: { icon: Vote, bg: 'var(--warning-bg)', fg: 'var(--warning)' },
}

export default function MinuteItemCard({ item }: { item: MinuteItemData }) {
  const meta = TYPE_META[item.type as MinuteItemType] ?? TYPE_META.NOTE
  const Icon = meta.icon

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: meta.bg, color: meta.fg }}>
          <Icon size={18} />
        </div>
      </div>
      <div className="flex-1 min-w-0 pb-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="badge" style={{ background: meta.bg, color: meta.fg }}>
            {MINUTE_ITEM_LABELS[item.type as MinuteItemType] ?? item.type}
          </span>
          <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>
            {MINUTE_ITEM_OUTCOME_LABELS[item.outcome as MinuteItemOutcome] ?? item.outcome}
          </span>
          {item.title && <span className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>{item.title}</span>}
          {item.departmentName && (
            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-3)' }}>
              <Building2 size={12} /> {item.departmentName}{item.projectName ? ` · ${item.projectName}` : ''}
            </span>
          )}
        </div>
        <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-2)' }}>{item.content}</p>
        {item.carriedFrom && (
          <p className="text-xs mt-1" style={{ color: 'var(--gold-dark)' }}>
            مرحلة من بند سابق: {item.carriedFrom.title || item.carriedFrom.content.slice(0, 70)}
          </p>
        )}

        {/* تصويت */}
        {item.type === 'VOTE' && (
          <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
            {item.voteResult && (
              <span className="badge" style={item.voteResult === 'APPROVED'
                ? { background: 'var(--success-bg)', color: 'var(--success)' }
                : { background: 'var(--danger-bg)', color: 'var(--danger)' }}>
                {item.voteResult === 'APPROVED' ? 'اعتُمد' : 'رُفض'}
              </span>
            )}
            <span style={{ color: 'var(--text-3)' }} dir="ltr">
              {item.votesFor ?? 0} موافق · {item.votesAgainst ?? 0} معارض · {item.votesAbstain ?? 0} ممتنع
            </span>
          </div>
        )}

        {/* تكليف متولّد */}
        {item.task && (
          <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg text-xs flex-wrap" style={{ background: 'var(--surface-2)' }}>
            <ClipboardList size={13} style={{ color: 'var(--info)' }} />
            <span className="font-semibold" style={{ color: 'var(--text-2)' }}>تكليف</span>
            {(item.task.assigneeNames.length > 0 || item.task.assigneeName) && <span className="flex items-center gap-1" style={{ color: 'var(--text-3)' }}><User size={11} /> {item.task.assigneeNames.join('، ') || item.task.assigneeName}</span>}
            {item.task.dueDate && <span className="flex items-center gap-1" style={{ color: 'var(--text-3)' }}><CalendarClock size={11} /> {formatDate(item.task.dueDate)}</span>}
            <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>{TASK_PRIORITY_LABELS[item.task.priority as TaskPriority]}</span>
            <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>{TASK_STATUS_LABELS[item.task.status as TaskStatus]}</span>
          </div>
        )}

        {item.deliverable && (
          <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg text-xs flex-wrap" style={{ background: 'var(--surface-2)' }}>
            <Milestone size={13} style={{ color: 'var(--gold-dark)' }} />
            <span className="font-semibold" style={{ color: 'var(--text-2)' }}>استحقاق</span>
            <span style={{ color: 'var(--text-3)' }}>{item.deliverable.title}</span>
            {item.deliverable.ownerName && <span className="flex items-center gap-1" style={{ color: 'var(--text-3)' }}><User size={11} /> {item.deliverable.ownerName}</span>}
            {item.deliverable.dueDate && <span className="flex items-center gap-1" style={{ color: 'var(--text-3)' }}><CalendarClock size={11} /> {formatDate(item.deliverable.dueDate)}</span>}
            <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>{TASK_STATUS_LABELS[item.deliverable.status as TaskStatus]}</span>
          </div>
        )}

        {/* تكلفة متولّدة */}
        {item.cost && (
          <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg text-xs flex-wrap" style={{ background: 'var(--surface-2)' }}>
            <Wallet size={13} style={{ color: 'var(--success)' }} />
            <span className="font-semibold" style={{ color: 'var(--text-2)' }}>تكلفة</span>
            <span style={{ color: 'var(--text-3)' }}>متوقع {formatMoney(item.cost.expectedAmount, item.cost.currency)}</span>
            <span style={{ color: 'var(--text-3)' }}>· فعلي {formatMoney(item.cost.actualAmount, item.cost.currency)}</span>
            <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>{PAYMENT_STATUS_LABELS[item.cost.paymentStatus as PaymentStatus]}</span>
          </div>
        )}
      </div>
    </div>
  )
}

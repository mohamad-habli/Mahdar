import type { LucideIcon } from 'lucide-react'

interface Props {
  label: string
  value: string | number
  icon: LucideIcon
  tone?: 'brand' | 'gold' | 'success' | 'warning' | 'danger' | 'info'
  hint?: string
}

const TONES: Record<
  NonNullable<Props['tone']>,
  { bg: string; fg: string }
> = {
  brand: { bg: 'var(--brand-soft)', fg: 'var(--brand)' },
  gold: { bg: 'var(--gold-bg)', fg: 'var(--gold-dark)' },
  success: { bg: 'var(--success-bg)', fg: 'var(--success)' },
  warning: { bg: 'var(--warning-bg)', fg: 'var(--warning)' },
  danger: { bg: 'var(--danger-bg)', fg: 'var(--danger)' },
  info: { bg: 'var(--info-bg)', fg: 'var(--info)' },
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'brand',
  hint,
}: Props) {
  const t = TONES[tone]
  return (
    <div className="card p-4 flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: t.bg, color: t.fg }}
      >
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold leading-none" style={{ color: 'var(--text-1)' }}>
          {value}
        </div>
        <div className="text-sm mt-1 leading-tight" style={{ color: 'var(--text-2)' }}>
          {label}
        </div>
        {hint && (
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
            {hint}
          </div>
        )}
      </div>
    </div>
  )
}

import type { LucideIcon } from 'lucide-react'

export default function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon
  title: string
  hint?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-4">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--surface-2)', color: 'var(--text-3)' }}
      >
        <Icon size={26} />
      </div>
      <h3 className="font-bold mb-1" style={{ color: 'var(--text-1)' }}>
        {title}
      </h3>
      {hint && (
        <p className="text-sm max-w-xs mb-4" style={{ color: 'var(--text-3)' }}>
          {hint}
        </p>
      )}
      {action}
    </div>
  )
}

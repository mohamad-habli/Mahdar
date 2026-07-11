interface Props {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export default function PageHeader({ title, subtitle, action }: Props) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold" style={{ color: 'var(--text-1)' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}

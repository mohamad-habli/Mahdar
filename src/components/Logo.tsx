// شعار «محضر» — وثيقة (المحضر) مع علامة إنجاز، تجسيدًا لـ«من المحضر إلى الإنجاز».
export default function Logo({
  size = 24,
  color = 'currentColor',
}: {
  size?: number
  color?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* ورقة المحضر مع زاوية مطويّة */}
      <path d="M6 3.4h7.4L18 8v9.6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5.4a2 2 0 0 1 2-2Z" />
      <path d="M13.4 3.4V8H18" />
      {/* بنود المحضر */}
      <path d="M7.7 10.6h4.6" />
      <path d="M7.7 13.1h3" />
      {/* علامة الإنجاز */}
      <path d="M7.5 16.7l1.7 1.7 3.6-3.6" />
    </svg>
  )
}

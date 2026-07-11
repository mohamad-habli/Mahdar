import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// دمج أصناف Tailwind بأمان
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ====== تنسيق التواريخ والأرقام ======
// عربي لأسماء الأشهر، لكن بأرقام إنجليزية (لاتينية) دائمًا
const AR = 'ar-EG-u-nu-latn'

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(AR, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(AR, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

export function formatTime(time?: string | null): string {
  return time ?? '—'
}

export function formatMoney(amount?: number | null, currency = 'USD'): string {
  if (amount == null) return '—'
  // أرقام إنجليزية ورمز الدولار بشكل واضح ($1,234)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

const WEEK_DAYS_AR = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
]

export function weekDayName(dayIndex: number): string {
  return WEEK_DAYS_AR[dayIndex] ?? ''
}

// هل التاريخ متأخر عن اليوم؟
export function isOverdue(date?: Date | string | null): boolean {
  if (!date) return false
  const d = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}

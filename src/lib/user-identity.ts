const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'

export const IDENTIFIER_PATTERN = /^[A-Z0-9_.-]+$/

export function normalizeIdentifier(value: string) {
  return value.trim().toUpperCase()
}

export function normalizePersonName(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

export function normalizePhone(value: string) {
  const latinDigits = value
    .trim()
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))

  const hasLeadingPlus = latinDigits.startsWith('+')
  const digits = latinDigits.replace(/\D/g, '')
  return hasLeadingPlus ? `+${digits}` : digits
}


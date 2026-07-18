const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'

export const CENTER_PREFIX_PATTERN = /^[A-Z0-9]{2,10}$/
export const LOGIN_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9]{2,39}$/

export function normalizeCenterPrefix(value: string) {
  return value.trim().toUpperCase()
}

export function normalizeLoginName(value: string) {
  return value.trim().toLowerCase()
}

export function buildLoginIdentifier(prefix: string, loginName: string) {
  return `${normalizeCenterPrefix(prefix)}-${normalizeLoginName(loginName)}`
}

export function normalizeLoginIdentifier(value: string) {
  const normalized = value.trim()
  const separatorIndex = normalized.indexOf('-')

  if (separatorIndex > 0) {
    const prefix = normalized.slice(0, separatorIndex)
    const loginName = normalized.slice(separatorIndex + 1)

    if (CENTER_PREFIX_PATTERN.test(prefix.toUpperCase()) && LOGIN_NAME_PATTERN.test(loginName)) {
      return buildLoginIdentifier(prefix, loginName)
    }
  }

  return normalized.toLowerCase()
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

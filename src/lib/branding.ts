export const REPORT_THEMES = ['CLASSIC', 'INDIGO_GOLD', 'MONO', 'MODERN'] as const
export type ReportTheme = (typeof REPORT_THEMES)[number]

export interface OrganizationBranding {
  reportTheme: ReportTheme
  primaryColor: string
  secondaryColor: string
  reportStyle: 'COMPACT' | 'BALANCED' | 'SPACIOUS'
}

export const DEFAULT_BRANDING: OrganizationBranding = {
  reportTheme: 'INDIGO_GOLD',
  primaryColor: '#1E2A4A',
  secondaryColor: '#C9A23F',
  reportStyle: 'BALANCED',
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

export function parseOrganizationBranding(settings: string | null | undefined): OrganizationBranding {
  try {
    const value = JSON.parse(settings || '{}') as Partial<OrganizationBranding>
    return {
      reportTheme: REPORT_THEMES.includes(value.reportTheme as ReportTheme) ? value.reportTheme as ReportTheme : DEFAULT_BRANDING.reportTheme,
      primaryColor: HEX_COLOR.test(value.primaryColor ?? '') ? value.primaryColor as string : DEFAULT_BRANDING.primaryColor,
      secondaryColor: HEX_COLOR.test(value.secondaryColor ?? '') ? value.secondaryColor as string : DEFAULT_BRANDING.secondaryColor,
      reportStyle: ['COMPACT', 'BALANCED', 'SPACIOUS'].includes(value.reportStyle ?? '') ? value.reportStyle as OrganizationBranding['reportStyle'] : DEFAULT_BRANDING.reportStyle,
    }
  } catch {
    return DEFAULT_BRANDING
  }
}

export function mergeOrganizationSettings(current: string, branding: OrganizationBranding): string {
  let settings: Record<string, unknown> = {}
  try {
    settings = JSON.parse(current || '{}') as Record<string, unknown>
  } catch {
    settings = {}
  }
  return JSON.stringify({ ...settings, ...branding })
}

export const REPORT_THEME_LABELS: Record<ReportTheme, string> = {
  CLASSIC: 'رسمي كلاسيكي',
  INDIGO_GOLD: 'نيلي وذهبي',
  MONO: 'أبيض وأسود',
  MODERN: 'إداري حديث',
}

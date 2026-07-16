import { requireUser } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { parseOrganizationBranding } from '@/lib/branding'
import BrandingSettingsClient from './BrandingSettingsClient'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const me = await requireUser(['SECRETARY'])
  const organization = await prisma.organization.findUniqueOrThrow({ where: { id: me.organizationId } })
  return (
    <BrandingSettingsClient
      initial={{ name: organization.name, logoUrl: organization.logoUrl, ...parseOrganizationBranding(organization.settings) }}
    />
  )
}

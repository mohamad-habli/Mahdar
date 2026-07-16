import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorize, handle, ok } from '@/lib/api'
import { logAudit } from '@/lib/audit'
import { mergeOrganizationSettings, parseOrganizationBranding } from '@/lib/branding'

const schema = z.object({
  name: z.string().trim().min(2, 'اسم المركز مطلوب'),
  reportTheme: z.enum(['CLASSIC', 'INDIGO_GOLD', 'MONO', 'MODERN']),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'اللون الرئيسي غير صالح'),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'اللون الثانوي غير صالح'),
  reportStyle: z.enum(['COMPACT', 'BALANCED', 'SPACIOUS']),
})

export async function PATCH(req: Request) {
  return handle(async () => {
    const me = await authorize(['SECRETARY', 'SUPER_USER'])
    const body = schema.parse(await req.json())
    const organization = await prisma.organization.findUniqueOrThrow({ where: { id: me.organizationId } })
    const branding = {
      reportTheme: body.reportTheme,
      primaryColor: body.primaryColor,
      secondaryColor: body.secondaryColor,
      reportStyle: body.reportStyle,
    }
    await prisma.organization.update({
      where: { id: me.organizationId },
      data: { name: body.name, settings: mergeOrganizationSettings(organization.settings, branding) },
    })
    await logAudit({
      organizationId: me.organizationId,
      userId: me.id,
      action: 'UPDATE',
      entityType: 'OrganizationBranding',
      entityId: me.organizationId,
      details: { ...branding, name: body.name },
    })
    return ok({ ...branding, name: body.name, logoUrl: organization.logoUrl })
  })
}

export async function GET() {
  return handle(async () => {
    const me = await authorize(['SECRETARY', 'SUPER_USER'])
    const organization = await prisma.organization.findUniqueOrThrow({ where: { id: me.organizationId } })
    return ok({ name: organization.name, logoUrl: organization.logoUrl, ...parseOrganizationBranding(organization.settings) })
  })
}

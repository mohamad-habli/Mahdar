import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { prisma } from '@/lib/prisma'
import { authorize, handle, ok, ApiError } from '@/lib/api'
import { logAudit } from '@/lib/audit'
import { deleteUploadedLogo, organizationLogoPath, uploadsRoot } from '@/lib/uploads'

const MAX_LOGO_BYTES = 2 * 1024 * 1024
const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/svg+xml': 'svg',
}

function validateImageBytes(extension: string, bytes: Buffer) {
  if (extension === 'png' && !bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    throw new ApiError('ملف PNG غير صالح', 400)
  }
  if (extension === 'jpg' && !(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)) {
    throw new ApiError('ملف JPG غير صالح', 400)
  }
  if (extension === 'svg') {
    const source = bytes.toString('utf8')
    const unsafeElement = /<\s*(?:script|iframe|object|embed|foreignObject)\b/i
    const eventHandler = /\bon[a-z]+\s*=/i
    const unsafeUrl = /(?:href|xlink:href)\s*=\s*["']?\s*(?:javascript:|data:text\/html)/i
    if (!/<\s*svg\b/i.test(source) || unsafeElement.test(source) || eventHandler.test(source) || unsafeUrl.test(source)) {
      throw new ApiError('ملف SVG يحتوي على محتوى غير آمن', 400)
    }
  }
}

export async function POST(req: Request) {
  return handle(async () => {
    const me = await authorize(['SECRETARY', 'SUPER_USER'])
    const data = await req.formData()
    const file = data.get('logo')
    if (!(file instanceof File)) throw new ApiError('اختر ملف شعار', 400)
    const extension = EXTENSIONS[file.type]
    if (!extension) throw new ApiError('صيغة الشعار يجب أن تكون PNG أو JPG أو SVG', 400)
    if (file.size > MAX_LOGO_BYTES) throw new ApiError('حجم الشعار يجب ألا يتجاوز 2MB', 400)

    const bytes = Buffer.from(await file.arrayBuffer())
    validateImageBytes(extension, bytes)

    const filename = `logo-${Date.now()}.${extension}`
    const target = organizationLogoPath(uploadsRoot(), me.organizationId, filename)
    if (!target) throw new ApiError('تعذر تجهيز مسار الشعار', 400)
    const directory = path.dirname(target)
    await mkdir(directory, { recursive: true })
    await writeFile(target, bytes, { flag: 'wx' })
    const logoUrl = `/uploads/organizations/${me.organizationId}/${filename}`
    const organization = await prisma.organization.findUniqueOrThrow({ where: { id: me.organizationId }, select: { logoUrl: true } })
    try {
      await prisma.organization.update({ where: { id: me.organizationId }, data: { logoUrl } })
    } catch (error) {
      await unlink(target).catch(() => undefined)
      throw error
    }
    await deleteUploadedLogo(organization.logoUrl).catch((error) => console.error('[LOGO CLEANUP]', error))
    await logAudit({ organizationId: me.organizationId, userId: me.id, action: 'UPDATE', entityType: 'OrganizationLogo', entityId: me.organizationId, details: { logoUrl } })
    return ok({ logoUrl })
  })
}

export async function DELETE() {
  return handle(async () => {
    const me = await authorize(['SECRETARY', 'SUPER_USER'])
    const organization = await prisma.organization.findUniqueOrThrow({ where: { id: me.organizationId }, select: { logoUrl: true } })
    await prisma.organization.update({ where: { id: me.organizationId }, data: { logoUrl: null } })
    await deleteUploadedLogo(organization.logoUrl)
    await logAudit({ organizationId: me.organizationId, userId: me.id, action: 'DELETE', entityType: 'OrganizationLogo', entityId: me.organizationId })
    return ok({ logoUrl: null })
  })
}

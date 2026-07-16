import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { prisma } from '@/lib/prisma'
import { authorize, handle, ok, ApiError } from '@/lib/api'
import { logAudit } from '@/lib/audit'

const MAX_LOGO_BYTES = 2 * 1024 * 1024
const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/svg+xml': 'svg',
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
    if (extension === 'svg') {
      const source = bytes.toString('utf8')
      if (/<script|on\w+\s*=|javascript:/i.test(source)) throw new ApiError('ملف SVG يحتوي على محتوى غير آمن', 400)
    }

    const directory = path.join(process.cwd(), 'public', 'uploads', 'organizations', me.organizationId)
    await mkdir(directory, { recursive: true })
    const filename = `${randomUUID()}.${extension}`
    await writeFile(path.join(directory, filename), bytes)
    const logoUrl = `/uploads/organizations/${me.organizationId}/${filename}`
    await prisma.organization.update({ where: { id: me.organizationId }, data: { logoUrl } })
    await logAudit({ organizationId: me.organizationId, userId: me.id, action: 'UPDATE', entityType: 'OrganizationLogo', entityId: me.organizationId, details: { logoUrl } })
    return ok({ logoUrl })
  })
}

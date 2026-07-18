import path from 'node:path'
import { readFile, rm, unlink } from 'node:fs/promises'

const ORGANIZATION_ID = /^[a-zA-Z0-9_-]+$/
const LOGO_FILENAME = /^(?:logo-\d+|[0-9a-fA-F-]{36})\.(png|jpg|svg)$/

export const LOGO_MIME_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  svg: 'image/svg+xml',
}

export function uploadsRoot() {
  return path.resolve(process.env.UPLOADS_ROOT || path.join(process.cwd(), 'storage', 'uploads'))
}

export function legacyUploadsRoot() {
  return path.resolve(process.cwd(), 'public', 'uploads')
}

export function validOrganizationId(value: string) {
  return ORGANIZATION_ID.test(value)
}

export function validLogoFilename(value: string) {
  return LOGO_FILENAME.test(value)
}

export function organizationLogoPath(root: string, organizationId: string, filename: string) {
  if (!validOrganizationId(organizationId) || !validLogoFilename(filename)) return null
  const organizationsRoot = path.resolve(root, 'organizations')
  const target = path.resolve(organizationsRoot, organizationId, filename)
  if (!target.startsWith(`${organizationsRoot}${path.sep}`)) return null
  return target
}

export function parseOrganizationLogoUrl(url: string | null | undefined) {
  if (!url) return null
  const match = /^\/uploads\/organizations\/([^/]+)\/([^/]+)$/.exec(url)
  if (!match || !validOrganizationId(match[1]) || !validLogoFilename(match[2])) return null
  return { organizationId: match[1], filename: match[2] }
}

export async function readOrganizationLogo(organizationId: string, filename: string) {
  for (const root of [uploadsRoot(), legacyUploadsRoot()]) {
    const target = organizationLogoPath(root, organizationId, filename)
    if (!target) return null
    try {
      const data = await readFile(target)
      const extension = path.extname(filename).slice(1).toLowerCase()
      const contentType = LOGO_MIME_TYPES[extension]
      if (!contentType) return null
      return { data, contentType }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }
  return null
}

export async function readUploadedLogoUrl(url: string | null | undefined) {
  const parsed = parseOrganizationLogoUrl(url)
  if (!parsed) return null
  return readOrganizationLogo(parsed.organizationId, parsed.filename)
}

export async function deleteUploadedLogo(url: string | null | undefined) {
  const parsed = parseOrganizationLogoUrl(url)
  if (!parsed) return
  for (const root of [uploadsRoot(), legacyUploadsRoot()]) {
    const target = organizationLogoPath(root, parsed.organizationId, parsed.filename)
    if (!target) continue
    await unlink(target).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error
    })
  }
}

export async function deleteOrganizationUploadFiles(organizationId: string) {
  if (!validOrganizationId(organizationId)) return
  for (const root of [uploadsRoot(), legacyUploadsRoot()]) {
    const organizationsRoot = path.resolve(root, 'organizations')
    const target = path.resolve(organizationsRoot, organizationId)
    if (target.startsWith(`${organizationsRoot}${path.sep}`)) {
      await rm(target, { recursive: true, force: true })
    }
  }
}

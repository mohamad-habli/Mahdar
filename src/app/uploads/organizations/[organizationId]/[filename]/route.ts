import { NextResponse } from 'next/server'
import { readOrganizationLogo, validLogoFilename, validOrganizationId } from '@/lib/uploads'

export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: Promise<{ organizationId: string; filename: string }> }) {
  const { organizationId, filename } = await params
  if (!validOrganizationId(organizationId) || !validLogoFilename(filename)) {
    return NextResponse.json({ success: false, error: 'الملف غير صالح' }, { status: 404 })
  }

  const asset = await readOrganizationLogo(organizationId, filename)
  if (!asset) return NextResponse.json({ success: false, error: 'الشعار غير موجود' }, { status: 404 })

  return new NextResponse(new Uint8Array(asset.data), {
    headers: {
      'Content-Type': asset.contentType,
      'Content-Length': String(asset.data.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}


import { NextResponse } from 'next/server'
import { existsSync } from 'node:fs'
import { authorize, handle, ApiError } from '@/lib/api'
import { logAudit } from '@/lib/audit'
import { loadExportReport, renderReportHtml, REPORT_TYPES, type ExportReportType } from '@/lib/export-reports'
import { buildReportDocx } from '@/lib/report-docx'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

function contentDisposition(filename: string) {
  return `attachment; filename="mahdar-report"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

function chromeExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ].filter((value): value is string => Boolean(value))
  return candidates.find((candidate) => existsSync(candidate))
}

export async function GET(req: Request) {
  return handle(async () => {
    const me = await authorize(['SECRETARY', 'CHAIR', 'DEPT_MANAGER'])
    const url = new URL(req.url)
    const type = url.searchParams.get('type') as ExportReportType
    const format = url.searchParams.get('format') ?? 'html'
    if (!REPORT_TYPES.includes(type)) throw new ApiError('نوع التقرير غير صالح', 400)
    if (!['html', 'pdf', 'docx'].includes(format)) throw new ApiError('صيغة التصدير غير صالحة', 400)
    if (type === 'MINUTES' && !url.searchParams.get('meetingId')) throw new ApiError('اختر المحضر المطلوب', 400)
    if (type === 'DEPARTMENT' && !url.searchParams.get('departmentId') && me.role !== 'DEPT_MANAGER') throw new ApiError('اختر القسم المطلوب', 400)
    if (type === 'ASSIGNEE' && !url.searchParams.get('assigneeId')) throw new ApiError('اختر المسؤول المطلوب', 400)

    let departmentId = url.searchParams.get('departmentId') || undefined
    if (me.role === 'DEPT_MANAGER') {
      const department = await prisma.department.findFirst({
        where: { managerId: me.id, council: { organizationId: me.organizationId }, ...(departmentId ? { id: departmentId } : {}) },
        select: { id: true },
      })
      if (!department) throw new ApiError('يمكنك تصدير تقارير قسمك فقط', 403)
      departmentId = department.id
      if (!['DEPARTMENT', 'TASKS', 'OVERDUE'].includes(type)) throw new ApiError('هذه الصيغة غير متاحة لمسؤول القسم', 403)
    }

    const report = await loadExportReport({
      organizationId: me.organizationId,
      type,
      meetingId: url.searchParams.get('meetingId') || undefined,
      departmentId,
      assigneeId: url.searchParams.get('assigneeId') || undefined,
    })
    if (!report) throw new ApiError('لا توجد بيانات كافية لإنشاء التقرير', 404)
    const filename = `${report.title.replace(/[\\/:*?"<>|]/g, '-')}`

    await logAudit({ organizationId: me.organizationId, userId: me.id, action: 'EXPORT', entityType: type, entityId: url.searchParams.get('meetingId') || departmentId || me.organizationId, details: { format } })

    if (format === 'docx') {
      const buffer = await buildReportDocx(report)
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': contentDisposition(`${filename}.docx`),
        },
      })
    }

    const html = await renderReportHtml(report)
    if (format === 'html') {
      return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    }

    const executablePath = chromeExecutable()
    if (!executablePath) throw new ApiError('خدمة إنشاء PDF غير مهيأة على الخادم', 503)
    const puppeteer = await import('puppeteer-core')
    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
    })
    try {
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'load' })
      const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })
      return new NextResponse(new Uint8Array(pdf), {
        headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': contentDisposition(`${filename}.pdf`) },
      })
    } finally {
      await browser.close()
    }
  })
}

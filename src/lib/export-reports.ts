import { prisma } from './prisma'
import { parseOrganizationBranding, type OrganizationBranding } from './branding'
import { readUploadedLogoUrl } from './uploads'

export const REPORT_TYPES = ['MINUTES', 'TASKS', 'DELIVERABLES', 'OVERDUE', 'DEPARTMENT', 'ASSIGNEE', 'COSTS'] as const
export type ExportReportType = (typeof REPORT_TYPES)[number]

export interface ExportReportSection {
  title: string
  headers?: string[]
  rows?: string[][]
  paragraphs?: string[]
}

export interface ExportReportDocument {
  title: string
  subtitle: string
  organizationName: string
  logoUrl: string | null
  branding: OrganizationBranding
  metadata: [string, string][]
  sections: ExportReportSection[]
  signatures?: string[]
}

const STATUS: Record<string, string> = {
  DRAFT: 'مسودة', IN_REVIEW: 'قيد المراجعة', APPROVED: 'معتمد', LOCKED: 'مقفل',
  NEW: 'جديد', IN_PROGRESS: 'قيد التنفيذ', LATE: 'متأخر', DONE: 'مكتمل', CANCELLED: 'ملغى',
  SCHEDULED: 'مجدول', HELD: 'منعقد', PRESENT: 'حاضر', ABSENT: 'غائب', EXCUSED: 'معتذر',
  UNPAID: 'غير مدفوع', PARTIAL: 'مدفوع جزئيًا', PAID: 'مدفوع',
  OPEN: 'متابعة مفتوحة', CONVERTED_TO_TASK: 'تحوّل إلى تكليف',
  CONVERTED_TO_DELIVERABLE: 'تحوّل إلى استحقاق', NOTE_ONLY: 'ملاحظة فقط',
  CLOSED: 'مغلق', CARRIED_FORWARD: 'مرحّل للمحضر التالي',
  LOW: 'منخفضة', MEDIUM: 'متوسطة', HIGH: 'عالية', URGENT: 'عاجلة',
}

function date(value: Date | string | null | undefined) {
  if (!value) return 'غير محدد'
  return new Intl.DateTimeFormat('ar-LB', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(value))
}

function money(value: number | null, currency: string) {
  return value == null ? 'غير محدد' : `${value.toLocaleString('ar-LB')} ${currency}`
}

export async function loadExportReport(params: {
  organizationId: string
  type: ExportReportType
  meetingId?: string
  departmentId?: string
  assigneeId?: string
}): Promise<ExportReportDocument | null> {
  const organization = await prisma.organization.findUnique({ where: { id: params.organizationId } })
  if (!organization) return null
  const base = {
    organizationName: organization.name,
    logoUrl: organization.logoUrl,
    branding: parseOrganizationBranding(organization.settings),
  }

  if (params.type === 'MINUTES') {
    if (!params.meetingId) return null
    const meeting = await prisma.meeting.findFirst({
      where: { id: params.meetingId, council: { organizationId: params.organizationId } },
      include: {
        council: { select: { name: true, chair: { select: { name: true } } } },
        attendances: { include: { user: { select: { name: true } } }, orderBy: { status: 'asc' } },
        agendaItems: { orderBy: { order: 'asc' } },
        minutes: {
          include: {
            approvedBy: { select: { name: true } },
            createdBy: { select: { name: true } },
            items: {
              orderBy: { order: 'asc' },
              include: {
                department: { select: { name: true } },
                sourceAgendaItem: { select: { title: true } },
                carriedFromItem: { select: { title: true, content: true } },
                tasks: { include: { assignees: { include: { user: { select: { name: true } } } } } },
                deliverables: { include: { owner: { select: { name: true } } } },
                costs: true,
              },
            },
          },
        },
      },
    })
    if (!meeting?.minutes) return null
    const minutes = meeting.minutes
    const attendeeName = (entry: typeof meeting.attendances[number]) => entry.user?.name ?? entry.guestName ?? 'غير معروف'
    const attendanceRows = ['PRESENT', 'EXCUSED', 'ABSENT'].map((status) => [
      STATUS[status],
      meeting.attendances.filter((entry) => entry.status === status).map(attendeeName).join('، ') || 'لا يوجد',
    ])
    const itemRows = minutes.items.map((item) => [
      String(item.order),
      item.title || item.content.slice(0, 70),
      item.content,
      item.department?.name ?? 'عام',
      STATUS[item.outcome] ?? item.outcome,
    ])
    const tasks = minutes.items.flatMap((item) => item.tasks.map((task) => [
      task.title,
      task.assignees.map((assignee) => assignee.user.name).join('، ') || 'غير محدد',
      date(task.dueDate),
      STATUS[task.status] ?? task.status,
    ]))
    const deliverables = minutes.items.flatMap((item) => item.deliverables.map((deliverable) => [
      deliverable.title,
      deliverable.owner?.name ?? 'غير محدد',
      date(deliverable.dueDate),
      STATUS[deliverable.status] ?? deliverable.status,
    ]))
    const costs = minutes.items.flatMap((item) => item.costs.map((cost) => [
      cost.description,
      money(cost.expectedAmount, cost.currency),
      money(cost.actualAmount, cost.currency),
      STATUS[cost.paymentStatus] ?? cost.paymentStatus,
    ]))
    const carried = minutes.items.filter((item) => item.carriedFromItem).map((item) => [
      item.carriedFromItem?.title || item.carriedFromItem?.content.slice(0, 80) || '',
      item.title || item.content.slice(0, 80),
      STATUS[item.outcome] ?? item.outcome,
    ])
    return {
      ...base,
      title: minutes.title || `محضر ${meeting.title}`,
      subtitle: meeting.council.name,
      metadata: [
        ['تاريخ الاجتماع', date(meeting.meetingDate)],
        ['الوقت', [meeting.startTime, meeting.endTime].filter(Boolean).join(' - ') || 'غير محدد'],
        ['المكان / الرابط', meeting.location || meeting.onlineUrl || 'غير محدد'],
        ['حالة المحضر', STATUS[minutes.status] ?? minutes.status],
        ['أمين السر', minutes.createdBy?.name ?? 'مستخدم محذوف'],
        ['الاعتماد', minutes.approvedBy?.name ?? 'لم يعتمد بعد'],
      ],
      sections: [
        { title: 'الحضور والغياب', headers: ['الحالة', 'الأسماء'], rows: attendanceRows },
        { title: 'جدول الأعمال', rows: meeting.agendaItems.map((item) => [String(item.order), item.title, item.notes ?? '']) },
        ...(minutes.summary ? [{ title: 'ملخص المحضر', paragraphs: [minutes.summary] }] : []),
        { title: 'بنود المحضر والقرارات', headers: ['#', 'العنوان', 'التفاصيل', 'القسم', 'المصير'], rows: itemRows },
        ...(carried.length ? [{ title: 'نقاط المتابعة المرحلة', headers: ['البند السابق', 'البند الحالي', 'الحالة'], rows: carried }] : []),
        ...(tasks.length ? [{ title: 'التكليفات الناتجة', headers: ['التكليف', 'المسؤولون', 'الموعد', 'الحالة'], rows: tasks }] : []),
        ...(deliverables.length ? [{ title: 'الاستحقاقات', headers: ['الاستحقاق', 'المسؤول', 'الموعد', 'الحالة'], rows: deliverables }] : []),
        ...(costs.length ? [{ title: 'التكاليف', headers: ['البيان', 'المتوقع', 'الفعلي', 'الدفع'], rows: costs }] : []),
      ],
      signatures: ['أمين السر', meeting.council.chair?.name ? `رئيس المجلس: ${meeting.council.chair.name}` : 'رئيس المجلس'],
    }
  }

  if (params.type === 'DELIVERABLES') {
    const rows = await prisma.deliverable.findMany({
      where: { organizationId: params.organizationId },
      include: { council: true, department: true, owner: true, _count: { select: { tasks: true } } },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    })
    return {
      ...base,
      title: 'تقرير الاستحقاقات',
      subtitle: 'متابعة الاستحقاقات والتكليفات الفرعية',
      metadata: [['تاريخ الإصدار', date(new Date())], ['عدد الاستحقاقات', String(rows.length)]],
      sections: [{ title: 'الاستحقاقات', headers: ['العنوان', 'المجلس', 'القسم', 'المسؤول', 'الموعد', 'الحالة', 'التكليفات'], rows: rows.map((row) => [row.title, row.council?.name ?? '-', row.department?.name ?? '-', row.owner?.name ?? '-', date(row.dueDate), STATUS[row.status] ?? row.status, String(row._count.tasks)]) }],
    }
  }

  if (params.type === 'COSTS') {
    const rows = await prisma.cost.findMany({
      where: { organizationId: params.organizationId },
      include: { department: true, responsible: true, sourceMeeting: true },
      orderBy: { createdAt: 'desc' },
    })
    return {
      ...base,
      title: 'تقرير التكاليف',
      subtitle: 'التكاليف المتوقعة والفعلية',
      metadata: [['تاريخ الإصدار', date(new Date())], ['عدد السجلات', String(rows.length)]],
      sections: [{ title: 'التكاليف', headers: ['البيان', 'القسم', 'المسؤول', 'المتوقع', 'الفعلي', 'الدفع'], rows: rows.map((row) => [row.description, row.department?.name ?? '-', row.responsible?.name ?? '-', money(row.expectedAmount, row.currency), money(row.actualAmount, row.currency), STATUS[row.paymentStatus] ?? row.paymentStatus]) }],
    }
  }

  const taskWhere = {
    organizationId: params.organizationId,
    ...(params.type === 'OVERDUE' ? { dueDate: { lt: new Date() }, status: { notIn: ['DONE', 'CANCELLED'] } } : {}),
    ...(params.departmentId ? { departmentId: params.departmentId } : {}),
    ...(params.type === 'ASSIGNEE' && params.assigneeId ? {
      OR: [{ assigneeId: params.assigneeId }, { assignees: { some: { userId: params.assigneeId } } }],
    } : {}),
  }
  const tasks = await prisma.task.findMany({
    where: taskWhere,
    include: { council: true, department: true, assignees: { include: { user: true }, orderBy: { isPrimary: 'desc' } } },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
  })
  const reportTitle = params.type === 'OVERDUE' ? 'تقرير المتأخرات' : params.type === 'DEPARTMENT' ? 'تقرير القسم / اللجنة' : params.type === 'ASSIGNEE' ? 'تقرير حسب المسؤول' : 'تقرير التكليفات'
  return {
    ...base,
    title: reportTitle,
    subtitle: 'من المحضر إلى الإنجاز',
    metadata: [['تاريخ الإصدار', date(new Date())], ['عدد التكليفات', String(tasks.length)]],
    sections: [{
      title: 'التكليفات',
      headers: ['العنوان', 'المجلس', 'القسم', 'المسؤولون', 'الموعد', 'الأولوية', 'الحالة'],
      rows: tasks.map((task) => [task.title, task.council?.name ?? '-', task.department?.name ?? '-', task.assignees.map((entry) => entry.user.name).join('، ') || '-', date(task.dueDate), STATUS[task.priority] ?? task.priority, STATUS[task.status] ?? task.status]),
    }],
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] ?? char))
}

async function logoDataUrl(logoUrl: string | null) {
  const asset = await readUploadedLogoUrl(logoUrl)
  return asset ? `data:${asset.contentType};base64,${asset.data.toString('base64')}` : null
}

export async function renderReportHtml(report: ExportReportDocument) {
  const logo = await logoDataUrl(report.logoUrl)
  const compact = report.branding.reportStyle === 'COMPACT'
  const spacing = compact ? '6px' : report.branding.reportStyle === 'SPACIOUS' ? '13px' : '9px'
  const mono = report.branding.reportTheme === 'MONO'
  const primary = mono ? '#111111' : report.branding.primaryColor
  const secondary = mono ? '#555555' : report.branding.secondaryColor
  const sections = report.sections.map((section) => `
    <section>
      <h2>${escapeHtml(section.title)}</h2>
      ${section.paragraphs?.map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`).join('') ?? ''}
      ${section.rows ? `<table><thead>${section.headers ? `<tr>${section.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>` : ''}</thead><tbody>${section.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>` : ''}
    </section>`).join('')
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(report.title)}</title><style>
    @page{size:A4;margin:16mm 14mm}*{box-sizing:border-box}body{font-family:"Arial","Tahoma",sans-serif;color:#1d2433;margin:0;direction:rtl;font-size:12px;line-height:1.7}
    header{display:flex;align-items:center;gap:16px;border-bottom:3px solid ${secondary};padding-bottom:14px;margin-bottom:18px}.logo{width:72px;height:72px;object-fit:contain}.org{font-size:14px;color:${primary};font-weight:700}.title{font-size:24px;color:${primary};font-weight:800;margin:2px 0}.subtitle{color:#596273}
    .meta{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #dfe3ea;margin-bottom:18px}.meta div{padding:8px 10px;border:1px solid #edf0f4}.meta b{display:block;color:#687184;font-size:10px}
    section{break-inside:avoid;margin:0 0 16px}h2{font-size:15px;color:${primary};border-right:4px solid ${secondary};background:#f4f6f9;padding:7px 10px;margin:0 0 8px}p{white-space:normal;margin:5px 0}
    table{width:100%;border-collapse:collapse;table-layout:auto}th{background:${primary};color:white;font-weight:700}th,td{border:1px solid #dfe3ea;padding:${spacing};text-align:right;vertical-align:top}tr:nth-child(even) td{background:#fafbfc}
    .signatures{display:flex;justify-content:space-between;gap:80px;margin-top:42px}.signature{flex:1;text-align:center;font-weight:700}.line{border-top:1px solid #555;margin-top:42px}
    footer{margin-top:22px;border-top:1px solid #dfe3ea;padding-top:7px;color:#7a8391;font-size:9px;text-align:center}
  </style></head><body>
    <header>${logo ? `<img class="logo" src="${logo}" alt="">` : ''}<div><div class="org">${escapeHtml(report.organizationName)}</div><div class="title">${escapeHtml(report.title)}</div><div class="subtitle">${escapeHtml(report.subtitle)}</div></div></header>
    <div class="meta">${report.metadata.map(([label, value]) => `<div><b>${escapeHtml(label)}</b>${escapeHtml(value)}</div>`).join('')}</div>
    ${sections}
    ${report.signatures ? `<div class="signatures">${report.signatures.map((signature) => `<div class="signature">${escapeHtml(signature)}<div class="line"></div></div>`).join('')}</div>` : ''}
    <footer>${escapeHtml(report.organizationName)} · أُنشئ بواسطة نظام محضر</footer>
  </body></html>`
}

import * as XLSX from 'xlsx'
import { prisma } from '@/lib/prisma'
import { handle, ApiError } from '@/lib/api'
import { getSession } from '@/lib/auth'
import { generateDepartmentReport } from '@/lib/report'
import { managedDeptIds } from '@/lib/tasks'
import {
  TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, PAYMENT_STATUS_LABELS,
  type TaskStatus, type TaskPriority, type PaymentStatus,
} from '@/types'

function fmtDate(iso: string | null) {
  return iso ? new Intl.DateTimeFormat('ar-EG-u-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso)) : ''
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await getSession()
    if (!me) throw new ApiError('يرجى تسجيل الدخول', 401)
    const { id } = await params

    // صلاحية: أمين السر/الرئيس، أو مسؤول هذا القسم
    if (me.role === 'DEPT_MANAGER') {
      const ids = await managedDeptIds(me.id)
      if (!ids.includes(id)) throw new ApiError('غير مصرح', 403)
    } else if (!['SECRETARY', 'CHAIR'].includes(me.role)) {
      throw new ApiError('غير مصرح', 403)
    }

    const report = await generateDepartmentReport(id, me.organizationId)
    if (!report) throw new ApiError('القسم غير موجود', 404)

    const allTasks = [...report.tasks.open, ...report.tasks.done]
    const taskRows = allTasks.map((t) => ({
      'العنوان': t.title,
      'المسؤول': t.assigneeName ?? '',
      'الاستحقاق': fmtDate(t.dueDate),
      'الأولوية': TASK_PRIORITY_LABELS[t.priority as TaskPriority] ?? t.priority,
      'الحالة': TASK_STATUS_LABELS[t.status as TaskStatus] ?? t.status,
    }))
    const costRows = report.costs.items.map((c) => ({
      'الوصف': c.description,
      'المسؤول': c.responsibleName ?? '',
      'المتوقع': c.expectedAmount ?? '',
      'الفعلي': c.actualAmount ?? '',
      'العملة': c.currency,
      'حالة الدفع': PAYMENT_STATUS_LABELS[c.paymentStatus as PaymentStatus] ?? c.paymentStatus,
    }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(taskRows.length ? taskRows : [{ 'لا تكليفات': '' }]), 'التكليفات')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(costRows.length ? costRows : [{ 'لا تكاليف': '' }]), 'التكاليف')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    const fileName = `report-${report.department.name}.xlsx`

    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="department-report.xlsx"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    })
  })
}

import { prisma } from '@/lib/prisma'
import { handle, ok, ApiError } from '@/lib/api'
import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { generateDepartmentReport } from '@/lib/report'

// إرسال تقرير القسم لمسؤوله كإشعار داخلي (البنية جاهزة لـ WhatsApp/Email لاحقًا)
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await getSession()
    if (!me) throw new ApiError('يرجى تسجيل الدخول', 401)
    if (!['SECRETARY', 'CHAIR'].includes(me.role)) throw new ApiError('غير مصرح', 403)
    const { id } = await params

    const report = await generateDepartmentReport(id, me.organizationId)
    if (!report) throw new ApiError('القسم غير موجود', 404)
    if (!report.department.managerId) throw new ApiError('لا يوجد مسؤول لهذا القسم لإرسال التقرير إليه', 400)

    const c = report.tasks.counts
    await prisma.notification.create({
      data: {
        organizationId: me.organizationId,
        userId: report.department.managerId,
        type: 'DEPARTMENT_REPORT',
        title: `تقرير قسم ${report.department.name}`,
        body: `${c.open} تكليف مفتوح · ${c.overdue} متأخر · ${c.done} منجز. راجِع تكليفات قسمك.`,
        link: '/manager/reports',
      },
    })

    await logAudit({ organizationId: me.organizationId, userId: me.id, action: 'SEND', entityType: 'DepartmentReport', entityId: id, details: { to: report.department.managerId } })
    return ok({ sentTo: report.department.managerName })
  })
}

import { requireUser } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { generateDepartmentReport } from '@/lib/report'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import DepartmentReportView from '@/components/reports/DepartmentReportView'
import ReportControls from '@/components/reports/ReportControls'
import { FileBarChart } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ChairReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string }>
}) {
  const me = await requireUser(['CHAIR'])
  const { dept } = await searchParams

  const departments = await prisma.department.findMany({
    where: { council: { organizationId: me.organizationId }, isActive: true },
    select: { id: true, name: true }, orderBy: { name: 'asc' },
  })

  if (departments.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <PageHeader title="تقارير الأقسام" subtitle="نظرة تنفيذية على الأقسام." />
        <div className="card"><EmptyState icon={FileBarChart} title="لا أقسام" hint="لم تُنشأ أقسام بعد." /></div>
      </div>
    )
  }

  const selectedId = dept && departments.some((d) => d.id === dept) ? dept : departments[0].id
  const report = await generateDepartmentReport(selectedId, me.organizationId)

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="تقارير الأقسام" subtitle="تقرير تنفيذي لكل قسم في المجلس."
        action={<ReportControls departments={departments} selectedId={selectedId} canSend />} />
      {report && <DepartmentReportView report={report} />}
    </div>
  )
}

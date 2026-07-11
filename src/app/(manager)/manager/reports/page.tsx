import { requireUser } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { generateDepartmentReport } from '@/lib/report'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import DepartmentReportView from '@/components/reports/DepartmentReportView'
import ReportControls from '@/components/reports/ReportControls'
import { FileBarChart } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ManagerReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string }>
}) {
  const me = await requireUser(['DEPT_MANAGER'])
  const { dept } = await searchParams

  const departments = await prisma.department.findMany({
    where: { managerId: me.id, isActive: true },
    select: { id: true, name: true }, orderBy: { name: 'asc' },
  })

  if (departments.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <PageHeader title="تقرير القسم" subtitle="تقريرك التنفيذي." />
        <div className="card"><EmptyState icon={FileBarChart} title="لم تُربط بقسم" hint="تواصل مع أمين السر لربطك بقسم." /></div>
      </div>
    )
  }

  const selectedId = dept && departments.some((d) => d.id === dept) ? dept : departments[0].id
  const report = await generateDepartmentReport(selectedId, me.organizationId)

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="تقرير القسم" subtitle="ملخص تنفيذي لتكليفات قسمك وقراراته وتكاليفه."
        action={<ReportControls departments={departments} selectedId={selectedId} canSend={false} />} />
      {report && <DepartmentReportView report={report} />}
    </div>
  )
}

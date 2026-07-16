import { requireUser } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import ReportsExportClient from './ReportsExportClient'

export const dynamic = 'force-dynamic'

export default async function SecretaryReportsPage() {
  const me = await requireUser(['SECRETARY'])
  const [meetings, departments, users] = await Promise.all([
    prisma.meeting.findMany({
      where: { council: { organizationId: me.organizationId }, minutes: { isNot: null } },
      select: { id: true, title: true, meetingDate: true, council: { select: { name: true } }, minutes: { select: { title: true, status: true } } },
      orderBy: { meetingDate: 'desc' },
    }),
    prisma.department.findMany({
      where: { council: { organizationId: me.organizationId }, isActive: true },
      select: { id: true, name: true, council: { select: { name: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({
      where: { organizationId: me.organizationId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <ReportsExportClient
      meetings={meetings.map((meeting) => ({
        id: meeting.id,
        title: meeting.minutes?.title || meeting.title,
        councilName: meeting.council.name,
        date: meeting.meetingDate.toISOString(),
        status: meeting.minutes?.status ?? 'DRAFT',
      }))}
      departments={departments.map((department) => ({ id: department.id, name: department.name, councilName: department.council.name }))}
      users={users}
    />
  )
}

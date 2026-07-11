import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import CouncilDetailClient from './CouncilDetailClient'

export const dynamic = 'force-dynamic'

export default async function CouncilDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const me = await requireUser()
  const { id } = await params

  const council = await prisma.council.findFirst({
    where: { id, organizationId: me.organizationId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      },
      departments: {
        where: { parentId: null },
        include: {
          manager: { select: { id: true, name: true } },
          _count: { select: { tasks: true, projects: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!council) notFound()

  const orgUsers = await prisma.user.findMany({
    where: { organizationId: me.organizationId, isActive: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: 'asc' },
  })

  return (
    <CouncilDetailClient
      council={{
        id: council.id,
        name: council.name,
        type: council.type,
        description: council.description,
        recurrence: council.recurrence,
        recurrenceDay: council.recurrenceDay,
        defaultStartTime: council.defaultStartTime,
        defaultEndTime: council.defaultEndTime,
        defaultLocation: council.defaultLocation,
      }}
      members={council.members.map((m) => ({
        id: m.id,
        userId: m.user.id,
        name: m.user.name,
        role: m.user.role,
        membershipType: m.membershipType,
        roleInCouncil: m.roleInCouncil,
      }))}
      departments={council.departments.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        managerId: d.managerId,
        managerName: d.manager?.name ?? null,
        taskCount: d._count.tasks,
        projectCount: d._count.projects,
      }))}
      orgUsers={orgUsers}
    />
  )
}

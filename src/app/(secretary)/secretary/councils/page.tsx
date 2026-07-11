import { requireUser } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import CouncilsClient from './CouncilsClient'

export const dynamic = 'force-dynamic'

export default async function CouncilsPage() {
  const me = await requireUser()
  const councils = await prisma.council.findMany({
    where: { organizationId: me.organizationId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      type: true,
      description: true,
      recurrence: true,
      isActive: true,
      _count: { select: { departments: true, members: true, meetings: true } },
    },
  })

  return <CouncilsClient councils={councils} />
}

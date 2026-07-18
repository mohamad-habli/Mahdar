import { requireUser } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import SuperClient from './SuperClient'

export const dynamic = 'force-dynamic'

export default async function SuperPage() {
  const me = await requireUser(['SUPER_USER'])
  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { users: true, councils: true } },
      identifiers: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          code: true,
          isActive: true,
          assignedUser: { select: { id: true, name: true } },
        },
      },
    },
  })

  return (
    <SuperClient
      organizations={organizations.map((o) => ({
        id: o.id,
        name: o.name,
        isActive: o.isActive,
        isCurrent: o.id === me.organizationId,
        usersCount: o._count.users,
        councilsCount: o._count.councils,
        identifiers: o.identifiers,
      }))}
    />
  )
}

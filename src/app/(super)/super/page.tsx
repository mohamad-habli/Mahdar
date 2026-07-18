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
      users: {
        where: { role: 'SECRETARY' },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          loginName: true,
          username: true,
          jobTitle: true,
          phone: true,
          email: true,
          isActive: true,
        },
      },
    },
  })

  return (
    <SuperClient
      organizations={organizations.map((o) => ({
        id: o.id,
        name: o.name,
        loginPrefix: o.loginPrefix,
        isActive: o.isActive,
        isCurrent: o.id === me.organizationId,
        usersCount: o._count.users,
        councilsCount: o._count.councils,
        secretaries: o.users,
      }))}
    />
  )
}

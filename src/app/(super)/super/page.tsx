import { requireUser } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import SuperClient from './SuperClient'

export const dynamic = 'force-dynamic'

export default async function SuperPage() {
  await requireUser(['SUPER_USER'])
  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { users: true, councils: true } },
    },
  })

  return (
    <SuperClient
      organizations={organizations.map((o) => ({
        id: o.id,
        name: o.name,
        usersCount: o._count.users,
        councilsCount: o._count.councils,
      }))}
    />
  )
}

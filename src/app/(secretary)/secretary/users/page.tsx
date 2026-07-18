import { requireUser } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import UsersClient from './UsersClient'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const me = await requireUser(['SECRETARY'])
  const [users, availableIdentifiers] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId: me.organizationId },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        username: true,
        identifier: { select: { code: true } },
        role: true,
        jobTitle: true,
        phone: true,
        email: true,
        isActive: true,
      },
    }),
    prisma.userIdentifier.findMany({
      where: { organizationId: me.organizationId, isActive: true, assignedUser: null },
      orderBy: { code: 'asc' },
      select: { id: true, code: true },
    }),
  ])

  return <UsersClient users={users.map((user) => ({ ...user, identifierCode: user.identifier?.code ?? user.username.toUpperCase() }))} availableIdentifiers={availableIdentifiers} meId={me.id} />
}

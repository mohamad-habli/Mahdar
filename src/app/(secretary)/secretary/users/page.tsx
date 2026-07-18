import { requireUser } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import UsersClient from './UsersClient'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const me = await requireUser(['SECRETARY'])
  const [users, organization] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId: me.organizationId },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        loginName: true,
        username: true,
        role: true,
        jobTitle: true,
        phone: true,
        email: true,
        isActive: true,
      },
    }),
    prisma.organization.findUniqueOrThrow({ where: { id: me.organizationId }, select: { loginPrefix: true } }),
  ])

  return <UsersClient users={users} loginPrefix={organization.loginPrefix} meId={me.id} />
}

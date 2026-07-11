import { requireUser } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import UsersClient from './UsersClient'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const me = await requireUser()
  const users = await prisma.user.findMany({
    where: { organizationId: me.organizationId },
    orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      jobTitle: true,
      phone: true,
      email: true,
      isActive: true,
    },
  })

  return <UsersClient users={users} meId={me.id} />
}

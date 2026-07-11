import { requireUser } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { loadDeliverables } from '@/lib/deliverables'
import DeliverablesClient from './DeliverablesClient'

export const dynamic = 'force-dynamic'

export default async function DeliverablesPage({ searchParams }: { searchParams: Promise<{ selected?: string }> }) {
  const me = await requireUser(['SECRETARY'])
  const query = await searchParams
  const [deliverables, councils, departments, members] = await Promise.all([
    loadDeliverables({ organizationId: me.organizationId }),
    prisma.council.findMany({ where: { organizationId: me.organizationId, isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.department.findMany({ where: { council: { organizationId: me.organizationId }, isActive: true }, select: { id: true, name: true, councilId: true }, orderBy: { name: 'asc' } }),
    prisma.user.findMany({ where: { organizationId: me.organizationId, isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])
  return <DeliverablesClient deliverables={deliverables} councils={councils} departments={departments} members={members} initialSelectedId={query.selected ?? null} />
}

import { requireUser } from '@/lib/guard'
import { loadTree } from '@/lib/tree'
import TreeClient from './TreeClient'

export const dynamic = 'force-dynamic'

export default async function TreePage() {
  const me = await requireUser(['SECRETARY'])
  const tree = await loadTree(me.organizationId)
  return <TreeClient councils={tree} />
}

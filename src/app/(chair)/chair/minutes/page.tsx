import Link from 'next/link'
import { FileCheck2, ChevronLeft, CalendarDays } from 'lucide-react'
import { requireUser } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import { MinutesStatusBadge } from '@/components/badges'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function ChairMinutesPage() {
  const me = await requireUser(['CHAIR'])

  const minutes = await prisma.minutes.findMany({
    where: { meeting: { council: { organizationId: me.organizationId } }, status: { not: 'DRAFT' } },
    orderBy: [{ updatedAt: 'desc' }],
    include: {
      meeting: { select: { id: true, title: true, meetingDate: true, council: { select: { name: true } } } },
      _count: { select: { items: true } },
    },
  })

  const pending = minutes.filter((m) => m.status === 'IN_REVIEW')
  const others = minutes.filter((m) => m.status !== 'IN_REVIEW')

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="المحاضر" subtitle="راجِع المحاضر المرسلة واعتمدها." />

      {minutes.length === 0 ? (
        <div className="card">
          <EmptyState icon={FileCheck2} title="لا محاضر للمراجعة" hint="ستظهر هنا المحاضر بعد إرسالها من أمين السر." />
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <Section title="بانتظار الاعتماد" rows={pending} />
          )}
          {others.length > 0 && <Section title="المعتمدة والمقفلة" rows={others} />}
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  rows,
}: {
  title: string
  rows: {
    id: string
    status: string
    meeting: { id: string; title: string; meetingDate: Date; council: { name: string } }
    _count: { items: number }
  }[]
}) {
  return (
    <div>
      <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--text-2)' }}>{title}</h2>
      <div className="space-y-3">
        {rows.map((m) => (
          <Link key={m.id} href={`/chair/minutes/${m.meeting.id}`} className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow group">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
              <FileCheck2 size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>{m.meeting.title}</span>
                <MinutesStatusBadge status={m.status} />
              </div>
              <div className="text-xs mt-1 flex items-center gap-3 flex-wrap" style={{ color: 'var(--text-3)' }}>
                <span>{m.meeting.council.name}</span>
                <span className="flex items-center gap-1"><CalendarDays size={12} /> {formatDate(m.meeting.meetingDate)}</span>
                <span>{m._count.items} بند</span>
              </div>
            </div>
            <ChevronLeft size={18} style={{ color: 'var(--text-3)' }} className="group-hover:-translate-x-1 transition-transform" />
          </Link>
        ))}
      </div>
    </div>
  )
}

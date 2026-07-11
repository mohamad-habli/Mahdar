import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, FileText, Lock } from 'lucide-react'
import { requireUser } from '@/lib/guard'
import { loadMeetingMinutes } from '@/lib/minutes'
import MinuteItemCard from '@/components/MinuteItemCard'
import { MinutesStatusBadge } from '@/components/badges'
import { formatDate } from '@/lib/utils'
import ChairMinutesActions from './ChairMinutesActions'

export const dynamic = 'force-dynamic'

export default async function ChairMinuteReview({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const me = await requireUser(['CHAIR'])
  const { id } = await params

  const data = await loadMeetingMinutes(id, me.organizationId)
  if (!data || !data.minutes) notFound()

  const { meeting, minutes } = data

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/chair/minutes" className="inline-flex items-center gap-1.5 text-sm mb-4" style={{ color: 'var(--text-2)' }}>
        <ArrowRight size={16} /> المحاضر
      </Link>

      <div className="card p-5 mb-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>محضر الاجتماع</h1>
              <MinutesStatusBadge status={minutes.status} />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>
              {meeting.title} · {meeting.councilName} · {formatDate(meeting.meetingDate)}
            </p>
            {minutes.approvedByName && (
              <p className="text-xs mt-1" style={{ color: 'var(--success)' }}>
                اعتمده {minutes.approvedByName}{minutes.approvedAt ? ` · ${formatDate(minutes.approvedAt)}` : ''}
              </p>
            )}
          </div>
          <ChairMinutesActions minutesId={minutes.id} status={minutes.status} />
        </div>
        {minutes.status === 'LOCKED' && (
          <div className="mt-3 text-sm rounded-lg px-3 py-2 flex items-center gap-2" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
            <Lock size={15} /> المحضر مقفل ومعتمد.
          </div>
        )}
      </div>

      {minutes.summary && (
        <div className="card p-5 mb-5">
          <h3 className="font-bold mb-3" style={{ color: 'var(--text-1)' }}>ملخص المحضر</h3>
          <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-2)' }}>{minutes.summary}</p>
        </div>
      )}

      <div className="card p-5 mb-5">
        <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
          <FileText size={18} style={{ color: 'var(--brand)' }} /> بنود المحضر
          <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>{minutes.items.length}</span>
        </h3>
        {minutes.items.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: 'var(--text-3)' }}>لا بنود.</p>
        ) : (
          <ol className="space-y-4">
            {minutes.items.map((it) => (
              <li key={it.id}><MinuteItemCard item={it} /></li>
            ))}
          </ol>
        )}
      </div>

      {minutes.addenda.length > 0 && (
        <div className="card p-5 mb-5">
          <h3 className="font-bold mb-3" style={{ color: 'var(--text-1)' }}>الملاحق الرسمية</h3>
          <ul className="space-y-2">
            {minutes.addenda.map((a) => (
              <li key={a.id} className="px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--gold-bg)' }}>
                <p className="whitespace-pre-wrap" style={{ color: 'var(--text-1)' }}>{a.content}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{a.authorName} · {formatDate(a.createdAt)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

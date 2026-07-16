import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { loadMeetingMinutes } from '@/lib/minutes'
import MinuteItemCard from '@/components/MinuteItemCard'
import PrintButton from '@/components/PrintButton'
import { formatDate } from '@/lib/utils'
import { MINUTES_STATUS_LABELS, type MinutesStatus } from '@/types'
import { parseOrganizationBranding } from '@/lib/branding'

export const dynamic = 'force-dynamic'

export default async function PrintMinutes({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const me = await requireUser(['SECRETARY', 'CHAIR'])
  const { id } = await params

  const data = await loadMeetingMinutes(id, me.organizationId)
  if (!data || !data.minutes) notFound()

  const [org, meeting] = await Promise.all([
    prisma.organization.findUnique({ where: { id: me.organizationId }, select: { name: true, logoUrl: true, settings: true } }),
    prisma.meeting.findUnique({
      where: { id },
      include: {
        agendaItems: { orderBy: { order: 'asc' } },
        attendances: { include: { user: { select: { name: true } } } },
      },
    }),
  ])
  if (!meeting) notFound()
  const branding = parseOrganizationBranding(org?.settings)
  const primary = branding.reportTheme === 'MONO' ? '#111111' : branding.primaryColor
  const secondary = branding.reportTheme === 'MONO' ? '#555555' : branding.secondaryColor

  const nameOf = (a: { user: { name: string } | null; guestName: string | null }) => a.user?.name ?? a.guestName ?? '—'
  const present = meeting.attendances.filter((a) => a.status === 'PRESENT')
  const absent = meeting.attendances.filter((a) => a.status === 'ABSENT')
  const excused = meeting.attendances.filter((a) => a.status === 'EXCUSED')

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: 32, color: '#16203A', fontSize: 14 }}>
      <div className="flex items-center justify-between mb-6 no-print">
        <span style={{ color: '#8A93AC', fontSize: 13 }}>معاينة الطباعة</span>
        <PrintButton auto />
      </div>

      <div style={{ textAlign: 'center', borderBottom: `3px solid ${secondary}`, paddingBottom: 16, marginBottom: 20 }}>
        {org?.logoUrl && <img src={org.logoUrl} alt="شعار المركز" style={{ width: 70, height: 70, objectFit: 'contain', margin: '0 auto 8px' }} />}
        <div style={{ fontSize: 13, color: primary, fontWeight: 700 }}>{org?.name ?? ''}</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '6px 0', color: primary }}>{data.minutes.title || 'محضر اجتماع'}</h1>
        <div style={{ fontSize: 16, fontWeight: 600 }}>{meeting.title}</div>
        <div style={{ fontSize: 13, color: '#4A5573', marginTop: 4 }}>
          {data.meeting.councilName} · {formatDate(meeting.meetingDate)}
          {meeting.startTime ? ` · ${meeting.startTime}` : ''}{meeting.endTime ? ` - ${meeting.endTime}` : ''}
          {meeting.location ? ` · ${meeting.location}` : ''}
        </div>
        <div style={{ fontSize: 12, color: secondary, marginTop: 4 }}>
          الحالة: {MINUTES_STATUS_LABELS[data.minutes.status as MinutesStatus]}
          {data.minutes.approvedByName ? ` · اعتمده ${data.minutes.approvedByName}` : ''}
        </div>
      </div>

      <Section title="الحضور والغياب">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: 13 }}>
          <AttCol label={`الحاضرون (${present.length})`} names={present.map(nameOf)} />
          <AttCol label={`المعتذرون (${excused.length})`} names={excused.map(nameOf)} />
          <AttCol label={`الغائبون (${absent.length})`} names={absent.map(nameOf)} />
        </div>
      </Section>

      {meeting.agendaItems.length > 0 && (
        <Section title="جدول الأعمال">
          <ol style={{ paddingRight: 20, margin: 0 }}>
            {meeting.agendaItems.map((a) => <li key={a.id} style={{ marginBottom: 4 }}>{a.title}</li>)}
          </ol>
        </Section>
      )}

      {data.minutes.summary && (
        <Section title="الملخص">
          <p style={{ whiteSpace: 'pre-wrap', margin: 0, color: '#4A5573' }}>{data.minutes.summary}</p>
        </Section>
      )}

      <Section title="بنود المحضر">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {data.minutes.items.map((it) => <MinuteItemCard key={it.id} item={it} />)}
          {data.minutes.items.length === 0 && <span style={{ color: '#8A93AC' }}>لا بنود.</span>}
        </div>
      </Section>

      {data.minutes.addenda.length > 0 && (
        <Section title="الملاحق الرسمية">
          {data.minutes.addenda.map((a) => (
            <div key={a.id} style={{ background: '#FBF6E9', borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{a.content}</div>
              <div style={{ fontSize: 11, color: '#8A93AC', marginTop: 4 }}>{a.authorName} · {formatDate(a.createdAt)}</div>
            </div>
          ))}
        </Section>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 48, fontSize: 13 }}>
        <div style={{ textAlign: 'center' }}>أمين السر<div style={{ marginTop: 36, borderTop: '1px solid #999', width: 160 }} /></div>
        <div style={{ textAlign: 'center' }}>رئيس المجلس<div style={{ marginTop: 36, borderTop: '1px solid #999', width: 160 }} /></div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, background: '#F1F3F9', padding: '6px 10px', borderRadius: 6, marginBottom: 10 }}>{title}</h2>
      {children}
    </div>
  )
}

function AttCol({ label, names }: { label: string; names: string[] }) {
  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {names.length === 0 ? <div style={{ color: '#8A93AC' }}>—</div> : names.map((n, i) => <div key={i} style={{ color: '#4A5573' }}>{n}</div>)}
    </div>
  )
}

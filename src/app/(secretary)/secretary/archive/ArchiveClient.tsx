'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Archive, Search, CalendarDays, Users, ListChecks, ClipboardList,
  Wallet, Printer, ChevronLeft, FileText,
} from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import { SelectField } from '@/components/ui/Field'
import { MinutesStatusBadge } from '@/components/badges'
import { formatDate } from '@/lib/utils'

interface Row {
  id: string
  title: string
  councilId: string
  councilName: string
  meetingDate: string
  status: string
  minutesStatus: string | null
  itemCount: number
  presentCount: number
  absentCount: number
  agendaCount: number
  taskCount: number
  costCount: number
}

export default function ArchiveClient({
  meetings, councils,
}: {
  meetings: Row[]
  councils: { id: string; name: string }[]
}) {
  const [q, setQ] = useState('')
  const [fCouncil, setFCouncil] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fYear, setFYear] = useState('')

  const years = useMemo(() => {
    const s = new Set<string>()
    meetings.forEach((m) => s.add(String(new Date(m.meetingDate).getFullYear())))
    return Array.from(s).sort().reverse()
  }, [meetings])

  const filtered = useMemo(() => meetings.filter((m) => {
    if (q && !m.title.includes(q) && !m.councilName.includes(q)) return false
    if (fCouncil && m.councilId !== fCouncil) return false
    if (fStatus && (m.minutesStatus ?? 'NONE') !== fStatus) return false
    if (fYear && String(new Date(m.meetingDate).getFullYear()) !== fYear) return false
    return true
  }), [meetings, q, fCouncil, fStatus, fYear])

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title="الأرشيف" subtitle="كل الجلسات السابقة بمحاضرها وحضورها وقراراتها." />

      {/* بحث وفلاتر */}
      <div className="card p-3 mb-4 space-y-3">
        <div className="relative">
          <Search size={17} className="absolute top-1/2 -translate-y-1/2 right-3" style={{ color: 'var(--text-3)' }} />
          <input className="input pr-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بعنوان الاجتماع أو المجلس…" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <SelectField label="المجلس" placeholder="الكل" options={councils.map((c) => ({ value: c.id, label: c.name }))} value={fCouncil} onChange={(e) => setFCouncil(e.target.value)} />
          <SelectField label="حالة المحضر" placeholder="الكل" options={[
            { value: 'NONE', label: 'بلا محضر' }, { value: 'DRAFT', label: 'مسودة' },
            { value: 'IN_REVIEW', label: 'قيد المراجعة' }, { value: 'APPROVED', label: 'معتمد' }, { value: 'LOCKED', label: 'مقفل' },
          ]} value={fStatus} onChange={(e) => setFStatus(e.target.value)} />
          <SelectField label="السنة" placeholder="الكل" options={years.map((y) => ({ value: y, label: y }))} value={fYear} onChange={(e) => setFYear(e.target.value)} />
        </div>
      </div>

      <div className="text-sm mb-3" style={{ color: 'var(--text-3)' }}>{filtered.length} جلسة</div>

      {filtered.length === 0 ? (
        <div className="card"><EmptyState icon={Archive} title="لا جلسات مطابقة" hint="جرّب تغيير البحث أو الفلاتر." /></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <div key={m.id} className="card p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold" style={{ color: 'var(--text-1)' }}>{m.title}</span>
                    {m.minutesStatus ? <MinutesStatusBadge status={m.minutesStatus} /> : <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}>بلا محضر</span>}
                  </div>
                  <div className="text-xs flex items-center gap-3 flex-wrap" style={{ color: 'var(--text-3)' }}>
                    <span>{m.councilName}</span>
                    <span className="flex items-center gap-1"><CalendarDays size={12} /> {formatDate(m.meetingDate)}</span>
                    <span className="flex items-center gap-1"><Users size={12} /> {m.presentCount} حاضر · {m.absentCount} غائب</span>
                    <span className="flex items-center gap-1"><ListChecks size={12} /> {m.agendaCount} بند أعمال</span>
                    <span className="flex items-center gap-1"><FileText size={12} /> {m.itemCount} بند محضر</span>
                    <span className="flex items-center gap-1"><ClipboardList size={12} /> {m.taskCount}</span>
                    <span className="flex items-center gap-1"><Wallet size={12} /> {m.costCount}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {m.minutesStatus && (
                    <a href={`/print/minutes/${m.id}`} target="_blank" className="btn btn-ghost px-3 py-1.5 text-sm" title="طباعة / PDF">
                      <Printer size={15} /> PDF
                    </a>
                  )}
                  <Link href={`/secretary/meetings/${m.id}`} className="btn btn-ghost px-3 py-1.5 text-sm">
                    عرض <ChevronLeft size={15} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

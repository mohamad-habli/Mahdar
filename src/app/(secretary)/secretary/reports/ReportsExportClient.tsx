'use client'

import { useMemo, useState } from 'react'
import { Download, Eye, FileBarChart, FileText, FileType2 } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { SelectField } from '@/components/ui/Field'
import { formatDate } from '@/lib/utils'

type ReportType = 'MINUTES' | 'TASKS' | 'DELIVERABLES' | 'OVERDUE' | 'DEPARTMENT' | 'ASSIGNEE' | 'COSTS'

const TYPES: { value: ReportType; label: string; hint: string }[] = [
  { value: 'MINUTES', label: 'محضر اجتماع', hint: 'محضر رسمي متكامل بالحضور والبنود والمخرجات.' },
  { value: 'TASKS', label: 'التكليفات', hint: 'كل التكليفات والمسؤولين والمواعيد والحالات.' },
  { value: 'DELIVERABLES', label: 'الاستحقاقات', hint: 'الاستحقاقات الكبرى والتكليفات التابعة لها.' },
  { value: 'OVERDUE', label: 'المتأخرات', hint: 'العناصر المتجاوزة لموعدها ولم تُغلق.' },
  { value: 'DEPARTMENT', label: 'حسب القسم / اللجنة', hint: 'تقرير تنفيذي مفلتر لقسم محدد.' },
  { value: 'ASSIGNEE', label: 'حسب المسؤول', hint: 'تكليفات مستخدم محدد عبر المجالس.' },
  { value: 'COSTS', label: 'التكاليف', hint: 'المبالغ المتوقعة والفعلية وحالة الدفع.' },
]

interface Meeting { id: string; title: string; councilName: string; date: string; status: string }
interface Option { id: string; name: string; councilName?: string }

export default function ReportsExportClient({ meetings, departments, users }: { meetings: Meeting[]; departments: Option[]; users: Option[] }) {
  const [type, setType] = useState<ReportType>('MINUTES')
  const [meetingId, setMeetingId] = useState(meetings[0]?.id ?? '')
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? '')
  const [assigneeId, setAssigneeId] = useState(users[0]?.id ?? '')

  const query = useMemo(() => {
    const params = new URLSearchParams({ type })
    if (type === 'MINUTES' && meetingId) params.set('meetingId', meetingId)
    if (type === 'DEPARTMENT' && departmentId) params.set('departmentId', departmentId)
    if (type === 'ASSIGNEE' && assigneeId) params.set('assigneeId', assigneeId)
    return params.toString()
  }, [type, meetingId, departmentId, assigneeId])
  const current = TYPES.find((item) => item.value === type)!
  const disabled = (type === 'MINUTES' && !meetingId) || (type === 'DEPARTMENT' && !departmentId) || (type === 'ASSIGNEE' && !assigneeId)

  function open(format: 'html' | 'pdf' | 'docx') {
    if (disabled) return
    window.open(`/api/reports/export?${query}&format=${format}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader title="التقارير والتصدير" subtitle="معاينة وتصدير محاضر وتقارير رسمية بهوية المركز بصيغتي PDF وWord." />
      <div className="grid lg:grid-cols-[310px_1fr] gap-5">
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
            <FileBarChart size={18} style={{ color: 'var(--brand)' }} />
            <h2 className="font-bold">نوع التقرير</h2>
          </div>
          <div className="p-2">
            {TYPES.map((item) => (
              <button
                key={item.value}
                onClick={() => setType(item.value)}
                className="w-full text-right px-3 py-3 flex items-start gap-3"
                style={{ background: type === item.value ? 'var(--brand-soft)' : 'transparent', borderRadius: 7, color: type === item.value ? 'var(--brand)' : 'var(--text-2)' }}
              >
                <FileText size={17} className="mt-0.5 shrink-0" />
                <span><b className="block text-sm">{item.label}</b><span className="text-xs leading-5">{item.hint}</span></span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="font-bold text-lg mb-1">{current.label}</h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text-2)' }}>{current.hint}</p>
            {type === 'MINUTES' && (
              <SelectField
                label="المحضر"
                placeholder="اختر محضرًا"
                options={meetings.map((meeting) => ({ value: meeting.id, label: `${meeting.title} — ${meeting.councilName} — ${formatDate(meeting.date)}` }))}
                value={meetingId}
                onChange={(event) => setMeetingId(event.target.value)}
              />
            )}
            {type === 'DEPARTMENT' && (
              <SelectField label="القسم / اللجنة" options={departments.map((department) => ({ value: department.id, label: `${department.name} — ${department.councilName}` }))} value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} />
            )}
            {type === 'ASSIGNEE' && (
              <SelectField label="المسؤول" options={users.map((user) => ({ value: user.id, label: user.name }))} value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} />
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <div>
                <h3 className="font-bold">صيغة الإخراج</h3>
                <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>تستخدم جميع الصيغ شعار المركز والثيم والألوان المحفوظة.</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <button className="btn btn-ghost py-4" onClick={() => open('html')} disabled={disabled}><Eye size={18} /> معاينة</button>
              <button className="btn btn-primary py-4" onClick={() => open('pdf')} disabled={disabled}><Download size={18} /> تصدير PDF</button>
              <button className="btn btn-gold py-4" onClick={() => open('docx')} disabled={disabled}><FileType2 size={18} /> تصدير Word</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

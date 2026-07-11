import {
  ClipboardList, AlertTriangle, CheckCircle2, Gavel, Wallet, FileText, User,
} from 'lucide-react'
import { formatDate, formatMoney } from '@/lib/utils'
import { TaskStatusBadge, PriorityBadge } from '@/components/badges'
import { PAYMENT_STATUS_LABELS, type PaymentStatus } from '@/types'
import type { DepartmentReport, TaskBrief } from '@/lib/report'

export default function DepartmentReportView({ report, actions }: { report: DepartmentReport; actions?: React.ReactNode }) {
  const c = report.tasks.counts
  return (
    <div className="space-y-5">
      <div className="card p-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>تقرير {report.department.name}</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>
            {report.department.councilName}
            {report.department.managerName ? ` · المسؤول: ${report.department.managerName}` : ''}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>أُنشئ في {formatDate(report.generatedAt)}</p>
        </div>
        {actions}
      </div>

      {/* مؤشرات */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={ClipboardList} tone={['var(--info-bg)', 'var(--info)']} label="مفتوحة" value={c.open} />
        <Stat icon={AlertTriangle} tone={['var(--danger-bg)', 'var(--danger)']} label="متأخرة" value={c.overdue} />
        <Stat icon={CheckCircle2} tone={['var(--success-bg)', 'var(--success)']} label="منجزة" value={c.done} />
        <Stat icon={Wallet} tone={['var(--gold-bg)', 'var(--gold-dark)']} label="تكاليف فعلية" value={formatMoney(report.costs.totalActual)} />
      </div>

      {/* التكليفات */}
      <Block icon={ClipboardList} title="التكليفات المفتوحة والمتأخرة">
        {report.tasks.open.length === 0 ? <Empty text="لا تكليفات مفتوحة." /> : (
          <TaskList tasks={report.tasks.open} />
        )}
      </Block>

      {report.tasks.done.length > 0 && (
        <Block icon={CheckCircle2} title="التكليفات المنجزة">
          <TaskList tasks={report.tasks.done} />
        </Block>
      )}

      {/* القرارات */}
      <Block icon={Gavel} title="قرارات القسم">
        {report.decisions.length === 0 ? <Empty text="لا قرارات." /> : (
          <ul className="space-y-2">
            {report.decisions.map((d) => (
              <li key={d.id} className="px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--surface-2)' }}>
                <div className="font-semibold" style={{ color: 'var(--text-1)' }}>{d.title || d.content}</div>
                {d.title && <div style={{ color: 'var(--text-2)' }}>{d.content}</div>}
                <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{d.meetingTitle}{d.date ? ` · ${formatDate(d.date)}` : ''}</div>
              </li>
            ))}
          </ul>
        )}
      </Block>

      {/* التكاليف */}
      <Block icon={Wallet} title="تكاليف القسم">
        {report.costs.items.length === 0 ? <Empty text="لا تكاليف." /> : (
          <>
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {report.costs.items.map((c2) => (
                <div key={c2.id} className="py-2 flex items-center justify-between gap-2 text-sm flex-wrap">
                  <div className="min-w-0">
                    <div style={{ color: 'var(--text-1)' }}>{c2.description}</div>
                    {c2.responsibleName && <div className="text-xs flex items-center gap-1" style={{ color: 'var(--text-3)' }}><User size={11} /> {c2.responsibleName}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span dir="ltr" style={{ color: 'var(--text-2)' }}>{formatMoney(c2.actualAmount ?? c2.expectedAmount, c2.currency)}</span>
                    <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>{PAYMENT_STATUS_LABELS[c2.paymentStatus as PaymentStatus]}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t text-sm font-semibold" style={{ borderColor: 'var(--border)', color: 'var(--text-1)' }}>
              <span>الإجمالي</span>
              <span dir="ltr">متوقع {formatMoney(report.costs.totalExpected)} · فعلي {formatMoney(report.costs.totalActual)}</span>
            </div>
          </>
        )}
      </Block>

      {/* آخر اجتماع */}
      {report.lastMeeting && (
        <Block icon={FileText} title="ملاحظات آخر اجتماع">
          <div className="text-sm" style={{ color: 'var(--text-2)' }}>
            <div className="font-semibold mb-1" style={{ color: 'var(--text-1)' }}>{report.lastMeeting.title} · {formatDate(report.lastMeeting.date)}</div>
            {report.lastMeeting.summary && <p className="whitespace-pre-wrap mb-2">{report.lastMeeting.summary}</p>}
            {report.lastMeeting.notes.length > 0 && (
              <ul className="list-disc pr-5 space-y-1">{report.lastMeeting.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
            )}
            {!report.lastMeeting.summary && report.lastMeeting.notes.length === 0 && <Empty text="لا ملاحظات." />}
          </div>
        </Block>
      )}
    </div>
  )
}

function Stat({ icon: Icon, tone, label, value }: { icon: typeof Wallet; tone: [string, string]; label: string; value: string | number }) {
  return (
    <div className="card p-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: tone[0], color: tone[1] }}><Icon size={19} /></div>
      <div className="min-w-0">
        <div className="text-lg font-bold leading-none" style={{ color: 'var(--text-1)' }}>{value}</div>
        <div className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>{label}</div>
      </div>
    </div>
  )
}

function Block({ icon: Icon, title, children }: { icon: typeof Wallet; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
        <Icon size={18} style={{ color: 'var(--brand)' }} /> {title}
      </h3>
      {children}
    </div>
  )
}

function TaskList({ tasks }: { tasks: TaskBrief[] }) {
  return (
    <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
      {tasks.map((t) => (
        <div key={t.id} className="py-2 flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate" style={{ color: 'var(--text-1)' }}>{t.title}</div>
            <div className="text-xs" style={{ color: 'var(--text-3)' }}>
              {t.assigneeName ?? 'بلا مسؤول'}{t.dueDate ? ` · استحقاق ${formatDate(t.dueDate)}` : ''}
            </div>
          </div>
          <PriorityBadge priority={t.priority} />
          <TaskStatusBadge status={t.status} />
        </div>
      ))}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm" style={{ color: 'var(--text-3)' }}>{text}</p>
}

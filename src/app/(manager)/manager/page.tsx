import { ClipboardList, AlertTriangle, CheckCircle2, Wallet, Building2 } from 'lucide-react'
import { requireUser } from '@/lib/guard'
import { getManagerStats } from '@/lib/dashboard'
import { formatDate } from '@/lib/utils'
import StatCard from '@/components/StatCard'
import PageHeader from '@/components/PageHeader'
import { TaskStatusBadge, PriorityBadge } from '@/components/badges'

export default async function ManagerDashboard() {
  const user = await requireUser()
  const s = await getManagerStats(user.id)

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title={`أهلًا، ${user.name}`}
        subtitle={
          s.departments.length
            ? `أقسامك: ${s.departments.map((d) => d.name).join('، ')}`
            : 'لم يتم ربطك بأي قسم بعد — تواصل مع أمين السر.'
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <StatCard label="تكليفات مفتوحة" value={s.openTasks} icon={ClipboardList} tone="info" />
        <StatCard label="تكليفات متأخرة" value={s.overdueTasks} icon={AlertTriangle} tone="danger" />
        <StatCard label="تكليفات منجزة" value={s.doneTasks} icon={CheckCircle2} tone="success" />
        <StatCard label="تكاليف غير مسدّدة" value={s.unpaidCosts} icon={Wallet} tone="warning" />
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
          <Building2 size={18} style={{ color: 'var(--brand)' }} />
          <h3 className="font-bold" style={{ color: 'var(--text-1)' }}>
            آخر تكليفات القسم
          </h3>
        </div>

        {s.recentTasks.length === 0 ? (
          <p className="text-sm py-10 text-center" style={{ color: 'var(--text-3)' }}>
            لا توجد تكليفات بعد.
          </p>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {s.recentTasks.map((t) => (
              <div key={t.id} className="px-5 py-3 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-1)' }}>
                    {t.title}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                    {t.department?.name}
                    {t.assignee ? ` · ${t.assignee.name}` : ''}
                    {t.dueDate ? ` · استحقاق ${formatDate(t.dueDate)}` : ''}
                  </div>
                </div>
                <PriorityBadge priority={t.priority} />
                <TaskStatusBadge status={t.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

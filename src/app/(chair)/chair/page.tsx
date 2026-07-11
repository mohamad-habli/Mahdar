import {
  FileClock,
  FileCheck2,
  Building2,
  ClipboardList,
  AlertTriangle,
} from 'lucide-react'
import { requireUser } from '@/lib/guard'
import { getChairStats } from '@/lib/dashboard'
import StatCard from '@/components/StatCard'
import PageHeader from '@/components/PageHeader'
import UpcomingMeetings from '@/components/UpcomingMeetings'

export default async function ChairDashboard() {
  const user = await requireUser()
  const s = await getChairStats(user.organizationId)

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title={`أهلًا، ${user.name}`}
        subtitle="متابعة المجلس واعتماد المحاضر."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <StatCard label="محاضر بانتظار الاعتماد" value={s.pendingApproval} icon={FileClock} tone="warning" />
        <StatCard label="محاضر معتمدة" value={s.approvedCount} icon={FileCheck2} tone="success" />
        <StatCard label="الأقسام" value={s.departmentsCount} icon={Building2} tone="info" />
        <StatCard label="تكليفات مفتوحة" value={s.openTasks} icon={ClipboardList} tone="brand" hint={`${s.overdueTasks} متأخرة`} />
      </div>

      {s.overdueTasks > 0 && (
        <div
          className="card p-4 mb-6 flex items-center gap-3"
          style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger)' }}
        >
          <AlertTriangle size={20} style={{ color: 'var(--danger)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--danger)' }}>
            يوجد {s.overdueTasks} تكليف متأخر يحتاج إلى متابعة عبر مسؤولي الأقسام.
          </span>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <UpcomingMeetings meetings={s.upcoming} />
        <div className="card p-5">
          <h3 className="font-bold mb-3" style={{ color: 'var(--text-1)' }}>
            دورك في النظام
          </h3>
          <ul className="space-y-2 text-sm" style={{ color: 'var(--text-2)' }}>
            <li className="p-2.5 rounded-lg" style={{ background: 'var(--surface-2)' }}>
              مراجعة المحاضر واعتمادها أو إعادتها بملاحظات.
            </li>
            <li className="p-2.5 rounded-lg" style={{ background: 'var(--surface-2)' }}>
              الاطلاع على كل الأقسام وتقاريرها التنفيذية.
            </li>
            <li className="p-2.5 rounded-lg" style={{ background: 'var(--surface-2)' }}>
              متابعة التكليفات المتأخرة على مستوى المجلس.
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

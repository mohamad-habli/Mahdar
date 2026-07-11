import {
  Network,
  Building2,
  CalendarDays,
  FileText,
  ClipboardList,
  AlertTriangle,
  Users,
  Wallet,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'
import { requireUser } from '@/lib/guard'
import { getSecretaryStats } from '@/lib/dashboard'
import { formatMoney } from '@/lib/utils'
import StatCard from '@/components/StatCard'
import PageHeader from '@/components/PageHeader'
import UpcomingMeetings from '@/components/UpcomingMeetings'

export default async function SecretaryDashboard() {
  const user = await requireUser()
  const s = await getSecretaryStats(user.organizationId)

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title={`أهلًا، ${user.name}`}
        subtitle="نظرة شاملة على المجلس — من المحضر إلى الإنجاز."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <StatCard label="المجالس واللجان" value={s.councilsCount} icon={Network} tone="brand" />
        <StatCard label="الأقسام" value={s.departmentsCount} icon={Building2} tone="info" />
        <StatCard label="اجتماعات قادمة" value={s.upcomingMeetingsCount} icon={CalendarDays} tone="gold" />
        <StatCard label="المستخدمون" value={s.usersCount} icon={Users} tone="brand" />
        <StatCard label="محاضر مسودة" value={s.draftMinutes} icon={FileText} tone="warning" hint={`${s.inReviewMinutes} قيد المراجعة`} />
        <StatCard label="تكليفات مفتوحة" value={s.openTasks} icon={ClipboardList} tone="info" />
        <StatCard label="تكليفات متأخرة" value={s.overdueTasks} icon={AlertTriangle} tone="danger" />
        <StatCard label="إجمالي التكاليف الفعلية" value={formatMoney(s.totalActualCost)} icon={Wallet} tone="success" hint={`متوقع: ${formatMoney(s.totalExpectedCost)}`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <UpcomingMeetings meetings={s.upcoming} />
        </div>

        <div className="card p-5">
          <h3 className="font-bold mb-3" style={{ color: 'var(--text-1)' }}>
            البدء السريع
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>
            اتبع مسار العمل حتى لا تضيع أي نقطة من المحاضر السابقة:
          </p>
          <ul className="space-y-2 text-sm">
            {[
              { label: 'إنشاء مجلس أو لجنة وبناء الهيكل الشجري', href: '/secretary/councils' },
              { label: 'إضافة المستخدمين وتحديد أدوارهم', href: '/secretary/users' },
              { label: 'إنشاء اجتماع وتسجيل الحضور', href: '/secretary/meetings' },
              { label: 'مراجعة المحضر السابق وتسديد النقاط المفتوحة', href: '/secretary/meetings' },
              { label: 'كتابة المحضر الجديد وتحويل النقاط إلى تكليفات أو استحقاقات', href: '/secretary/meetings' },
              { label: 'متابعة التكليفات والاستحقاقات', href: '/secretary/tasks' },
              { label: 'عرض المواعيد في الروزنامة', href: '/secretary/calendar' },
              { label: 'استعراض شجرة المتابعة', href: '/secretary/tree' },
            ].map((item) => (
              <li
                key={item.label}
              >
                <Link
                  href={item.href}
                  className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-[var(--surface-3)] transition-colors"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}
                >
                  <ArrowLeft size={15} style={{ color: 'var(--gold-dark)' }} />
                  <span className="flex-1">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

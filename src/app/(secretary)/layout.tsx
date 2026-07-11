import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import AppShell, { type NavItem } from '@/components/AppShell'

const NAV: NavItem[] = [
  { href: '/secretary', label: 'لوحة التحكم', icon: 'LayoutDashboard' },
  { href: '/secretary/councils', label: 'المجالس واللجان', icon: 'Network' },
  { href: '/secretary/users', label: 'المستخدمون', icon: 'Users' },
  { href: '/secretary/meetings', label: 'الاجتماعات', icon: 'CalendarDays' },
  { href: '/secretary/tasks', label: 'التكليفات', icon: 'ClipboardList' },
  { href: '/secretary/deliverables', label: 'الاستحقاقات', icon: 'Milestone' },
  { href: '/secretary/today', label: 'متابعتي اليوم', icon: 'Inbox' },
  { href: '/secretary/calendar', label: 'الروزنامة', icon: 'CalendarRange' },
  { href: '/secretary/tree', label: 'شجرة المتابعة', icon: 'ListTree' },
  { href: '/secretary/archive', label: 'الأرشيف', icon: 'Archive' },
  { href: '/secretary/reports', label: 'التقارير', icon: 'FileBarChart' },
  { href: '/secretary/reminders', label: 'إعدادات التذكير', icon: 'BellRing' },
]

export default async function SecretaryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSession()
  if (!user) redirect('/login')
  if (user.role !== 'SECRETARY') redirect('/login')

  return (
    <AppShell user={user} nav={NAV} title="أمانة السر">
      {children}
    </AppShell>
  )
}

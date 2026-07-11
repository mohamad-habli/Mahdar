import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import AppShell, { type NavItem } from '@/components/AppShell'

const NAV: NavItem[] = [
  { href: '/manager', label: 'لوحة التحكم', icon: 'LayoutDashboard' },
  { href: '/manager/tasks', label: 'تكليفات قسمي', icon: 'ClipboardList' },
  { href: '/manager/today', label: 'متابعتي اليوم', icon: 'Inbox' },
  { href: '/manager/costs', label: 'التكاليف', icon: 'Wallet', ready: false },
  { href: '/manager/reports', label: 'تقرير القسم', icon: 'FileBarChart' },
  { href: '/manager/reminders', label: 'إعدادات التذكير', icon: 'BellRing' },
]

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSession()
  if (!user) redirect('/login')
  if (user.role !== 'DEPT_MANAGER') redirect('/login')

  return (
    <AppShell user={user} nav={NAV} title="إدارة القسم">
      {children}
    </AppShell>
  )
}

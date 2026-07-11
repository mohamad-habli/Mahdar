import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import AppShell, { type NavItem } from '@/components/AppShell'

const NAV: NavItem[] = [
  { href: '/chair', label: 'لوحة التحكم', icon: 'LayoutDashboard' },
  { href: '/chair/minutes', label: 'اعتماد المحاضر', icon: 'FileCheck2' },
  { href: '/chair/today', label: 'متابعتي اليوم', icon: 'Inbox' },
  { href: '/chair/departments', label: 'الأقسام', icon: 'Building2', ready: false },
  { href: '/chair/reports', label: 'التقارير', icon: 'FileBarChart' },
  { href: '/chair/reminders', label: 'إعدادات التذكير', icon: 'BellRing' },
]

export default async function ChairLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSession()
  if (!user) redirect('/login')
  if (user.role !== 'CHAIR') redirect('/login')

  return (
    <AppShell user={user} nav={NAV} title="رئاسة المجلس">
      {children}
    </AppShell>
  )
}

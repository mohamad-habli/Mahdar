import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import AppShell, { type NavItem } from '@/components/AppShell'

const NAV: NavItem[] = [
  { href: '/member', label: 'لوحة التحكم', icon: 'LayoutDashboard' },
  { href: '/member/tasks', label: 'تكليفاتي', icon: 'ClipboardList' },
  { href: '/member/today', label: 'متابعتي اليوم', icon: 'Inbox' },
  { href: '/member/minutes', label: 'المحاضر', icon: 'FileText', ready: false },
  { href: '/member/reminders', label: 'إعدادات التذكير', icon: 'BellRing' },
]

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSession()
  if (!user) redirect('/login')
  if (user.role !== 'MEMBER') redirect('/login')

  return (
    <AppShell user={user} nav={NAV} title="عضو المجلس">
      {children}
    </AppShell>
  )
}

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import AppShell, { type NavItem } from '@/components/AppShell'

const NAV: NavItem[] = [
  { href: '/super', label: 'المراكز', icon: 'Building2' },
  { href: '/super/reminders', label: 'إعدادات التذكير', icon: 'BellRing' },
]

export default async function SuperLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()
  if (!user) redirect('/login')
  if (user.role !== 'SUPER_USER') redirect('/login')

  return (
    <AppShell user={user} nav={NAV} title="مدير النظام">
      {children}
    </AppShell>
  )
}

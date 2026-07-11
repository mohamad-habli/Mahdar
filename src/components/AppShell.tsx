'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LogOut,
  Menu,
  LayoutDashboard,
  Network,
  Users,
  CalendarDays,
  ClipboardList,
  CalendarRange,
  Archive,
  FileBarChart,
  FileCheck2,
  Building2,
  Wallet,
  FileText,
  ListTree,
  BellRing,
  Milestone,
  Inbox,
  type LucideIcon,
} from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import NotificationBell from './NotificationBell'
import Logo from './Logo'
import { cn } from '@/lib/utils'
import { ROLE_LABELS, type UserRole } from '@/types'

// سجل الأيقونات — نمرّر اسم الأيقونة (نص) من Server Component
// لأن React لا يسمح بتمرير المكوّنات كـ props إلى Client Components.
const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Network,
  Users,
  CalendarDays,
  ClipboardList,
  CalendarRange,
  Archive,
  FileBarChart,
  FileCheck2,
  Building2,
  Wallet,
  FileText,
  ListTree,
  BellRing,
  Milestone,
  Inbox,
}

export type IconName = keyof typeof ICONS

export interface NavItem {
  href: string
  label: string
  icon: IconName
  ready?: boolean // قيد البناء؟
}

interface Props {
  user: { name: string; role: UserRole; jobTitle?: string | null }
  nav: NavItem[]
  title: string
  children: React.ReactNode
}

export default function AppShell({ user, nav, title, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
  }

  const SidebarContent = (
    <div className="flex flex-col h-full">
      {/* الشعار */}
      <div className="flex items-center gap-3 px-5 h-16 border-b" style={{ borderColor: 'var(--border)' }}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--brand)' }}
        >
          <Logo size={20} color="#fff" />
        </div>
        <div className="leading-tight">
          <div className="font-bold" style={{ color: 'var(--text-1)' }}>
            محضر
          </div>
          <div className="text-[11px]" style={{ color: 'var(--text-3)' }}>
            {title}
          </div>
        </div>
      </div>

      {/* التنقّل */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {nav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== nav[0].href && pathname.startsWith(item.href))
          const Icon = ICONS[item.icon] ?? LayoutDashboard
          const disabled = item.ready === false

          if (disabled) {
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm cursor-default select-none"
                style={{ color: 'var(--text-3)' }}
              >
                <Icon size={19} />
                <span className="flex-1">{item.label}</span>
                <span
                  className="badge"
                  style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}
                >
                  قريبًا
                </span>
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors'
              )}
              style={
                active
                  ? { background: 'var(--brand)', color: '#fff' }
                  : { color: 'var(--text-2)' }
              }
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* المستخدم */}
      <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3 px-2 py-2">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold shrink-0"
            style={{ background: 'var(--gold-bg)', color: 'var(--gold-dark)' }}
          >
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0 leading-tight">
            <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>
              {user.name}
            </div>
            <div className="text-[11px] truncate" style={{ color: 'var(--text-3)' }}>
              {user.jobTitle || ROLE_LABELS[user.role]}
            </div>
          </div>
          <button
            onClick={logout}
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }}
            title="تسجيل الخروج"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh flex" style={{ background: 'var(--bg)' }}>
      {/* الشريط الجانبي — سطح المكتب */}
      <aside
        className="hidden lg:flex w-64 shrink-0 flex-col border-l sticky top-0 h-dvh"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {SidebarContent}
      </aside>

      {/* الشريط الجانبي — الموبايل */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside
            className="relative w-64 flex flex-col border-l"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* المحتوى */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* الشريط العلوي */}
        <header
          className="h-16 shrink-0 sticky top-0 z-30 flex items-center gap-3 px-4 lg:px-6 border-b backdrop-blur"
          style={{
            background: 'color-mix(in srgb, var(--surface) 85%, transparent)',
            borderColor: 'var(--border)',
          }}
        >
          <button
            onClick={() => setOpen(true)}
            className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ color: 'var(--text-2)', background: 'var(--surface-2)' }}
          >
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <NotificationBell />
          <ThemeToggle />
        </header>

        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}

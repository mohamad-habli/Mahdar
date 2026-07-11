'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, CalendarClock, ClipboardList, FileBarChart, Info } from 'lucide-react'
import { apiSend } from '@/lib/client'

interface Notif {
  id: string; type: string; title: string; body: string | null; link: string | null; isRead: boolean; createdAt: string
}

const ICONS: Record<string, typeof Bell> = {
  MEETING_REMINDER: CalendarClock,
  TASK_ASSIGNED: ClipboardList,
  TASK_REMINDER: ClipboardList,
  DELIVERABLE_REMINDER: CalendarClock,
  DEPARTMENT_REPORT: FileBarChart,
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'الآن'
  if (m < 60) return `قبل ${m} د`
  const h = Math.floor(m / 60)
  if (h < 24) return `قبل ${h} س`
  const d = Math.floor(h / 24)
  return `قبل ${d} يوم`
}

export default function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      const json = await res.json()
      if (json.success) { setItems(json.data.items); setUnread(json.data.unread) }
    } catch { /* تجاهل */ }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 45000)
    return () => clearInterval(t)
  }, [load])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function markAll() {
    await apiSend('/api/notifications/read', 'POST', {})
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnread(0)
  }

  async function onItem(n: Notif) {
    if (!n.isRead) {
      await apiSend('/api/notifications/read', 'POST', { id: n.id })
      setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, isRead: true } : x))
      setUnread((u) => Math.max(0, u - 1))
    }
    if (n.link) { setOpen(false); router.push(n.link) }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)}
        className="w-9 h-9 rounded-lg flex items-center justify-center relative"
        style={{ color: 'var(--text-2)', background: 'var(--surface-2)' }}
        aria-label="الإشعارات">
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{ background: 'var(--danger)', color: '#fff' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-80 max-w-[90vw] rounded-xl overflow-hidden z-50 card"
          style={{ boxShadow: 'var(--shadow-lg)' }}>
          <div className="flex items-center justify-between px-4 h-12 border-b" style={{ borderColor: 'var(--border)' }}>
            <span className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>الإشعارات</span>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs flex items-center gap-1" style={{ color: 'var(--brand)' }}>
                <CheckCheck size={14} /> تعليم الكل كمقروء
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-sm text-center py-10" style={{ color: 'var(--text-3)' }}>لا إشعارات.</p>
            ) : items.map((n) => {
              const Icon = ICONS[n.type] ?? Info
              return (
                <button key={n.id} onClick={() => onItem(n)}
                  className="w-full text-right px-4 py-3 flex gap-3 border-b hover:bg-[var(--surface-2)] transition-colors"
                  style={{ borderColor: 'var(--border)', background: n.isRead ? 'transparent' : 'var(--brand-soft)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--surface-2)', color: 'var(--brand)' }}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{n.title}</div>
                    {n.body && <div className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{n.body}</div>}
                    <div className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>{timeAgo(n.createdAt)}</div>
                  </div>
                  {!n.isRead && <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: 'var(--brand)' }} />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Send, FileSpreadsheet, Loader2, Check } from 'lucide-react'
import { apiSend } from '@/lib/client'

export default function ReportControls({
  departments, selectedId, canSend,
}: {
  departments: { id: string; name: string }[]
  selectedId: string
  canSend: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function send() {
    setSending(true); setSent(false)
    const res = await apiSend(`/api/reports/department/${selectedId}/send`, 'POST')
    setSending(false)
    if (!res.success) { alert(res.error); return }
    setSent(true)
    setTimeout(() => setSent(false), 3000)
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {departments.length > 1 && (
        <select className="input w-auto" value={selectedId}
          onChange={(e) => router.push(`${pathname}?dept=${e.target.value}`)}>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      )}
      {selectedId && (
        <a href={`/api/reports/department/${selectedId}/excel`} className="btn btn-ghost">
          <FileSpreadsheet size={16} /> Excel
        </a>
      )}
      {canSend && selectedId && (
        <button className="btn btn-primary" onClick={send} disabled={sending}>
          {sending ? <Loader2 size={16} className="animate-spin" /> : sent ? <Check size={16} /> : <Send size={16} />}
          {sent ? 'أُرسل' : 'إرسال للمسؤول'}
        </button>
      )}
    </div>
  )
}

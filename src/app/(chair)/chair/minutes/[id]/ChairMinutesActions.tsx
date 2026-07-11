'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Undo2, Lock, Loader2 } from 'lucide-react'
import { apiSend } from '@/lib/client'

export default function ChairMinutesActions({ minutesId, status }: { minutesId: string; status: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function act(action: 'approve' | 'return' | 'lock') {
    setBusy(true)
    const res = await apiSend(`/api/minutes/${minutesId}`, 'PATCH', { action })
    setBusy(false)
    if (!res.success) { alert(res.error); return }
    router.refresh()
  }

  if (status === 'IN_REVIEW') {
    return (
      <div className="flex items-center gap-2">
        <button className="btn btn-ghost" onClick={() => act('return')} disabled={busy}>
          <Undo2 size={16} /> إعادة لمسودة
        </button>
        <button className="btn btn-primary" onClick={() => act('approve')} disabled={busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} اعتماد
        </button>
      </div>
    )
  }
  if (status === 'APPROVED') {
    return (
      <button className="btn btn-gold" onClick={() => act('lock')} disabled={busy}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />} إقفال المحضر
      </button>
    )
  }
  return null
}

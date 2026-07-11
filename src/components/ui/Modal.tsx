'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export default function Modal({ open, onClose, title, children, footer }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="card relative w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto rounded-b-none sm:rounded-2xl"
        style={{ boxShadow: 'var(--shadow-lg)' }}
      >
        <div
          className="sticky top-0 flex items-center justify-between px-5 h-14 border-b z-10"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <h3 className="font-bold" style={{ color: 'var(--text-1)' }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ color: 'var(--text-2)', background: 'var(--surface-2)' }}
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && (
          <div
            className="sticky bottom-0 flex items-center justify-end gap-2 px-5 py-3 border-t"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

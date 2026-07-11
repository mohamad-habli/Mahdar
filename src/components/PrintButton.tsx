'use client'

import { useEffect } from 'react'
import { Printer } from 'lucide-react'

export default function PrintButton({ auto = false }: { auto?: boolean }) {
  useEffect(() => {
    if (auto) {
      const t = setTimeout(() => window.print(), 600)
      return () => clearTimeout(t)
    }
  }, [auto])

  return (
    <button onClick={() => window.print()} className="btn btn-primary no-print">
      <Printer size={16} /> طباعة / حفظ PDF
    </button>
  )
}

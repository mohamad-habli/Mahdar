import type { Metadata, Viewport } from 'next'
import { Cairo } from 'next/font/google'
import './globals.css'

// تهيئة الثيم قبل أول رسم — يمنع وميض الوضع الداكن
const THEME_INIT = `(function(){try{var t=localStorage.getItem('majles-theme')||'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-cairo',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'محضر — من المحضر إلى الإنجاز',
  description:
    'نظام إدارة المجالس والاجتماعات: المحاضر، القرارات، التكليفات، والمتابعة التنفيذية',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1E2A4A' },
    { media: '(prefers-color-scheme: dark)', color: '#0D1322' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className={`${cairo.variable} antialiased`}>{children}</body>
    </html>
  )
}

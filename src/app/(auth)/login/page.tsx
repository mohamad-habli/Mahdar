'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Lock, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import Logo from '@/components/Logo'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error ?? 'تعذّر تسجيل الدخول')
        setLoading(false)
        return
      }
      router.replace(data.data.redirectTo)
    } catch {
      setError('تعذّر الاتصال بالخادم')
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-dvh grid lg:grid-cols-2"
      style={{ background: 'var(--bg)' }}
    >
      {/* الجانب التعريفي */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 text-white relative overflow-hidden"
        style={{
          background:
            'linear-gradient(160deg, var(--brand-dark), var(--brand) 60%, var(--brand-light))',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--gold)' }}
          >
            <Logo size={26} color="#1a1400" />
          </div>
          <div>
            <div className="text-2xl font-bold">محضر</div>
            <div className="text-sm opacity-80">Mahdar</div>
          </div>
        </div>

        <div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            من المحضر
            <br /> إلى الإنجاز
          </h1>
          <p className="text-lg opacity-85 max-w-md leading-relaxed">
            حوِّل اجتماعات مجلسك إلى متابعة تنفيذية واضحة: محاضر منظّمة، قرارات
            وتكليفات لها مسؤول وموعد وحالة، وتقارير بضغطة زر.
          </p>
        </div>

        <div className="text-sm opacity-70">
          نظام إدارة المجالس والاجتماعات
        </div>

        {/* زخرفة ذهبية */}
        <div
          className="absolute -left-24 -bottom-24 w-72 h-72 rounded-full opacity-10"
          style={{ background: 'var(--gold)' }}
        />
      </div>

      {/* نموذج الدخول */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* شعار للموبايل */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--brand)' }}
            >
              <Logo size={26} color="#fff" />
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>
              محضر
            </div>
          </div>

          <h2
            className="text-2xl font-bold mb-1"
            style={{ color: 'var(--text-1)' }}
          >
            تسجيل الدخول
          </h2>
          <p className="mb-7 text-sm" style={{ color: 'var(--text-2)' }}>
            أدخل بياناتك للوصول إلى لوحتك
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block mb-1.5 text-sm font-semibold"
                style={{ color: 'var(--text-2)' }}
              >
                اسم المستخدم
              </label>
              <div className="relative">
                <User
                  size={18}
                  className="absolute top-1/2 -translate-y-1/2 right-3"
                  style={{ color: 'var(--text-3)' }}
                />
                <input
                  className="input pr-10"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="مثال: amin"
                  autoComplete="username"
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                />
              </div>
            </div>

            <div>
              <label
                className="block mb-1.5 text-sm font-semibold"
                style={{ color: 'var(--text-2)' }}
              >
                كلمة المرور
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute top-1/2 -translate-y-1/2 right-3"
                  style={{ color: 'var(--text-3)' }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10 pl-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg"
                  style={{ color: 'var(--text-3)' }}
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                className="text-sm rounded-lg px-3 py-2"
                style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <ArrowLeft size={18} />
              )}
              {loading ? 'جارٍ الدخول…' : 'دخول'}
            </button>
          </form>

          <p
            className="mt-8 text-center text-xs"
            style={{ color: 'var(--text-3)' }}
          >
            هل نسيت بياناتك؟ تواصل مع أمين سر المجلس.
          </p>
        </div>
      </div>
    </div>
  )
}

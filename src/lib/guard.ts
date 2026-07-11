import { redirect } from 'next/navigation'
import { getSession } from './auth'
import type { AuthUser, UserRole } from '@/types'

// يُستخدم داخل Server Components فقط.
// يضمن وجود جلسة صالحة لمستخدم فعّال — وإلا يعيد التوجيه للدخول.
// (يعالج حالة التوكن الموقّع لمستخدم محذوف/معطّل.)
export async function requireUser(roles?: UserRole[]): Promise<AuthUser> {
  const user = await getSession()
  if (!user) redirect('/login')
  if (roles && !roles.includes(user.role)) redirect('/login')
  return user
}

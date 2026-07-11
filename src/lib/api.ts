import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { getSession } from './auth'
import type { AuthUser, UserRole } from '@/types'

// خطأ يحمل رمز حالة HTTP
export class ApiError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

// يتحقق من الجلسة والدور، ويعيد المستخدم — أو يرمي ApiError
export async function authorize(allowedRoles?: UserRole[]): Promise<AuthUser> {
  const user = await getSession()
  if (!user) throw new ApiError('يرجى تسجيل الدخول', 401)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new ApiError('ليس لديك صلاحية لهذا الإجراء', 403)
  }
  return user
}

// يغلّف معالج الـ route ويحوّل الأخطاء إلى استجابات JSON موحّدة
export function handle(
  fn: () => Promise<NextResponse | Response>
): Promise<NextResponse | Response> {
  return fn().catch((err: unknown) => {
    if (err instanceof ApiError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status })
    }
    if (err instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: err.issues[0]?.message ?? 'بيانات غير صحيحة' },
        { status: 400 }
      )
    }
    console.error('[API ERROR]', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  })
}

export function ok<T>(data?: T) {
  return NextResponse.json({ success: true, data })
}

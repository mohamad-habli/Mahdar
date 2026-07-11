import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'majles-secret-change-in-production-please'
)
const TOKEN_COOKIE = 'majles_token'

// المسار الجذري لكل دور
const ROLE_HOME: Record<string, string> = {
  SUPER_USER: '/super',
  SECRETARY: '/secretary',
  CHAIR: '/chair',
  DEPT_MANAGER: '/manager',
  MEMBER: '/member',
}

// أي بادئة مسار مسموحة لكل دور
const ROLE_PREFIX: Record<string, string> = {
  SUPER_USER: '/super',
  SECRETARY: '/secretary',
  CHAIR: '/chair',
  DEPT_MANAGER: '/manager',
  MEMBER: '/member',
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isProtected =
    pathname.startsWith('/secretary') ||
    pathname.startsWith('/super') ||
    pathname.startsWith('/chair') ||
    pathname.startsWith('/manager') ||
    pathname.startsWith('/member')

  const token = req.cookies.get(TOKEN_COOKIE)?.value

  let role: string | null = null
  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET)
      role = (payload as { role?: string }).role ?? null
    } catch {
      role = null
    }
  }

  // ملاحظة: لا نحوّل /login → اللوحة هنا عمدًا.
  // لو حوّلنا، ووُجد توكن موقّع لمستخدم محذوف/معطّل، تنشأ حلقة لا نهائية:
  // اللوحة تعيد إلى /login (لأن المستخدم غير موجود) و/login يعيد إلى اللوحة…
  // إبقاء /login متاحًا دائمًا يكسر الحلقة. (الجذر "/" يوجّه المستخدم الصالح للوحته.)

  if (!isProtected) return NextResponse.next()

  // مسار محمي بلا جلسة صالحة → الدخول
  if (!role) {
    const url = new URL('/login', req.url)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // منع الوصول لمنطقة دور آخر
  const allowedPrefix = ROLE_PREFIX[role]
  if (allowedPrefix && !pathname.startsWith(allowedPrefix)) {
    return NextResponse.redirect(new URL(ROLE_HOME[role] ?? '/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/login', '/super/:path*', '/secretary/:path*', '/chair/:path*', '/manager/:path*', '/member/:path*'],
}

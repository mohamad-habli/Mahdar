import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  signAccessToken,
  verifyPassword,
  defaultPathForRole,
  TOKEN_COOKIE,
} from '@/lib/auth'
import { UserRole } from '@/types'

const schema = z.object({
  username: z.string().trim().min(1, 'اسم المستخدم مطلوب'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'بيانات غير صحيحة' },
        { status: 400 }
      )
    }

    const { username, password } = parsed.data

    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      include: { organization: { select: { isActive: true } } },
    })

    if (!user || !user.isActive || (user.role !== 'SUPER_USER' && !user.organization.isActive)) {
      return NextResponse.json(
        { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' },
        { status: 401 }
      )
    }

    const ok = await verifyPassword(password, user.passwordHash)
    if (!ok) {
      return NextResponse.json(
        { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' },
        { status: 401 }
      )
    }

    const token = await signAccessToken({
      userId: user.id,
      role: user.role as UserRole,
      organizationId: user.organizationId,
    })

    const redirectTo = defaultPathForRole(user.role as UserRole)

    const res = NextResponse.json({
      success: true,
      data: { redirectTo, role: user.role, name: user.name },
    })

    res.cookies.set(TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 12, // 12 ساعة
    })

    return res
  } catch {
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء تسجيل الدخول' },
      { status: 500 }
    )
  }
}

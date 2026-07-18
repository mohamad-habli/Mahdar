import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from './prisma'
import { JwtPayload, AuthUser, UserRole } from '@/types'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'majles-secret-change-in-production-please'
)
const ACCESS_TOKEN_EXPIRES = '12h'
export const TOKEN_COOKIE = 'majles_token'

// ============================================================
//  توليد الـ Token والتحقق منه
// ============================================================
export async function signAccessToken(payload: JwtPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRES)
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as JwtPayload
  } catch {
    return null
  }
}

// ============================================================
//  قراءة الجلسة الحالية
// ============================================================
export async function getSession(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(TOKEN_COOKIE)?.value
    if (!token) return null

    const payload = await verifyToken(token)
    if (!payload) return null

    const user = await prisma.user.findFirst({
      where: { id: payload.userId, isActive: true },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        organizationId: true,
        jobTitle: true,
        phone: true,
        email: true,
        avatarUrl: true,
        organization: { select: { isActive: true } },
      },
    })

    if (!user) return null
    if (user.role !== 'SUPER_USER' && !user.organization.isActive) return null
    const { organization: _organization, ...authUser } = user
    return authUser as AuthUser
  } catch {
    return null
  }
}

// ============================================================
//  التحقق من الصلاحيات
// ============================================================
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SUPER_USER: ['organizations:*', 'users:*', 'centers:*'],
  SECRETARY: ['*'], // أمين السر: كل شيء داخل المجلس
  CHAIR: [
    'councils:read',
    'meetings:read',
    'minutes:read',
    'minutes:approve',
    'minutes:lock',
    'tasks:read',
    'costs:read',
    'reports:read',
    'departments:read',
  ],
  DEPT_MANAGER: [
    'departments:read:own',
    'tasks:read:own',
    'tasks:update:own', // تحديث حالة التنفيذ
    'tasks:note:own',
    'costs:read:own',
    'minutes:read:own',
    'reports:read:own',
  ],
  MEMBER: [
    'self:read',
    'tasks:read:own',
    'tasks:update:own',
    'minutes:read:allowed',
    'meetings:read:allowed',
  ],
}

export function hasPermission(role: UserRole, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role]
  if (!perms) return false
  if (perms.includes('*')) return true
  return perms.some((p) => p === permission || p.startsWith(permission))
}

export function requireRole(userRole: UserRole, allowed: UserRole[]): boolean {
  return allowed.includes(userRole)
}

export async function requireAuth(allowedRoles?: UserRole[]): Promise<AuthUser> {
  const user = await getSession()
  if (!user) throw new Error('غير مصرح: يرجى تسجيل الدخول')
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new Error('غير مصرح: ليس لديك صلاحية لهذا الإجراء')
  }
  return user
}

// المسار الافتراضي لكل دور بعد الدخول
export function defaultPathForRole(role: UserRole): string {
  switch (role) {
    case 'SUPER_USER':
      return '/super'
    case 'SECRETARY':
      return '/secretary'
    case 'CHAIR':
      return '/chair'
    case 'DEPT_MANAGER':
      return '/manager'
    case 'MEMBER':
      return '/member'
    default:
      return '/login'
  }
}

// ============================================================
//  كلمة المرور
// ============================================================
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs')
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const bcrypt = await import('bcryptjs')
  return bcrypt.compare(password, hash)
}

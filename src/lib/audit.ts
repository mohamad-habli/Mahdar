import { prisma } from './prisma'

// تسجيل حدث في سجل التدقيق — من فعل ماذا ومتى
export async function logAudit(params: {
  organizationId: string
  userId?: string | null
  action: string // CREATE | UPDATE | DELETE | APPROVE | LOCK | SEND …
  entityType: string
  entityId: string
  details?: Record<string, unknown>
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        details: JSON.stringify(params.details ?? {}),
      },
    })
  } catch {
    // لا نُفشل العملية الأساسية بسبب فشل التسجيل
  }
}

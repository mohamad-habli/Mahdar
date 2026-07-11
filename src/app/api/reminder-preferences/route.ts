import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { handle, ok, ApiError } from '@/lib/api'
import { getSession } from '@/lib/auth'

const defaults = {
  enabled: true,
  taskEnabled: true,
  deliverableEnabled: true,
  periodicEnabled: true,
  intervalDays: 1,
  reminderTime: '09:00',
  beforeDueEnabled: true,
  beforeDueHours: [24, 3],
  includeOverdue: true,
}

const schema = z.object({
  enabled: z.boolean(),
  taskEnabled: z.boolean(),
  deliverableEnabled: z.boolean(),
  periodicEnabled: z.boolean(),
  intervalDays: z.number().int().min(1).max(30),
  reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  beforeDueEnabled: z.boolean(),
  beforeDueHours: z.array(z.number().int().min(1).max(720)).max(10),
  includeOverdue: z.boolean(),
})

function parseHours(value: string): number[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item) => Number.isInteger(item)) : defaults.beforeDueHours
  } catch {
    return defaults.beforeDueHours
  }
}

export async function GET() {
  return handle(async () => {
    const me = await getSession()
    if (!me) throw new ApiError('يرجى تسجيل الدخول', 401)
    const preference = await prisma.reminderPreference.findUnique({ where: { userId: me.id } })
    if (!preference) return ok(defaults)
    return ok({ ...preference, beforeDueHours: parseHours(preference.beforeDueHours) })
  })
}

export async function PUT(req: Request) {
  return handle(async () => {
    const me = await getSession()
    if (!me) throw new ApiError('يرجى تسجيل الدخول', 401)
    const body = schema.parse(await req.json())
    const data = { ...body, beforeDueHours: JSON.stringify(Array.from(new Set(body.beforeDueHours)).sort((a, b) => b - a)) }
    const preference = await prisma.reminderPreference.upsert({
      where: { userId: me.id },
      create: { userId: me.id, ...data },
      update: data,
    })
    return ok({ ...preference, beforeDueHours: parseHours(preference.beforeDueHours) })
  })
}

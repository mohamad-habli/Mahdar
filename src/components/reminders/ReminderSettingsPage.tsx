import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/guard'
import ReminderSettingsClient, { type ReminderSettings } from './ReminderSettingsClient'

const defaults: ReminderSettings = {
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

export default async function ReminderSettingsPage() {
  const me = await requireUser()
  const preference = await prisma.reminderPreference.findUnique({ where: { userId: me.id } })
  let beforeDueHours = defaults.beforeDueHours
  if (preference) {
    try {
      const parsed = JSON.parse(preference.beforeDueHours)
      if (Array.isArray(parsed)) beforeDueHours = parsed
    } catch {
      // نستخدم القيم الافتراضية عند وجود بيانات قديمة غير صالحة.
    }
  }
  const initial: ReminderSettings = preference
    ? {
        enabled: preference.enabled,
        taskEnabled: preference.taskEnabled,
        deliverableEnabled: preference.deliverableEnabled,
        periodicEnabled: preference.periodicEnabled,
        intervalDays: preference.intervalDays,
        reminderTime: preference.reminderTime,
        beforeDueEnabled: preference.beforeDueEnabled,
        beforeDueHours,
        includeOverdue: preference.includeOverdue,
      }
    : defaults

  return <ReminderSettingsClient initial={initial} />
}

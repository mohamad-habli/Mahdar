import { prisma } from './prisma'
import { formatDate } from './utils'

export type ReminderOffset = 'DAY_BEFORE' | 'HOURS_3' | 'HOUR_1'

export const REMINDER_LABELS: Record<ReminderOffset, string> = {
  DAY_BEFORE: 'قبل يوم',
  HOURS_3: 'قبل 3 ساعات',
  HOUR_1: 'قبل ساعة',
}

// إشعار داخلي بسيط
export async function notify(params: {
  organizationId: string
  userId: string
  type: string
  title: string
  body?: string
  link?: string
}): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body ?? null,
        link: params.link ?? null,
      },
    })
  } catch {
    /* لا نُفشل العملية الأساسية */
  }
}

// إشعار تكليف عضو — برابط صحيح حسب دوره
export async function notifyTaskAssigned(organizationId: string, assigneeId: string, title: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: assigneeId }, select: { role: true } })
  if (!user) return
  const link = user.role === 'DEPT_MANAGER' ? '/manager/tasks' : '/member/tasks'
  await notify({ organizationId, userId: assigneeId, type: 'TASK_ASSIGNED', title: 'تكليف جديد', body: title, link })
}

// لحظة إطلاق التذكير = موعد الاجتماع (بوقت البداية) ناقص الإزاحة
export function reminderTime(meetingDate: Date, startTime: string | null, offset: ReminderOffset): Date {
  const base = new Date(meetingDate)
  if (startTime && /^\d{1,2}:\d{2}$/.test(startTime)) {
    const [h, m] = startTime.split(':').map(Number)
    base.setHours(h, m, 0, 0)
  } else {
    base.setHours(9, 0, 0, 0)
  }
  if (offset === 'DAY_BEFORE') base.setDate(base.getDate() - 1)
  else if (offset === 'HOURS_3') base.setHours(base.getHours() - 3)
  else if (offset === 'HOUR_1') base.setHours(base.getHours() - 1)
  return base
}

// إنشاء تذكيرات اجتماع من إزاحات المجلس الافتراضية
export async function createMeetingReminders(meetingId: string): Promise<void> {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { council: { select: { reminderOffsets: true } } },
  })
  if (!meeting) return

  let offsets: ReminderOffset[] = ['DAY_BEFORE']
  try {
    const parsed = JSON.parse(meeting.council.reminderOffsets)
    if (Array.isArray(parsed) && parsed.length) offsets = parsed
  } catch {
    /* تجاهل */
  }

  await prisma.meetingReminder.createMany({
    data: offsets.map((o) => ({
      meetingId,
      offsetType: o,
      scheduledFor: reminderTime(meeting.meetingDate, meeting.startTime, o),
      channel: 'IN_APP',
      status: 'PENDING',
    })),
  })
}

// معالجة التذكيرات المستحقّة: تحويلها إلى إشعارات لأعضاء المجلس
// تُستدعى عند جلب الإشعارات (بديل عن cron في التطوير).
export async function processDueReminders(organizationId: string): Promise<void> {
  const now = new Date()
  await generatePersonalReminders(organizationId, now)

  const personalAndTaskReminders = await prisma.reminder.findMany({
    where: {
      organizationId,
      status: 'PENDING',
      channel: 'IN_APP',
      scheduledFor: { lte: now },
    },
    include: {
      user: { select: { role: true } },
      task: { select: { title: true, status: true } },
      deliverable: { select: { title: true, status: true } },
    },
    orderBy: { scheduledFor: 'asc' },
    take: 100,
  })

  for (const reminder of personalAndTaskReminders) {
    const target = reminder.task ?? reminder.deliverable
    const closed = !target || ['DONE', 'CANCELLED'].includes(target.status)
    if (closed) {
      await prisma.reminder.update({ where: { id: reminder.id }, data: { status: 'CANCELLED' } })
      continue
    }

    const isTask = reminder.targetType === 'TASK'
    const roleRoot = reminder.user.role === 'DEPT_MANAGER'
      ? '/manager'
      : reminder.user.role === 'MEMBER'
        ? '/member'
        : reminder.user.role === 'CHAIR'
          ? '/chair'
          : reminder.user.role === 'SUPER_USER'
            ? '/super'
            : '/secretary'
    const link = isTask
      ? `${roleRoot}/tasks`
      : reminder.user.role === 'SECRETARY'
        ? '/secretary/calendar'
        : roleRoot
    const nextDate = new Date(now)
    nextDate.setDate(nextDate.getDate() + 1)

    await prisma.$transaction([
      prisma.notification.create({
        data: {
          organizationId,
          userId: reminder.userId,
          type: isTask ? 'TASK_REMINDER' : 'DELIVERABLE_REMINDER',
          title: isTask ? 'تذكير بتكليف' : 'تذكير باستحقاق',
          body: target.title,
          link,
        },
      }),
      prisma.reminder.update({
        where: { id: reminder.id },
        data: reminder.repeatUntilClosed
          ? { status: 'PENDING', sentAt: now, scheduledFor: nextDate }
          : { status: 'SENT', sentAt: now },
      }),
    ])
  }

  const due = await prisma.meetingReminder.findMany({
    where: {
      status: 'PENDING',
      channel: 'IN_APP',
      scheduledFor: { lte: now },
      meeting: { status: 'SCHEDULED', council: { organizationId } },
    },
    include: {
      meeting: {
        include: {
          council: { select: { name: true, members: { where: { isActive: true }, select: { userId: true } } } },
        },
      },
    },
    take: 50,
  })

  for (const r of due) {
    const m = r.meeting
    // لا نرسل لاجتماع انتهى موعده فعلًا
    if (m.meetingDate < new Date(now.getTime() - 6 * 3600_000)) {
      await prisma.meetingReminder.update({ where: { id: r.id }, data: { status: 'SENT', sentAt: now } })
      continue
    }
    const label = REMINDER_LABELS[r.offsetType as ReminderOffset] ?? 'تذكير'
    const body = `${m.council.name} · ${formatDate(m.meetingDate)}${m.startTime ? ` · ${m.startTime}` : ''}${m.location ? ` · ${m.location}` : ''}`

    await prisma.$transaction([
      prisma.notification.createMany({
        data: m.council.members.map((mem) => ({
          organizationId,
          userId: mem.userId,
          type: 'MEETING_REMINDER',
          title: `تذكير (${label}): ${m.title}`,
          body,
          link: null,
        })),
      }),
      prisma.meetingReminder.update({ where: { id: r.id }, data: { status: 'SENT', sentAt: now } }),
    ])
  }
}

function parseHours(value: string): number[] {
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return Array.from(new Set(parsed.filter((item): item is number => Number.isInteger(item) && item > 0 && item <= 720)))
  } catch {
    return []
  }
}

function dayKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function calendarDaysBetween(start: Date, end: Date): number {
  const a = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
  const b = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime()
  return Math.floor((b - a) / 86_400_000)
}

async function createPersonalReminder(params: {
  organizationId: string
  userId: string
  targetType: 'TASK' | 'DELIVERABLE'
  targetId: string
  scheduledFor: Date
  dedupeKey: string
  offsetType: string
}): Promise<void> {
  const exists = await prisma.reminder.findUnique({
    where: { dedupeKey: params.dedupeKey },
    select: { id: true },
  })
  if (exists) return

  try {
    await prisma.reminder.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        targetType: params.targetType,
        targetId: params.targetId,
        taskId: params.targetType === 'TASK' ? params.targetId : null,
        deliverableId: params.targetType === 'DELIVERABLE' ? params.targetId : null,
        scheduledFor: params.scheduledFor,
        dedupeKey: params.dedupeKey,
        offsetType: params.offsetType,
        channel: 'IN_APP',
        status: 'PENDING',
      },
    })
  } catch {
    // المفتاح الفريد يعني أن هذا الموعد أُنشئ سابقًا.
  }
}

async function generatePersonalReminders(organizationId: string, now: Date): Promise<void> {
  const preferences = await prisma.reminderPreference.findMany({
    where: { enabled: true, user: { organizationId, isActive: true } },
    include: { user: { select: { id: true } } },
    take: 200,
  })

  for (const preference of preferences) {
    const [tasks, deliverables] = await Promise.all([
      preference.taskEnabled
        ? prisma.task.findMany({
            where: {
              organizationId,
              status: { notIn: ['DONE', 'CANCELLED'] },
              OR: [
                { assigneeId: preference.userId },
                { assignees: { some: { userId: preference.userId } } },
              ],
            },
            select: { id: true, createdAt: true, dueDate: true },
            take: 200,
          })
        : Promise.resolve([]),
      preference.deliverableEnabled
        ? prisma.deliverable.findMany({
            where: {
              organizationId,
              ownerId: preference.userId,
              status: { notIn: ['DONE', 'CANCELLED'] },
            },
            select: { id: true, createdAt: true, dueDate: true },
            take: 200,
          })
        : Promise.resolve([]),
    ])

    const targets = [
      ...tasks.map((item) => ({ ...item, targetType: 'TASK' as const })),
      ...deliverables.map((item) => ({ ...item, targetType: 'DELIVERABLE' as const })),
    ]
    const [hour, minute] = preference.reminderTime.split(':').map(Number)
    const periodicTime = new Date(now)
    periodicTime.setHours(Number.isFinite(hour) ? hour : 9, Number.isFinite(minute) ? minute : 0, 0, 0)

    for (const target of targets) {
      const isOverdue = !!target.dueDate && target.dueDate < now
      if (preference.periodicEnabled && (!isOverdue || preference.includeOverdue)) {
        const elapsed = calendarDaysBetween(target.createdAt, now)
        const interval = Math.max(1, preference.intervalDays)
        if (elapsed >= 0 && elapsed % interval === 0 && now >= periodicTime) {
          await createPersonalReminder({
            organizationId,
            userId: preference.userId,
            targetType: target.targetType,
            targetId: target.id,
            scheduledFor: periodicTime,
            dedupeKey: `personal:${preference.userId}:${target.targetType}:${target.id}:periodic:${dayKey(now)}`,
            offsetType: 'PERSONAL_PERIODIC',
          })
        }
      }

      if (preference.beforeDueEnabled && target.dueDate && target.dueDate >= now) {
        for (const hours of parseHours(preference.beforeDueHours)) {
          const scheduledFor = new Date(target.dueDate.getTime() - hours * 3_600_000)
          if (scheduledFor <= now) {
            await createPersonalReminder({
              organizationId,
              userId: preference.userId,
              targetType: target.targetType,
              targetId: target.id,
              scheduledFor,
              dedupeKey: `personal:${preference.userId}:${target.targetType}:${target.id}:before:${hours}:${target.dueDate.getTime()}`,
              offsetType: 'PERSONAL_BEFORE_DUE',
            })
          }
        }
      }
    }
  }
}

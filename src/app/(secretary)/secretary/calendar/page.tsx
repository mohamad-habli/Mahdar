import { requireUser } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { loadTasks } from '@/lib/tasks'
import CalendarClient from './CalendarClient'
import { syncStaleMeetingStatuses } from '@/lib/meetings'

export const dynamic = 'force-dynamic'

export default async function CalendarPage() {
  const me = await requireUser(['SECRETARY'])
  await syncStaleMeetingStatuses(me.organizationId)

  const [tasks, deliverables, meetings, reminders, departments, members, councils] = await Promise.all([
    loadTasks({ organizationId: me.organizationId, dueDate: { not: null } }),
    prisma.deliverable.findMany({
      where: { organizationId: me.organizationId, dueDate: { not: null } },
      select: { id: true, title: true, description: true, dueDate: true, status: true, councilId: true, departmentId: true, ownerId: true, owner: { select: { name: true } }, department: { select: { name: true } }, council: { select: { name: true } } },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.meeting.findMany({
      where: { council: { organizationId: me.organizationId } },
      select: { id: true, title: true, meetingDate: true, status: true, councilId: true, council: { select: { name: true } } },
      orderBy: { meetingDate: 'asc' },
    }),
    prisma.reminder.findMany({
      where: { organizationId: me.organizationId },
      select: {
        id: true,
        targetType: true,
        scheduledFor: true,
        status: true,
        user: { select: { name: true } },
        task: { select: { title: true, department: { select: { name: true } }, council: { select: { name: true } } } },
        deliverable: { select: { title: true, department: { select: { name: true } }, council: { select: { name: true } } } },
      },
      orderBy: { scheduledFor: 'asc' },
    }),
    prisma.department.findMany({
      where: { council: { organizationId: me.organizationId }, isActive: true },
      select: { id: true, name: true }, orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({
      where: { organizationId: me.organizationId, isActive: true },
      select: { id: true, name: true }, orderBy: { name: 'asc' },
    }),
    prisma.council.findMany({
      where: { organizationId: me.organizationId, isActive: true },
      select: { id: true, name: true }, orderBy: { name: 'asc' },
    }),
  ])

  return (
    <CalendarClient
      tasks={tasks}
      deliverables={deliverables.map((d) => ({
        id: d.id,
        title: d.title,
        description: d.description,
        dueDate: d.dueDate?.toISOString() ?? null,
        status: d.status,
        councilId: d.councilId,
        councilName: d.council?.name ?? null,
        departmentId: d.departmentId,
        departmentName: d.department?.name ?? null,
        ownerId: d.ownerId,
        ownerName: d.owner?.name ?? null,
      }))}
      meetings={meetings.map((m) => ({ id: m.id, title: m.title, meetingDate: m.meetingDate.toISOString(), status: m.status, councilId: m.councilId, councilName: m.council.name }))}
      reminders={reminders.map((r) => ({
        id: r.id,
        title: r.task?.title ?? r.deliverable?.title ?? 'تذكير',
        targetType: r.targetType,
        scheduledFor: r.scheduledFor.toISOString(),
        status: r.status,
        userName: r.user.name,
        councilName: r.task?.council?.name ?? r.deliverable?.council?.name ?? null,
        departmentName: r.task?.department?.name ?? r.deliverable?.department?.name ?? null,
      }))}
      departments={departments}
      members={members}
      councils={councils}
    />
  )
}

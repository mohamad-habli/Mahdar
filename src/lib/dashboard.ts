import { prisma } from './prisma'

const now = () => new Date()
function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
function inDays(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

// التكليفات المفتوحة = ليست مكتملة ولا ملغاة
const OPEN_STATUSES = ['NEW', 'IN_PROGRESS', 'LATE']

export interface UpcomingMeeting {
  id: string
  title: string
  councilName: string
  meetingDate: Date
  startTime: string | null
  location: string | null
}

// ============================================================
//  أمين السر — نظرة عامة على المجلس كاملًا
// ============================================================
export async function getSecretaryStats(organizationId: string) {
  const [
    councilsCount,
    departmentsCount,
    upcomingMeetingsCount,
    draftMinutes,
    inReviewMinutes,
    openTasks,
    overdueTasks,
    usersCount,
    upcoming,
    costAgg,
  ] = await Promise.all([
    prisma.council.count({ where: { organizationId, isActive: true } }),
    prisma.department.count({ where: { council: { organizationId }, isActive: true } }),
    prisma.meeting.count({
      where: { council: { organizationId }, status: 'SCHEDULED', meetingDate: { gte: startOfToday() } },
    }),
    prisma.minutes.count({ where: { meeting: { council: { organizationId } }, status: 'DRAFT' } }),
    prisma.minutes.count({ where: { meeting: { council: { organizationId } }, status: 'IN_REVIEW' } }),
    prisma.task.count({ where: { organizationId, status: { in: OPEN_STATUSES } } }),
    prisma.task.count({
      where: { organizationId, status: { in: OPEN_STATUSES }, dueDate: { lt: startOfToday() } },
    }),
    prisma.user.count({ where: { organizationId, isActive: true } }),
    prisma.meeting.findMany({
      where: { council: { organizationId }, status: 'SCHEDULED', meetingDate: { gte: startOfToday() } },
      orderBy: { meetingDate: 'asc' },
      take: 5,
      include: { council: { select: { name: true } } },
    }),
    prisma.cost.aggregate({ where: { organizationId }, _sum: { actualAmount: true, expectedAmount: true } }),
  ])

  return {
    councilsCount,
    departmentsCount,
    upcomingMeetingsCount,
    draftMinutes,
    inReviewMinutes,
    openTasks,
    overdueTasks,
    usersCount,
    totalActualCost: costAgg._sum.actualAmount ?? 0,
    totalExpectedCost: costAgg._sum.expectedAmount ?? 0,
    upcoming: upcoming.map((m) => ({
      id: m.id,
      title: m.title,
      councilName: m.council.name,
      meetingDate: m.meetingDate,
      startTime: m.startTime,
      location: m.location,
    })) as UpcomingMeeting[],
  }
}

// ============================================================
//  رئيس المجلس
// ============================================================
export async function getChairStats(organizationId: string) {
  const [pendingApproval, approvedCount, departmentsCount, openTasks, overdueTasks, upcoming] =
    await Promise.all([
      prisma.minutes.count({ where: { meeting: { council: { organizationId } }, status: 'IN_REVIEW' } }),
      prisma.minutes.count({
        where: { meeting: { council: { organizationId } }, status: { in: ['APPROVED', 'LOCKED'] } },
      }),
      prisma.department.count({ where: { council: { organizationId }, isActive: true } }),
      prisma.task.count({ where: { organizationId, status: { in: OPEN_STATUSES } } }),
      prisma.task.count({
        where: { organizationId, status: { in: OPEN_STATUSES }, dueDate: { lt: startOfToday() } },
      }),
      prisma.meeting.findMany({
        where: { council: { organizationId }, status: 'SCHEDULED', meetingDate: { gte: startOfToday() } },
        orderBy: { meetingDate: 'asc' },
        take: 5,
        include: { council: { select: { name: true } } },
      }),
    ])

  return {
    pendingApproval,
    approvedCount,
    departmentsCount,
    openTasks,
    overdueTasks,
    upcoming: upcoming.map((m) => ({
      id: m.id,
      title: m.title,
      councilName: m.council.name,
      meetingDate: m.meetingDate,
      startTime: m.startTime,
      location: m.location,
    })) as UpcomingMeeting[],
  }
}

// ============================================================
//  مسؤول القسم — مقيّد بأقسامه فقط
// ============================================================
export async function getManagerStats(userId: string) {
  const departments = await prisma.department.findMany({
    where: { managerId: userId, isActive: true },
    select: { id: true, name: true },
  })
  const deptIds = departments.map((d) => d.id)

  if (deptIds.length === 0) {
    return { departments, openTasks: 0, overdueTasks: 0, doneTasks: 0, unpaidCosts: 0, recentTasks: [] }
  }

  const [openTasks, overdueTasks, doneTasks, unpaidCosts, recentTasks] = await Promise.all([
    prisma.task.count({ where: { departmentId: { in: deptIds }, status: { in: OPEN_STATUSES } } }),
    prisma.task.count({
      where: { departmentId: { in: deptIds }, status: { in: OPEN_STATUSES }, dueDate: { lt: startOfToday() } },
    }),
    prisma.task.count({ where: { departmentId: { in: deptIds }, status: 'DONE' } }),
    prisma.cost.count({ where: { departmentId: { in: deptIds }, paymentStatus: { in: ['UNPAID', 'PARTIAL'] } } }),
    prisma.task.findMany({
      where: { departmentId: { in: deptIds } },
      orderBy: { updatedAt: 'desc' },
      take: 6,
      include: { assignee: { select: { name: true } }, department: { select: { name: true } } },
    }),
  ])

  return { departments, openTasks, overdueTasks, doneTasks, unpaidCosts, recentTasks }
}

// ============================================================
//  العضو — تكليفاته فقط
// ============================================================
export async function getMemberStats(userId: string, organizationId: string) {
  const ownTask = { OR: [{ assigneeId: userId }, { assignees: { some: { userId } } }] }
  const [openTasks, overdueTasks, doneTasks, dueThisWeek, recentTasks, upcoming] = await Promise.all([
    prisma.task.count({ where: { ...ownTask, status: { in: OPEN_STATUSES } } }),
    prisma.task.count({
      where: { ...ownTask, status: { in: OPEN_STATUSES }, dueDate: { lt: startOfToday() } },
    }),
    prisma.task.count({ where: { ...ownTask, status: 'DONE' } }),
    prisma.task.count({
      where: { ...ownTask, status: { in: OPEN_STATUSES }, dueDate: { gte: startOfToday(), lte: inDays(7) } },
    }),
    prisma.task.findMany({
      where: ownTask,
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
      take: 6,
      include: { department: { select: { name: true } } },
    }),
    prisma.meeting.findMany({
      where: {
        status: 'SCHEDULED',
        meetingDate: { gte: startOfToday() },
        council: { organizationId, members: { some: { userId, isActive: true } } },
      },
      orderBy: { meetingDate: 'asc' },
      take: 5,
      include: { council: { select: { name: true } } },
    }),
  ])

  return {
    openTasks,
    overdueTasks,
    doneTasks,
    dueThisWeek,
    recentTasks,
    upcoming: upcoming.map((m) => ({
      id: m.id,
      title: m.title,
      councilName: m.council.name,
      meetingDate: m.meetingDate,
      startTime: m.startTime,
      location: m.location,
    })) as UpcomingMeeting[],
  }
}

export { now }

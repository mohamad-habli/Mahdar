import { prisma } from './prisma'

export async function syncStaleMeetingStatuses(organizationId: string): Promise<void> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  await prisma.meeting.updateMany({
    where: {
      status: 'SCHEDULED',
      meetingDate: { lt: today },
      council: { organizationId },
    },
    data: { status: 'NEEDS_UPDATE' },
  })
}

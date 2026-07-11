import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// تواريخ نسبية لليوم حتى تبقى البيانات واقعية دائمًا
const today = new Date()
function daysFromNow(n: number, hour = 16, minute = 0) {
  const d = new Date(today)
  d.setDate(d.getDate() + n)
  d.setHours(hour, minute, 0, 0)
  return d
}

async function main() {
  console.log('🌱 بدء زراعة بيانات مجلس التجريبية…')

  // تنظيف (بالترتيب العكسي للعلاقات)
  await prisma.auditLog.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.reminder.deleteMany()
  await prisma.meetingReminder.deleteMany()
  await prisma.documentLink.deleteMany()
  await prisma.attachment.deleteMany()
  await prisma.followUpEntry.deleteMany()
  await prisma.taskAssignee.deleteMany()
  await prisma.taskNote.deleteMany()
  await prisma.cost.deleteMany()
  await prisma.task.deleteMany()
  await prisma.deliverable.deleteMany()
  await prisma.minuteAddendum.deleteMany()
  await prisma.minuteItem.deleteMany()
  await prisma.minutes.deleteMany()
  await prisma.attendance.deleteMany()
  await prisma.agendaItem.deleteMany()
  await prisma.meeting.deleteMany()
  await prisma.project.deleteMany()
  await prisma.department.deleteMany()
  await prisma.councilMember.deleteMany()
  await prisma.council.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()

  const pass = await bcrypt.hash('12345678', 12)

  // ====== الجهة ======
  const org = await prisma.organization.create({
    data: {
      name: 'مجمع علي بن أبي طالب',
      settings: JSON.stringify({ currency: 'USD' }),
    },
  })

  // ====== المستخدمون ======
  const secretary = await prisma.user.create({
    data: { organizationId: org.id, name: 'عبدالله الأمين', username: 'amin', passwordHash: pass, role: 'SECRETARY', jobTitle: 'أمين سر المجلس', phone: '0500000001' },
  })
  await prisma.user.create({
    data: { organizationId: org.id, name: 'مدير النظام', username: 'super', passwordHash: pass, role: 'SUPER_USER', jobTitle: 'مدير النظام' },
  })
  const chair = await prisma.user.create({
    data: { organizationId: org.id, name: 'د. محمد الرئيس', username: 'rais', passwordHash: pass, role: 'CHAIR', jobTitle: 'رئيس المجلس', phone: '0500000002' },
  })
  const eduManager = await prisma.user.create({
    data: { organizationId: org.id, name: 'سعد التعليمي', username: 'edu', passwordHash: pass, role: 'DEPT_MANAGER', jobTitle: 'مسؤول لجنة التعليم', phone: '0500000003' },
  })
  const finManager = await prisma.user.create({
    data: { organizationId: org.id, name: 'خالد المالي', username: 'fin', passwordHash: pass, role: 'DEPT_MANAGER', jobTitle: 'مسؤول اللجنة المالية', phone: '0500000004' },
  })
  const member1 = await prisma.user.create({
    data: { organizationId: org.id, name: 'ناصر العضو', username: 'member1', passwordHash: pass, role: 'MEMBER', jobTitle: 'عضو دائم', phone: '0500000005' },
  })
  const member2 = await prisma.user.create({
    data: { organizationId: org.id, name: 'فهد العضو', username: 'member2', passwordHash: pass, role: 'MEMBER', jobTitle: 'عضو دائم', phone: '0500000006' },
  })

  // ====== المجلس (أسبوعي) ======
  const council = await prisma.council.create({
    data: {
      organizationId: org.id,
      name: 'المجلس الرئيسي',
      description: 'المجلس الأعلى لإدارة المجمع',
      type: 'COUNCIL',
      recurrence: 'WEEKLY',
      recurrenceDay: 1, // الاثنين
      defaultStartTime: '16:00',
      defaultEndTime: '18:00',
      defaultLocation: 'قاعة الاجتماعات الرئيسية',
      reminderOffsets: JSON.stringify(['DAY_BEFORE', 'HOUR_1']),
    },
  })

  // العضوية
  for (const u of [secretary, chair, eduManager, finManager, member1, member2]) {
    await prisma.councilMember.create({
      data: {
        councilId: council.id,
        userId: u.id,
        membershipType: 'PERMANENT',
        roleInCouncil:
          u.id === chair.id ? 'رئيس' : u.id === secretary.id ? 'أمين السر' : 'عضو',
      },
    })
  }

  // ====== الأقسام / اللجان ======
  const eduDept = await prisma.department.create({
    data: { councilId: council.id, name: 'لجنة التعليم', managerId: eduManager.id, description: 'الإشراف على الحلقات والمناهج' },
  })
  const finDept = await prisma.department.create({
    data: { councilId: council.id, name: 'اللجنة المالية', managerId: finManager.id, description: 'الميزانية والمصروفات' },
  })
  const mediaDept = await prisma.department.create({
    data: { councilId: council.id, name: 'لجنة الإعلام', description: 'التغطية والنشر' },
  })

  // مشروع داخل لجنة التعليم
  const project = await prisma.project.create({
    data: { departmentId: eduDept.id, name: 'مشروع تطوير المناهج', description: 'تحديث مناهج الحلقات', status: 'ACTIVE' },
  })

  // ====== اجتماع سابق (منعقد) + محضر معتمد ======
  const pastMeeting = await prisma.meeting.create({
    data: {
      councilId: council.id,
      title: 'الجلسة الأسبوعية رقم 12',
      meetingDate: daysFromNow(-7),
      startTime: '16:00',
      endTime: '18:00',
      location: 'قاعة الاجتماعات الرئيسية',
      status: 'HELD',
      createdById: secretary.id,
    },
  })

  await prisma.agendaItem.createMany({
    data: [
      { meetingId: pastMeeting.id, order: 1, title: 'مراجعة تكليفات الجلسة السابقة' },
      { meetingId: pastMeeting.id, order: 2, title: 'خطة تطوير المناهج' },
      { meetingId: pastMeeting.id, order: 3, title: 'ميزانية الربع القادم' },
    ],
  })

  // الحضور
  await prisma.attendance.createMany({
    data: [
      { meetingId: pastMeeting.id, userId: chair.id, status: 'PRESENT', attendeeType: 'PERMANENT' },
      { meetingId: pastMeeting.id, userId: secretary.id, status: 'PRESENT', attendeeType: 'PERMANENT' },
      { meetingId: pastMeeting.id, userId: eduManager.id, status: 'PRESENT', attendeeType: 'PERMANENT' },
      { meetingId: pastMeeting.id, userId: finManager.id, status: 'PRESENT', attendeeType: 'PERMANENT' },
      { meetingId: pastMeeting.id, userId: member1.id, status: 'ABSENT', attendeeType: 'PERMANENT', notes: 'سفر' },
      { meetingId: pastMeeting.id, userId: member2.id, status: 'EXCUSED', attendeeType: 'PERMANENT', notes: 'ظرف خاص' },
    ],
  })

  // المحضر (معتمد ومقفل)
  const minutes = await prisma.minutes.create({
    data: {
      meetingId: pastMeeting.id,
      status: 'LOCKED',
      summary: 'نوقشت خطة تطوير المناهج واعتُمدت، مع إقرار ميزانية أولية وتكليف اللجان.',
      createdById: secretary.id,
      submittedAt: daysFromNow(-7, 19),
      approvedById: chair.id,
      approvedAt: daysFromNow(-6, 9),
      lockedAt: daysFromNow(-6, 9),
    },
  })

  const decisionItem = await prisma.minuteItem.create({
    data: {
      minutesId: minutes.id,
      order: 1,
      type: 'DECISION',
      title: 'اعتماد خطة تطوير المناهج',
      content: 'يُعتمد البدء بمشروع تطوير المناهج على ثلاث مراحل خلال الفصل الحالي.',
      departmentId: eduDept.id,
      projectId: project.id,
      voteResult: 'APPROVED',
      votesFor: 4,
      votesAgainst: 0,
      votesAbstain: 0,
    },
  })

  await prisma.minuteItem.create({
    data: {
      minutesId: minutes.id,
      order: 2,
      type: 'DISCUSSION',
      content: 'جرى نقاش حول جاهزية المعلمين وحاجة بعض الحلقات لدعم إضافي.',
      departmentId: eduDept.id,
    },
  })

  const costItem = await prisma.minuteItem.create({
    data: {
      minutesId: minutes.id,
      order: 3,
      type: 'COST',
      title: 'ميزانية طباعة المناهج',
      content: 'تخصيص مبلغ مبدئي لطباعة النسخ التجريبية من المناهج المطوّرة.',
      departmentId: finDept.id,
      projectId: project.id,
    },
  })

  await prisma.minuteItem.create({
    data: {
      minutesId: minutes.id,
      order: 4,
      type: 'NOTE',
      content: 'يُرفع تقرير متابعة في الجلسة القادمة عن نسبة الإنجاز.',
    },
  })

  // ====== التكليفات (من بنود المحضر) ======
  await prisma.task.create({
    data: {
      organizationId: org.id, title: 'إعداد مسودة المنهج للمرحلة الأولى', description: 'تجهيز الإطار العام والوحدات الأولى.',
      councilId: council.id, departmentId: eduDept.id, projectId: project.id, assigneeId: eduManager.id,
      sourceMeetingId: pastMeeting.id, sourceMinuteItemId: decisionItem.id,
      dueDate: daysFromNow(4), priority: 'HIGH', status: 'IN_PROGRESS', createdById: secretary.id,
    },
  })
  await prisma.task.create({
    data: {
      organizationId: org.id, title: 'تجهيز عرض تقديمي عن المناهج', description: 'لعرضه على المجلس.',
      councilId: council.id, departmentId: eduDept.id, projectId: project.id, assigneeId: member1.id,
      sourceMeetingId: pastMeeting.id, dueDate: daysFromNow(-2), priority: 'MEDIUM', status: 'LATE', createdById: secretary.id,
    },
  })
  await prisma.task.create({
    data: {
      organizationId: org.id, title: 'اعتماد ميزانية الطباعة', description: 'مراجعة عروض الأسعار والاعتماد.',
      councilId: council.id, departmentId: finDept.id, assigneeId: finManager.id,
      sourceMeetingId: pastMeeting.id, sourceMinuteItemId: costItem.id,
      dueDate: daysFromNow(7), priority: 'URGENT', status: 'NEW', createdById: secretary.id,
    },
  })
  await prisma.task.create({
    data: {
      organizationId: org.id, title: 'تغطية إعلامية لانطلاق المشروع', councilId: council.id, departmentId: mediaDept.id,
      assigneeId: member2.id, sourceMeetingId: pastMeeting.id, dueDate: daysFromNow(-10), priority: 'LOW', status: 'DONE',
      completedAt: daysFromNow(-8), createdById: secretary.id,
    },
  })

  // ====== التكاليف ======
  await prisma.cost.create({
    data: {
      organizationId: org.id, description: 'طباعة 200 نسخة تجريبية من المنهج', expectedAmount: 8000, actualAmount: 7500,
      currency: 'USD', departmentId: finDept.id, projectId: project.id, responsibleId: finManager.id,
      minuteItemId: costItem.id, sourceMeetingId: pastMeeting.id, paymentStatus: 'PARTIAL',
    },
  })
  await prisma.cost.create({
    data: {
      organizationId: org.id, description: 'تصميم هوية بصرية للمشروع', expectedAmount: 3000, actualAmount: null,
      currency: 'USD', departmentId: mediaDept.id, responsibleId: member2.id, paymentStatus: 'UNPAID',
    },
  })

  // ====== اجتماع قادم + جدول أعمال + تذكيرات ======
  const upcoming = await prisma.meeting.create({
    data: {
      councilId: council.id,
      title: 'الجلسة الأسبوعية رقم 13',
      meetingDate: daysFromNow(3),
      startTime: '16:00',
      endTime: '18:00',
      location: 'قاعة الاجتماعات الرئيسية',
      status: 'SCHEDULED',
      createdById: secretary.id,
    },
  })
  await prisma.agendaItem.createMany({
    data: [
      { meetingId: upcoming.id, order: 1, title: 'متابعة نسبة إنجاز تطوير المناهج' },
      { meetingId: upcoming.id, order: 2, title: 'تقرير اللجنة المالية' },
      { meetingId: upcoming.id, order: 3, title: 'مستجدات لجنة الإعلام' },
    ],
  })
  await prisma.meetingReminder.createMany({
    data: [
      { meetingId: upcoming.id, offsetType: 'DAY_BEFORE', scheduledFor: daysFromNow(2), channel: 'IN_APP', status: 'PENDING' },
      { meetingId: upcoming.id, offsetType: 'HOUR_1', scheduledFor: daysFromNow(3, 15), channel: 'IN_APP', status: 'PENDING' },
    ],
  })

  // ====== سجل تدقيق + إشعار ======
  await prisma.auditLog.create({
    data: {
      organizationId: org.id, userId: chair.id, action: 'APPROVE', entityType: 'Minutes', entityId: minutes.id,
      details: JSON.stringify({ note: 'اعتماد محضر الجلسة 12' }),
    },
  })
  await prisma.notification.create({
    data: {
      organizationId: org.id, userId: eduManager.id, type: 'TASK_ASSIGNED', title: 'تكليف جديد',
      body: 'تم تكليفك بإعداد مسودة المنهج للمرحلة الأولى.',
    },
  })

  console.log('✅ اكتملت الزراعة بنجاح.')
  console.log('   المستخدمون (كلمة المرور للجميع: 12345678):')
  console.log('   - super    → مدير النظام')
  console.log('   - amin     → أمين السر')
  console.log('   - rais     → رئيس المجلس')
  console.log('   - edu      → مسؤول لجنة التعليم')
  console.log('   - fin      → مسؤول اللجنة المالية')
  console.log('   - member1  → عضو')
  console.log('   - member2  → عضو')
}

main()
  .catch((e) => {
    console.error('❌ فشل الزرع:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

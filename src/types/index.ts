// ============================================================
//  محضر / Mahdar — Core Types
// ============================================================

export type UserRole = 'SUPER_USER' | 'SECRETARY' | 'CHAIR' | 'DEPT_MANAGER' | 'MEMBER'

export type CouncilType = 'COUNCIL' | 'COMMITTEE'
export type Recurrence = 'NONE' | 'WEEKLY' | 'MONTHLY'
export type MembershipType = 'PERMANENT' | 'GUEST'

export type MeetingStatus = 'SCHEDULED' | 'NEEDS_UPDATE' | 'HELD' | 'CANCELLED'
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'EXCUSED'
export type AttendeeType = 'PERMANENT' | 'ATTENDEE' | 'GUEST'

export type MinutesStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'LOCKED'
export type MinuteItemType =
  | 'DISCUSSION'
  | 'DECISION'
  | 'TASK'
  | 'DELIVERABLE'
  | 'FOLLOWUP'
  | 'COST'
  | 'NOTE'
  | 'VOTE'

export type MinuteItemOutcome =
  | 'OPEN'
  | 'CONVERTED_TO_TASK'
  | 'CONVERTED_TO_DELIVERABLE'
  | 'NOTE_ONLY'
  | 'CLOSED'
  | 'CARRIED_FORWARD'

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type TaskStatus = 'NEW' | 'IN_PROGRESS' | 'LATE' | 'DONE' | 'CANCELLED'
export type DeliverableStatus = TaskStatus
export type FollowUpType = 'NOTE' | 'STATUS' | 'ESCALATION' | 'ATTACHMENT' | 'REMINDER'

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID'
export type ProjectStatus = 'ACTIVE' | 'ON_HOLD' | 'DONE' | 'CANCELLED'

export type MeetingReminderOffset = 'DAY_BEFORE' | 'HOURS_3' | 'HOUR_1'
export type ReminderTarget = 'TASK' | 'DELIVERABLE'
export type ReminderOffset = 'NOW' | 'DAY_BEFORE' | 'HOURS_BEFORE' | 'REPEAT_UNTIL_CLOSED'
export type ReminderChannel = 'IN_APP' | 'WHATSAPP' | 'EMAIL'

// ============================================================
//  Auth
// ============================================================
export interface AuthUser {
  id: string
  name: string
  username: string
  role: UserRole
  organizationId: string
  jobTitle?: string | null
  phone?: string | null
  email?: string | null
  avatarUrl?: string | null
}

export interface JwtPayload {
  userId: string
  role: UserRole
  organizationId: string
  iat?: number
  exp?: number
}

// ============================================================
//  واجهات API المشتركة
// ============================================================
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// ============================================================
//  ثوابت العرض العربية
// ============================================================
export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_USER: 'مدير النظام',
  SECRETARY: 'أمين السر',
  CHAIR: 'رئيس المجلس',
  DEPT_MANAGER: 'مسؤول قسم',
  MEMBER: 'عضو',
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  NEW: 'جديد',
  IN_PROGRESS: 'قيد التنفيذ',
  LATE: 'متأخر',
  DONE: 'مكتمل',
  CANCELLED: 'ملغي',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'منخفضة',
  MEDIUM: 'متوسطة',
  HIGH: 'عالية',
  URGENT: 'عاجلة',
}

export const MINUTES_STATUS_LABELS: Record<MinutesStatus, string> = {
  DRAFT: 'مسودة',
  IN_REVIEW: 'قيد المراجعة',
  APPROVED: 'معتمد',
  LOCKED: 'مقفل',
}

export const MINUTE_ITEM_LABELS: Record<MinuteItemType, string> = {
  DISCUSSION: 'نقاش',
  DECISION: 'قرار',
  TASK: 'تكليف',
  DELIVERABLE: 'استحقاق',
  FOLLOWUP: 'متابعة',
  COST: 'تكلفة',
  NOTE: 'ملاحظة',
  VOTE: 'تصويت',
}

export const MINUTE_ITEM_OUTCOME_LABELS: Record<MinuteItemOutcome, string> = {
  OPEN: 'مفتوحة',
  CONVERTED_TO_TASK: 'تحولت إلى تكليف',
  CONVERTED_TO_DELIVERABLE: 'تحولت إلى استحقاق',
  NOTE_ONLY: 'ملاحظة فقط',
  CLOSED: 'مغلقة',
  CARRIED_FORWARD: 'مرحلة',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: 'غير مدفوع',
  PARTIAL: 'مدفوع جزئيًا',
  PAID: 'مدفوع',
}

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'حاضر',
  ABSENT: 'غائب',
  EXCUSED: 'معتذر',
}

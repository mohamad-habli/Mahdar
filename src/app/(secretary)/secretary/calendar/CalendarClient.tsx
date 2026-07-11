'use client'

import { useMemo, useState } from 'react'
import {
  BellRing,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Milestone,
  type LucideIcon,
} from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { SelectField, TextField } from '@/components/ui/Field'
import TaskDetailModal from '@/components/tasks/TaskDetailModal'
import { isOverdue, formatDate } from '@/lib/utils'
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from '@/types'

const MEETING_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'مجدول',
  NEEDS_UPDATE: 'بحاجة لتحديث الحالة',
  HELD: 'منعقد',
  CANCELLED: 'ملغى',
}
import type { TaskFull } from '@/lib/tasks'

const WEEK = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const OPEN = ['NEW', 'IN_PROGRESS', 'LATE']
type CalendarView = 'DAY' | 'WEEK' | 'MONTH'
type CalendarItemType = 'TASK' | 'DELIVERABLE' | 'MEETING' | 'REMINDER'
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

const TYPE_LABELS: Record<CalendarItemType, string> = {
  TASK: 'تكليف',
  DELIVERABLE: 'استحقاق',
  MEETING: 'اجتماع',
  REMINDER: 'تذكير',
}
const TYPE_ICON: Record<CalendarItemType, LucideIcon> = {
  TASK: ClipboardList,
  DELIVERABLE: Milestone,
  MEETING: CalendarDays,
  REMINDER: BellRing,
}
const TYPE_COLOR: Record<CalendarItemType, string> = {
  TASK: 'var(--info)',
  DELIVERABLE: 'var(--gold-dark)',
  MEETING: 'var(--brand)',
  REMINDER: 'var(--warning)',
}

interface DeliverableCalendar {
  id: string
  title: string
  description: string | null
  dueDate: string | null
  status: string
  councilId: string | null
  councilName: string | null
  departmentId: string | null
  departmentName: string | null
  ownerId: string | null
  ownerName: string | null
}

interface MeetingCalendar {
  id: string
  title: string
  meetingDate: string
  status: string
  councilId: string
  councilName: string
}

interface ReminderCalendar {
  id: string
  title: string
  targetType: string
  scheduledFor: string
  status: string
  userName: string
  councilName: string | null
  departmentName: string | null
}

interface CalendarItem {
  id: string
  type: CalendarItemType
  title: string
  date: string
  status: string | null
  priority: string | null
  councilName: string | null
  departmentName: string | null
  people: string[]
  task: TaskFull | null
}

export default function CalendarClient({
  tasks, deliverables, meetings, reminders, departments, members, councils,
}: {
  tasks: TaskFull[]
  deliverables: DeliverableCalendar[]
  meetings: MeetingCalendar[]
  reminders: ReminderCalendar[]
  departments: { id: string; name: string }[]
  members: { id: string; name: string }[]
  councils: { id: string; name: string }[]
}) {
  const today = new Date()
  const [view, setView] = useState<CalendarView>('MONTH')
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState<Date>(today)
  const [monthDayFilter, setMonthDayFilter] = useState<Date | null>(null)
  const [selected, setSelected] = useState<TaskFull | null>(null)
  const [fCouncil, setFCouncil] = useState('')
  const [fDept, setFDept] = useState('')
  const [fAssignee, setFAssignee] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fPriority, setFPriority] = useState('')
  const [fType, setFType] = useState('')

  const visibleTasks = useMemo(() => tasks.filter((t) => {
    if (fType && fType !== 'TASK') return false
    if (fCouncil && t.councilId !== fCouncil) return false
    if (fDept && t.departmentId !== fDept) return false
    if (fAssignee && t.assigneeId !== fAssignee && !t.assignees.some((a) => a.userId === fAssignee)) return false
    if (fStatus && t.status !== fStatus) return false
    if (fPriority && t.priority !== fPriority) return false
    return true
  }), [tasks, fType, fCouncil, fDept, fAssignee, fStatus, fPriority])

  const visibleDeliverables = useMemo(() => deliverables.filter((d) => {
    if (fType && fType !== 'DELIVERABLE') return false
    if (fCouncil && d.councilId !== fCouncil) return false
    if (fDept && d.departmentId !== fDept) return false
    if (fAssignee && d.ownerId !== fAssignee) return false
    if (fStatus && d.status !== fStatus) return false
    return true
  }), [deliverables, fType, fCouncil, fDept, fAssignee, fStatus])

  const visibleMeetings = useMemo(() => meetings.filter((m) => {
    if (fType && fType !== 'MEETING') return false
    if (fCouncil && m.councilId !== fCouncil) return false
    if (fStatus && m.status !== fStatus) return false
    return true
  }), [meetings, fType, fCouncil, fStatus])

  const visibleReminders = useMemo(() => reminders.filter((r) => {
    if (fType && fType !== 'REMINDER') return false
    if (fStatus && r.status !== fStatus) return false
    return true
  }), [reminders, fType, fStatus])

  const items = useMemo<CalendarItem[]>(() => [
    ...visibleTasks.filter((t) => t.dueDate).map((t) => ({
      id: t.id,
      type: 'TASK' as const,
      title: t.title,
      date: t.dueDate as string,
      status: t.status,
      priority: t.priority,
      councilName: t.councilName,
      departmentName: t.departmentName,
      people: t.assignees.map((a) => `${a.name}${a.isPrimary ? ' (رئيسي)' : ''}`).concat(t.assignees.length ? [] : t.assigneeName ? [t.assigneeName] : []),
      task: t,
    })),
    ...visibleDeliverables.filter((d) => d.dueDate).map((d) => ({
      id: d.id,
      type: 'DELIVERABLE' as const,
      title: d.title,
      date: d.dueDate as string,
      status: d.status,
      priority: null,
      councilName: d.councilName,
      departmentName: d.departmentName,
      people: d.ownerName ? [d.ownerName] : [],
      task: null,
    })),
    ...visibleMeetings.map((m) => ({
      id: m.id,
      type: 'MEETING' as const,
      title: m.title,
      date: m.meetingDate,
      status: m.status,
      priority: null,
      councilName: m.councilName,
      departmentName: null,
      people: [],
      task: null,
    })),
    ...visibleReminders.map((r) => ({
      id: r.id,
      type: 'REMINDER' as const,
      title: r.title,
      date: r.scheduledFor,
      status: r.status,
      priority: null,
      councilName: r.councilName,
      departmentName: r.departmentName,
      people: [r.userName],
      task: null,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [visibleTasks, visibleDeliverables, visibleMeetings, visibleReminders])

  const itemsByDay = useMemo(() => groupItemsByDay(items), [items])
  const monthCells = useMemo(() => monthGrid(cursor), [cursor])
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDay)
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [selectedDay])

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
  const monthLabel = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { month: 'long', year: 'numeric' }).format(cursor)
  const weekLabel = `${formatDate(weekDays[0])} - ${formatDate(weekDays[6])}`
  const rangeTitle = view === 'MONTH' ? monthLabel : view === 'WEEK' ? weekLabel : formatDate(selectedDay)
  const panelGroups =
    view === 'MONTH'
      ? monthDayFilter
        ? dayGroups([monthDayFilter], itemsByDay)
        : rangeGroups(monthStart, monthEnd, itemsByDay)
      : view === 'WEEK'
        ? dayGroups(weekDays, itemsByDay)
        : dayGroups([selectedDay], itemsByDay)
  const panelTitle = view === 'MONTH'
    ? monthDayFilter
      ? `استحقاقات ${formatDate(monthDayFilter)}`
      : `كل أمور ${monthLabel}`
    : view === 'WEEK'
      ? `أسبوع ${weekLabel}`
      : `استحقاقات ${formatDate(selectedDay)}`
  const pickerValue = view === 'MONTH' ? monthInputValue(cursor) : dateInputValue(selectedDay)

  function move(delta: number) {
    if (view === 'MONTH') {
      const next = new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1)
      setCursor(next)
      setMonthDayFilter(null)
      return
    }
    const next = addDays(selectedDay, view === 'WEEK' ? delta * 7 : delta)
    setSelectedDay(next)
    setCursor(new Date(next.getFullYear(), next.getMonth(), 1))
    setMonthDayFilter(null)
  }

  function selectMonthDay(day: Date) {
    setSelectedDay(day)
    setMonthDayFilter(day)
  }

  function handleQuickPick(value: string) {
    if (!value) return
    if (view === 'MONTH') {
      const [year, month] = value.split('-').map(Number)
      setCursor(new Date(year, month - 1, 1))
      setMonthDayFilter(null)
      return
    }
    const next = new Date(`${value}T00:00:00`)
    setSelectedDay(next)
    setCursor(new Date(next.getFullYear(), next.getMonth(), 1))
    setMonthDayFilter(null)
  }

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader title="الروزنامة" subtitle="التكليفات والاستحقاقات والاجتماعات والتذكيرات، مع عرض يومي أو أسبوعي أو شهري." />

      <div className="card p-3 mb-4 grid grid-cols-2 lg:grid-cols-6 gap-2">
        <SelectField label="النوع" placeholder="الكل" options={[{ value: 'TASK', label: 'تكليف' }, { value: 'DELIVERABLE', label: 'استحقاق' }, { value: 'MEETING', label: 'اجتماع' }, { value: 'REMINDER', label: 'تذكير' }]} value={fType} onChange={(e) => setFType(e.target.value)} />
        <SelectField label="المجلس" placeholder="كل المجالس" options={councils.map((c) => ({ value: c.id, label: c.name }))} value={fCouncil} onChange={(e) => setFCouncil(e.target.value)} />
        <SelectField label="القسم" placeholder="كل الأقسام" options={departments.map((d) => ({ value: d.id, label: d.name }))} value={fDept} onChange={(e) => setFDept(e.target.value)} />
        <SelectField label="المسؤول" placeholder="الكل" options={members.map((m) => ({ value: m.id, label: m.name }))} value={fAssignee} onChange={(e) => setFAssignee(e.target.value)} />
        <SelectField label="الحالة" placeholder="كل الحالات" options={[...Object.entries(TASK_STATUS_LABELS), ...Object.entries(MEETING_STATUS_LABELS)].filter(([value], index, all) => all.findIndex(([candidate]) => candidate === value) === index).map(([v, l]) => ({ value: v, label: l }))} value={fStatus} onChange={(e) => setFStatus(e.target.value)} />
        <SelectField label="الأولوية" placeholder="كل الأولويات" options={Object.entries(TASK_PRIORITY_LABELS).map(([v, l]) => ({ value: v, label: l }))} value={fPriority} onChange={(e) => setFPriority(e.target.value)} />
      </div>

      <div className="card p-3 mb-4 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <label className="block mb-1.5 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>طريقة العرض</label>
          <div className="flex gap-1.5">
            {[
              { value: 'DAY', label: 'يومي' },
              { value: 'WEEK', label: 'أسبوعي' },
              { value: 'MONTH', label: 'شهري' },
            ].map((v) => (
              <button
                key={v.value}
                className="badge transition-colors"
                onClick={() => { setView(v.value as CalendarView); setMonthDayFilter(null) }}
                style={view === v.value ? { background: 'var(--brand)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'pointer' }}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-end gap-2 flex-wrap">
          <TextField
            label={view === 'MONTH' ? 'اختيار الشهر' : view === 'WEEK' ? 'اختيار تاريخ من الأسبوع' : 'اختيار اليوم'}
            type={view === 'MONTH' ? 'month' : 'date'}
            dir="ltr"
            value={pickerValue}
            onChange={(e) => handleQuickPick(e.target.value)}
          />
          <div className="flex items-center gap-3 pb-0.5">
            <button className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }} onClick={() => move(-1)}>
              <ChevronRight size={18} />
            </button>
            <span className="font-bold min-w-52 text-center" style={{ color: 'var(--text-1)' }}>{rangeTitle}</span>
            <button className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }} onClick={() => move(1)}>
              <ChevronLeft size={18} />
            </button>
          </div>
        </div>
      </div>

      {view === 'MONTH' ? (
        <div className="grid lg:grid-cols-5 gap-4">
          <MonthGrid
            cells={monthCells}
            selectedDay={selectedDay}
            focusedDay={monthDayFilter}
            today={today}
            itemsByDay={itemsByDay}
            onSelect={selectMonthDay}
          />
          <CalendarPanel
            className="lg:col-span-2"
            title={panelTitle}
            groups={panelGroups}
            onTask={setSelected}
            onClear={monthDayFilter ? () => setMonthDayFilter(null) : undefined}
          />
        </div>
      ) : (
        <CalendarPanel title={panelTitle} groups={panelGroups} onTask={setSelected} />
      )}

      <TaskDetailModal task={selected} canUpdate onClose={() => setSelected(null)} />
    </div>
  )
}

function MonthGrid({
  cells, selectedDay, focusedDay, today, itemsByDay, onSelect,
}: {
  cells: (Date | null)[]
  selectedDay: Date
  focusedDay: Date | null
  today: Date
  itemsByDay: Map<string, CalendarItem[]>
  onSelect: (date: Date) => void
}) {
  return (
    <div className="card p-4 lg:col-span-3">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEK.map((w) => <div key={w} className="text-center text-[11px] font-semibold py-1" style={{ color: 'var(--text-3)' }}>{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const key = dayKey(d)
          const list = itemsByDay.get(key) ?? []
          const hasOverdue = list.some((x) => x.type === 'TASK' && OPEN.includes(x.status ?? '') && isOverdue(x.date))
          const isSelected = key === dayKey(focusedDay ?? selectedDay)
          const isToday = key === dayKey(today)
          return (
            <button key={i} onClick={() => onSelect(d)}
              className="aspect-square rounded-lg flex flex-col items-center justify-center text-sm relative transition-colors"
              style={isSelected ? { background: 'var(--brand)', color: '#fff' } : { background: isToday ? 'var(--brand-soft)' : 'transparent', color: 'var(--text-1)' }}>
              <span style={isToday && !isSelected ? { color: 'var(--brand)', fontWeight: 700 } : undefined}>{d.getDate()}</span>
              {list.length > 0 && <span className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ background: isSelected ? '#fff' : hasOverdue ? 'var(--danger)' : 'var(--gold)' }} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CalendarPanel({
  title, groups, onTask, onClear, className = '',
}: {
  title: string
  groups: { date: Date; items: CalendarItem[] }[]
  onTask: (task: TaskFull) => void
  onClear?: () => void
  className?: string
}) {
  const count = groups.reduce((sum, g) => sum + g.items.length, 0)
  return (
    <div className={`card overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b flex items-center gap-2 flex-wrap" style={{ borderColor: 'var(--border)' }}>
        <CalendarRange size={16} style={{ color: 'var(--brand)' }} />
        <span className="font-bold text-sm flex-1" style={{ color: 'var(--text-1)' }}>{title}</span>
        {onClear && <button className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }} onClick={onClear}>عرض كل الشهر</button>}
        <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>{count}</span>
      </div>
      {count === 0 ? (
        <p className="text-sm text-center py-10" style={{ color: 'var(--text-3)' }}>لا عناصر ضمن هذا النطاق.</p>
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {groups.map((group) => (
            <div key={dayKey(group.date)}>
              <div className="px-4 py-2 text-xs font-bold" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>
                {formatDate(group.date)}
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {group.items.map((item) => <CalendarItemRow key={`${item.type}-${item.id}`} item={item} onTask={onTask} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CalendarItemRow({ item, onTask }: { item: CalendarItem; onTask: (task: TaskFull) => void }) {
  const Icon = TYPE_ICON[item.type]
  const clickable = item.type === 'TASK' && item.task
  const Tag = clickable ? 'button' : 'div'
  const statusLabel = item.status ? TASK_STATUS_LABELS[item.status as keyof typeof TASK_STATUS_LABELS] ?? MEETING_STATUS_LABELS[item.status] ?? item.status : null
  const priorityLabel = item.priority ? TASK_PRIORITY_LABELS[item.priority as keyof typeof TASK_PRIORITY_LABELS] ?? item.priority : null

  return (
    <Tag
      onClick={clickable ? () => onTask(item.task as TaskFull) : undefined}
      className={`${clickable ? 'w-full text-right hover:bg-[var(--surface-2)]' : ''} px-4 py-3 transition-colors`}
    >
      <div className="flex items-start gap-2">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--surface-2)', color: TYPE_COLOR[item.type] }}>
          <Icon size={15} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{item.title}</div>
          <div className="text-xs mt-1 flex items-center gap-2 flex-wrap" style={{ color: 'var(--text-3)' }}>
            <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>{TYPE_LABELS[item.type]}</span>
            {item.departmentName && <span>{item.departmentName}</span>}
            {!item.departmentName && item.councilName && <span>{item.councilName}</span>}
            {item.people.length > 0 && <span>{item.people.join('، ')}</span>}
            <span>{formatDate(item.date)}</span>
            {statusLabel && <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>{statusLabel}</span>}
            {priorityLabel && <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>{priorityLabel}</span>}
          </div>
        </div>
        {clickable && <ChevronLeft size={16} style={{ color: 'var(--text-3)' }} />}
      </div>
    </Tag>
  )
}

function groupItemsByDay(items: CalendarItem[]) {
  const map = new Map<string, CalendarItem[]>()
  for (const item of items) {
    const key = dayKey(new Date(item.date))
    const arr = map.get(key) ?? []
    arr.push(item)
    map.set(key, arr)
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }
  return map
}

function rangeGroups(start: Date, end: Date, itemsByDay: Map<string, CalendarItem[]>) {
  const groups: { date: Date; items: CalendarItem[] }[] = []
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    const items = itemsByDay.get(dayKey(d)) ?? []
    if (items.length) groups.push({ date: new Date(d), items })
  }
  return groups
}

function dayGroups(days: Date[], itemsByDay: Map<string, CalendarItem[]>) {
  return days
    .map((date) => ({ date, items: itemsByDay.get(dayKey(date)) ?? [] }))
    .filter((group) => group.items.length > 0)
}

function monthGrid(cursor: Date) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  const arr: (Date | null)[] = []
  for (let i = 0; i < first.getDay(); i++) arr.push(null)
  for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(cursor.getFullYear(), cursor.getMonth(), d))
  return arr
}

function startOfWeek(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function dateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function monthInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

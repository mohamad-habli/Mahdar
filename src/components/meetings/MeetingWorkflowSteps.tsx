import { Check } from 'lucide-react'

export interface MeetingWorkflowState {
  meetingHeld: boolean
  attendanceSaved: boolean
  agendaReady: boolean
  previousSettled: boolean
  minutesWritten: boolean
  reviewStarted: boolean
  locked: boolean
}

export default function MeetingWorkflowSteps({ state }: { state: MeetingWorkflowState }) {
  const steps = [
    { label: 'بيانات الجلسة', done: true },
    { label: 'الحضور', done: state.attendanceSaved },
    { label: 'جدول الأعمال', done: state.agendaReady },
    { label: 'تسديد السابق', done: state.previousSettled },
    { label: 'كتابة المحضر', done: state.minutesWritten },
    { label: 'المراجعة', done: state.reviewStarted },
    { label: 'الإقفال', done: state.locked },
  ]
  const current = steps.findIndex((step) => !step.done)

  return (
    <div className="card p-3 mb-5 overflow-x-auto" aria-label="مراحل الجلسة">
      <ol className="flex items-center min-w-max gap-1">
        {steps.map((step, index) => {
          const active = index === current
          return (
            <li key={step.label} className="flex items-center">
              <div
                className="h-9 px-3 flex items-center gap-2 rounded-lg text-xs font-semibold"
                style={step.done
                  ? { background: 'var(--success-bg)', color: 'var(--success)' }
                  : active
                    ? { background: 'var(--brand-soft)', color: 'var(--brand)', outline: '1px solid var(--brand)' }
                    : { background: 'var(--surface-2)', color: 'var(--text-3)' }}
              >
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px]" style={{ background: step.done ? 'var(--success)' : 'var(--surface-3)', color: step.done ? '#fff' : 'var(--text-2)' }}>
                  {step.done ? <Check size={12} /> : index + 1}
                </span>
                {step.label}
              </div>
              {index < steps.length - 1 && <span className="w-4 h-px mx-1" style={{ background: 'var(--border)' }} />}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

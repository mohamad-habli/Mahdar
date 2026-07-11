import { CalendarClock, MapPin, Video } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { UpcomingMeeting } from '@/lib/dashboard'

export default function UpcomingMeetings({ meetings }: { meetings: UpcomingMeeting[] }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <CalendarClock size={18} style={{ color: 'var(--brand)' }} />
        <h3 className="font-bold" style={{ color: 'var(--text-1)' }}>
          الاجتماعات القادمة
        </h3>
      </div>

      {meetings.length === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: 'var(--text-3)' }}>
          لا توجد اجتماعات قادمة مجدولة.
        </p>
      ) : (
        <ul className="space-y-3">
          {meetings.map((m) => (
            <li
              key={m.id}
              className="flex items-start gap-3 p-3 rounded-xl"
              style={{ background: 'var(--surface-2)' }}
            >
              <div
                className="w-11 h-11 rounded-lg flex flex-col items-center justify-center shrink-0 leading-none"
                style={{ background: 'var(--brand)', color: '#fff' }}
              >
                <span className="text-base font-bold">{new Date(m.meetingDate).getDate()}</span>
                <span className="text-[9px] opacity-80">
                  {new Intl.DateTimeFormat('ar-EG-u-nu-latn', { month: 'short' }).format(new Date(m.meetingDate))}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-1)' }}>
                  {m.title}
                </div>
                <div className="text-xs truncate" style={{ color: 'var(--text-2)' }}>
                  {m.councilName} · {formatDate(m.meetingDate)}
                  {m.startTime ? ` · ${m.startTime}` : ''}
                </div>
                {m.location && (
                  <div className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--text-3)' }}>
                    {m.location.startsWith('http') ? <Video size={12} /> : <MapPin size={12} />}
                    <span className="truncate">{m.location}</span>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

import { MapPin, Clock, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import { useNavigate } from 'react-router-dom'
import type { CalendarEvent } from '@/types'

interface TodayTimelineProps {
  events: CalendarEvent[]
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function getDuration(start: string, end?: string): string {
  if (!end) return ''
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
  if (mins < 60) return `${mins}p`
  return `${Math.floor(mins / 60)}h${mins % 60 > 0 ? (mins % 60) + 'p' : ''}`
}

function getStatus(start: string, end?: string): 'upcoming' | 'now' | 'done' {
  const now  = Date.now()
  const s    = new Date(start).getTime()
  const e    = end ? new Date(end).getTime() : s + 60 * 60 * 1000
  if (now < s) return 'upcoming'
  if (now > e) return 'done'
  return 'now'
}

export function TodayTimeline({ events }: TodayTimelineProps) {
  const navigate = useNavigate()
  const now = new Date()
  const nowH = now.getHours() + now.getMinutes() / 60

  const sorted = [...events].sort((a, b) =>
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  )

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="section-title text-base">Lịch hôm nay</h3>
          <p className="section-subtitle text-xs">{now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}</p>
        </div>
        <button onClick={() => navigate('/calendar')}
          className="w-8 h-8 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center justify-center transition-colors">
          <ChevronRight className="w-4 h-4 text-surface-400" />
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6 text-surface-300 dark:text-surface-600" />
          </div>
          <p className="text-sm text-surface-500">Không có lịch học hôm nay</p>
          <p className="text-xs text-surface-400 mt-1">Tận hưởng ngày nghỉ! 🏝️</p>
          <button onClick={() => navigate('/calendar')}
            className="mt-3 text-xs font-semibold text-primary-500 hover:text-primary-600">
            + Thêm sự kiện
          </button>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[31px] top-0 bottom-0 w-px bg-gradient-to-b from-surface-200 via-surface-200 to-transparent dark:from-surface-700 dark:via-surface-700" />

          <div className="space-y-3">
            {sorted.map((event, idx) => {
              const status  = getStatus(event.start_time, event.end_time)
              const color   = event.color || '#6B4EFF'
              const dur     = getDuration(event.start_time, event.end_time)

              return (
                <div key={event.id}
                  className={clsx('flex gap-3 items-start group transition-all', status === 'done' && 'opacity-50')}>
                  {/* Time + dot */}
                  <div className="shrink-0 w-14 text-right relative">
                    <span className="text-[11px] font-semibold text-surface-500 dark:text-surface-400 leading-none">
                      {formatTime(event.start_time)}
                    </span>
                    {/* Dot on timeline */}
                    <div className={clsx(
                      'absolute right-0 top-1 w-3 h-3 rounded-full border-2 border-white dark:border-surface-900 -mr-[23px] transition-all',
                      status === 'now' ? 'scale-125 animate-pulse' : ''
                    )}
                      style={{ background: status === 'done' ? '#94a3b8' : color }}
                    />
                  </div>

                  {/* Event card */}
                  <div className={clsx(
                    'flex-1 rounded-xl p-3 border transition-all cursor-pointer hover:shadow-sm',
                    status === 'now'
                      ? 'border-opacity-50 shadow-sm'
                      : 'border-surface-100 dark:border-surface-800 hover:border-surface-200 dark:hover:border-surface-700',
                  )}
                    style={{
                      borderColor: status === 'now' ? color : undefined,
                      background: status === 'now' ? `${color}10` : undefined,
                    }}
                    onClick={() => navigate('/calendar')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={clsx('text-sm font-semibold truncate', status === 'now' ? 'text-surface-900 dark:text-white' : 'text-surface-700 dark:text-surface-300')}>
                          {event.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {event.room && (
                            <span className="flex items-center gap-1 text-[10px] text-surface-400">
                              <MapPin className="w-2.5 h-2.5" />{event.room}
                            </span>
                          )}
                          {dur && <span className="text-[10px] text-surface-400">{dur}</span>}
                        </div>
                      </div>
                      {status === 'now' && (
                        <div className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white animate-pulse"
                          style={{ background: color }}>
                          LIVE
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add event button */}
      <button onClick={() => navigate('/calendar')}
        className="w-full mt-4 py-2 rounded-xl border-2 border-dashed border-surface-200 dark:border-surface-700 text-xs text-surface-400 hover:border-primary-400 hover:text-primary-500 transition-colors">
        + Thêm lịch học
      </button>
    </div>
  )
}

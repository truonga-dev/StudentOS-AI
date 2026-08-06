import { useEffect, useState } from 'react'
import { Flame } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { clsx } from 'clsx'

interface DayData {
  date: string       // YYYY-MM-DD
  minutes: number
}

const LEVELS = [
  { min: 0,   color: 'bg-surface-100 dark:bg-surface-800',                    label: '0 phút' },
  { min: 1,   color: 'bg-primary-100 dark:bg-primary-900/40',                  label: '1-30 phút' },
  { min: 30,  color: 'bg-primary-300 dark:bg-primary-700',                     label: '30-60 phút' },
  { min: 60,  color: 'bg-primary-500',                                          label: '1-2 giờ' },
  { min: 120, color: 'bg-primary-700 dark:bg-primary-400',                     label: '2+ giờ' },
]

function getLevel(minutes: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (minutes >= LEVELS[i].min) return i
  }
  return 0
}

function formatDateLabel(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

function getLast84Days(): string[] {
  const days: string[] = []
  const today = new Date()
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

function calcStreak(dayMap: Record<string, number>): number {
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    if ((dayMap[key] ?? 0) > 0) streak++
    else if (i > 0) break
  }
  return streak
}

const WEEK_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

export function StudyStreakCalendar() {
  const [dayMap, setDayMap]   = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [hovered, setHovered] = useState<string | null>(null)
  const all84 = getLast84Days()
  const streak = calcStreak(dayMap)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const start = all84[0]
      const { data } = await supabase
        .from('study_sessions')
        .select('started_at, duration_minutes')
        .eq('user_id', user.id)
        .gte('started_at', `${start}T00:00:00`)
      if (data) {
        const map: Record<string, number> = {}
        data.forEach(s => {
          const key = new Date(s.started_at).toISOString().slice(0, 10)
          map[key] = (map[key] || 0) + (s.duration_minutes || 0)
        })
        setDayMap(map)
      }
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line

  // Build 12 weeks × 7 grid (first col = oldest week)
  const weeks: string[][] = []
  const todayStr = new Date().toISOString().slice(0, 10)
  // Pad so grid starts on Sunday
  const firstDay = new Date(all84[0])
  const startPad = firstDay.getDay()
  const padded = [...Array(startPad).fill(''), ...all84]
  for (let w = 0; w < Math.ceil(padded.length / 7); w++) {
    weeks.push(padded.slice(w * 7, w * 7 + 7))
  }
  // Only keep last 12 weeks
  const last12 = weeks.slice(-12)

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="section-title text-base">Streak học tập</h3>
          <p className="section-subtitle text-xs">12 tuần gần nhất</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
          style={{ background: streak > 0 ? '#ff6b3518' : undefined }}>
          <Flame className="w-4 h-4" style={{ color: streak > 0 ? '#ff6b35' : '#94a3b8' }} />
          <span className="text-sm font-bold" style={{ color: streak > 0 ? '#ff6b35' : '#94a3b8' }}>
            {streak} ngày
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex gap-1 animate-pulse">
          {Array.from({ length: 12 }).map((_, w) => (
            <div key={w} className="flex flex-col gap-1">
              {Array.from({ length: 7 }).map((__, d) => (
                <div key={d} className="w-3.5 h-3.5 rounded-sm bg-surface-100 dark:bg-surface-800" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Day labels */}
          <div className="flex mb-1">
            <div className="flex flex-col gap-0.5 mr-1.5">
              {WEEK_LABELS.map(l => (
                <div key={l} className="w-4 text-[9px] text-surface-400 h-3.5 flex items-center leading-none">{l}</div>
              ))}
            </div>
            <div className="flex gap-1 flex-1 overflow-hidden">
              {last12.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-0.5 flex-1">
                  {week.map((day, di) => {
                    if (!day) return <div key={di} className="flex-1 h-3.5" />
                    const mins   = dayMap[day] ?? 0
                    const level  = getLevel(mins)
                    const isToday = day === todayStr
                    return (
                      <div
                        key={day}
                        className={clsx(
                          'flex-1 h-3.5 rounded-sm transition-all duration-150 cursor-pointer relative',
                          LEVELS[level].color,
                          isToday && 'ring-1 ring-primary-500 ring-offset-1 dark:ring-offset-surface-900',
                          hovered === day && 'scale-125 z-10 shadow-lg'
                        )}
                        onMouseEnter={() => setHovered(day)}
                        onMouseLeave={() => setHovered(null)}
                        title={`${formatDateLabel(day)}: ${mins} phút học`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Tooltip */}
          {hovered && (
            <div className="text-xs text-center text-surface-500 dark:text-surface-400 mt-2 h-4">
              {formatDateLabel(hovered)}: <strong>{dayMap[hovered] ?? 0} phút</strong>
            </div>
          )}
          {!hovered && <div className="h-4 mt-2" />}

          {/* Legend */}
          <div className="flex items-center justify-end gap-1.5 mt-1">
            <span className="text-[10px] text-surface-400">Ít</span>
            {LEVELS.map((l, i) => (
              <div key={i} className={clsx('w-3 h-3 rounded-sm', l.color)} />
            ))}
            <span className="text-[10px] text-surface-400">Nhiều</span>
          </div>
        </>
      )}
    </div>
  )
}

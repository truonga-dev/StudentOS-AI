import { ArrowRight } from 'lucide-react'
import { clsx } from 'clsx'
import { useNavigate } from 'react-router-dom'

interface Subject {
  id: string
  title: string
  color?: string
  credits?: number
  semester?: string
}

interface Task {
  id: string
  subject_id?: string | null
  completed: boolean
}

interface SubjectProgressCardProps {
  subjects: Subject[]
  tasks: Task[]
}

function CircleProgress({ pct, color, size = 52 }: { pct: number; color: string; size?: number }) {
  const r    = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * (1 - pct / 100)
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor"
        strokeWidth="5" className="text-surface-100 dark:text-surface-800" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={dash}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
    </svg>
  )
}

export function SubjectProgressCard({ subjects, tasks }: SubjectProgressCardProps) {
  const navigate = useNavigate()

  const subjectStats = subjects.map(sub => {
    const subTasks    = tasks.filter(t => t.subject_id === sub.id)
    const done        = subTasks.filter(t => t.completed).length
    const total       = subTasks.length
    const pct         = total > 0 ? Math.round((done / total) * 100) : 0
    const color       = sub.color || '#6B4EFF'
    return { ...sub, done, total, pct, color }
  })

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="section-title text-base">Môn học</h3>
          <p className="section-subtitle text-xs">{subjects.length} môn đang theo dõi</p>
        </div>
        <button onClick={() => navigate('/subjects')}
          className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600 font-semibold">
          Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {subjectStats.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-surface-400">Chưa có môn học nào</p>
          <button onClick={() => navigate('/subjects')}
            className="mt-2 text-xs font-semibold text-primary-500 hover:text-primary-600">
            + Thêm môn học
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {subjectStats.map(sub => (
            <div
              key={sub.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-surface-100 dark:border-surface-800 hover:border-surface-200 dark:hover:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-all cursor-pointer group"
              onClick={() => navigate(`/subjects`)}>

              {/* Ring progress */}
              <div className="relative shrink-0">
                <CircleProgress pct={sub.pct} color={sub.color} size={48} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-bold" style={{ color: sub.color }}>
                    {sub.pct}%
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-surface-800 dark:text-surface-100 truncate leading-tight">
                    {sub.title}
                  </p>
                  <ArrowRight className="w-3.5 h-3.5 text-surface-300 dark:text-surface-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {sub.credits && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                      style={{ background: `${sub.color}18`, color: sub.color }}>
                      {sub.credits} TC
                    </span>
                  )}
                  <span className="text-[10px] text-surface-400">
                    {sub.done}/{sub.total} task xong
                  </span>
                  {sub.semester && (
                    <span className="text-[10px] text-surface-400">· Kỳ {sub.semester}</span>
                  )}
                </div>

                {/* Mini progress bar */}
                <div className="mt-1.5 h-1.5 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${sub.pct}%`, background: sub.color }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

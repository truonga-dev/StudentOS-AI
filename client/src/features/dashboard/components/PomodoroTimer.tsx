import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, RotateCcw, SkipForward, BookOpen, X, Maximize2, Minimize2, Headphones } from 'lucide-react'
import { clsx } from 'clsx'
import { useNavigate } from 'react-router-dom'
import { useSubjects } from '@/hooks/useSubjects'
import { useStudySessions } from '@/hooks/useStudySessions'
import { useProfile } from '@/hooks/useProfile'
import toast from 'react-hot-toast'

type TimerMode = 'idle' | 'focus' | 'paused' | 'break' | 'done'

const FOCUS_MINUTES = 25
const BREAK_MINUTES = 5

// ── SVG Ring Progress ──────────────────────────────────────────────────────────
function RingProgress({ progress, mode }: { progress: number; mode: TimerMode }) {
  const r = 52
  const circumference = 2 * Math.PI * r
  const strokeDash = circumference * (1 - progress)

  const ringColor =
    mode === 'break' ? '#22c55e' :
    mode === 'done'  ? '#6B4EFF' :
    mode === 'paused'? '#f59e0b' : '#6B4EFF'

  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className="absolute inset-0">
      {/* Track */}
      <circle cx="70" cy="70" r={r} fill="none" stroke="currentColor"
        className="text-surface-100 dark:text-surface-800" strokeWidth="8" />
      {/* Progress */}
      <circle
        cx="70" cy="70" r={r} fill="none"
        stroke={ringColor} strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDash}
        transform="rotate(-90 70 70)"
        style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
      />
    </svg>
  )
}

// ── Pomodoro Timer ─────────────────────────────────────────────────────────────
export function PomodoroTimer({ onSessionLogged }: { onSessionLogged?: () => void }) {
  const navigate = useNavigate()
  const { subjects } = useSubjects()
  const { logSession } = useStudySessions()
  const { addPoints, addXp } = useProfile()

  const [mode, setMode] = useState<TimerMode>('idle')
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_MINUTES * 60)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [sessionStarted, setSessionStarted] = useState<Date | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [pomoCount, setPomoCount] = useState(0) // số pomodoro hoàn thành hôm nay

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalSeconds = mode === 'break' ? BREAK_MINUTES * 60 : FOCUS_MINUTES * 60
  const progress = secondsLeft / totalSeconds
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')

  // Âm thanh khi hết giờ (Web Audio API)
  const playDing = useCallback(() => {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5)
      gain.gain.setValueAtTime(0.5, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1)
      osc.start()
      osc.stop(ctx.currentTime + 1)
    } catch {
      // AudioContext không available → bỏ qua
    }
  }, [])

  // Clear interval khi unmount
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  const tick = useCallback(() => {
    setSecondsLeft(prev => {
      if (prev <= 1) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        return 0
      }
      return prev - 1
    })
  }, [])

  // Khi secondsLeft = 0: xử lý kết thúc
  useEffect(() => {
    if (secondsLeft === 0 && (mode === 'focus' || mode === 'break')) {
      playDing()
      if (mode === 'focus') {
        // Log session vào DB
        const started = sessionStarted ?? new Date(Date.now() - FOCUS_MINUTES * 60 * 1000)
        logSession({
          subject_id: selectedSubjectId,
          duration_minutes: FOCUS_MINUTES,
          started_at: started.toISOString(),
          ended_at: new Date().toISOString(),
        }).then(() => onSessionLogged?.())
        
        // Cộng 10 điểm (streak) và 25 XP
        addPoints(10)
        addXp(25)
        toast.success('+25 XP! Bạn đã hoàn thành 1 Pomodoro!', { icon: '🔥' })

        setPomoCount(c => c + 1)
        setMode('done')
      } else {
        // Break xong → về idle
        setMode('idle')
        setSecondsLeft(FOCUS_MINUTES * 60)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft])

  const start = () => {
    setMode('focus')
    setSessionStarted(new Date())
    intervalRef.current = setInterval(tick, 1000)
    setExpanded(true)
  }

  const pause = () => {
    setMode('paused')
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  const resume = () => {
    setMode('focus')
    intervalRef.current = setInterval(tick, 1000)
  }

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setMode('idle')
    setSecondsLeft(FOCUS_MINUTES * 60)
    setSessionStarted(null)
  }

  const startBreak = () => {
    setMode('break')
    setSecondsLeft(BREAK_MINUTES * 60)
    intervalRef.current = setInterval(tick, 1000)
  }

  const skipBreak = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setMode('idle')
    setSecondsLeft(FOCUS_MINUTES * 60)
  }

  const modeLabel = {
    idle: 'Sẵn sàng',
    focus: 'Đang học',
    paused: 'Tạm dừng',
    break: 'Nghỉ giải lao',
    done: 'Hoàn thành! 🎉',
  }[mode]

  const modeColor = {
    idle:   'text-surface-500 dark:text-surface-400',
    focus:  'text-primary-600 dark:text-primary-400',
    paused: 'text-warning-600 dark:text-warning-400',
    break:  'text-success-600 dark:text-success-400',
    done:   'text-primary-600 dark:text-primary-400',
  }[mode]

  // ── Collapsed (mini) ──
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="card p-4 flex items-center gap-4 hover:shadow-card-hover transition-all cursor-pointer w-full"
      >
        <div className="relative w-11 h-11 shrink-0">
          <div className="w-11 h-11 rounded-full bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center">
            <span className="text-lg">🍅</span>
          </div>
        </div>
        <div className="text-left flex-1 min-w-0">
          <p className="text-sm font-semibold text-surface-800 dark:text-surface-200">Pomodoro Timer</p>
          <p className="text-xs text-surface-400">{pomoCount > 0 ? `${pomoCount} pomodoro hôm nay` : 'Bấm để bắt đầu học'}</p>
        </div>
        <span className={clsx('text-sm font-mono font-bold', modeColor)}>{mm}:{ss}</span>
      </button>
    )
  }

  // ── Expanded ──
  return (
    <div className={clsx(
      "transition-all duration-300",
      isFullscreen 
        ? "fixed inset-0 z-[100] bg-white dark:bg-surface-900 flex flex-col items-center justify-center p-8" 
        : "card p-5 space-y-4"
    )}>
      <div className={clsx(
        "w-full max-w-md mx-auto transition-all duration-300 flex flex-col",
        isFullscreen ? "scale-125 gap-8" : "gap-4"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">🍅</span>
          <h3 className="section-title text-sm">Pomodoro</h3>
          {pomoCount > 0 && !isFullscreen && (
            <span className="badge-neutral text-2xs">×{pomoCount} hôm nay</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate('/focus')}
            className="w-8 h-8 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center justify-center text-surface-400 hover:text-primary-500 transition-colors"
            title="Mở Focus Space (Toàn màn hình)"
          >
            <Headphones className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="w-8 h-8 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center justify-center text-surface-400 hover:text-surface-600 transition-colors"
            title={isFullscreen ? "Thu nhỏ" : "Phóng to"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          {!isFullscreen && (
            <button
              onClick={() => setExpanded(false)}
              className="w-8 h-8 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center justify-center text-surface-400 hover:text-surface-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Subject picker — chỉ khi idle */}
      {mode === 'idle' && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-surface-500 dark:text-surface-400 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />Môn học
          </label>
          <select
            className="input text-sm py-2"
            value={selectedSubjectId ?? ''}
            onChange={e => setSelectedSubjectId(e.target.value || null)}
          >
            <option value="">Tổng hợp (không chọn môn)</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* Timer ring */}
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="relative w-[140px] h-[140px] flex items-center justify-center">
          <RingProgress progress={progress} mode={mode} />
          <div className="text-center z-10">
            <p className={clsx('text-3xl font-bold font-mono tracking-tight', modeColor)}>
              {mm}:{ss}
            </p>
            <p className={clsx('text-xs font-medium mt-0.5', modeColor)}>{modeLabel}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {mode === 'idle' && (
            <button
              onClick={start}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-brand text-white text-sm font-semibold shadow-glow-sm hover:shadow-glow hover:opacity-90 transition-all"
            >
              <Play className="w-4 h-4 fill-white" />Bắt đầu
            </button>
          )}

          {mode === 'focus' && (
            <>
              <button
                onClick={pause}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-warning-50 dark:bg-warning-500/10 text-warning-600 dark:text-warning-400 text-sm font-medium hover:bg-warning-100 dark:hover:bg-warning-500/20 transition-colors"
              >
                <Pause className="w-4 h-4" />Tạm dừng
              </button>
              <button
                onClick={reset}
                className="w-9 h-9 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center justify-center text-surface-400 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </>
          )}

          {mode === 'paused' && (
            <>
              <button
                onClick={resume}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-sm font-medium hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors"
              >
                <Play className="w-4 h-4" />Tiếp tục
              </button>
              <button
                onClick={reset}
                className="w-9 h-9 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center justify-center text-surface-400 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </>
          )}

          {mode === 'done' && (
            <>
              <button
                onClick={startBreak}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-success-50 dark:bg-success-500/10 text-success-600 dark:text-success-400 text-sm font-medium hover:bg-success-100 transition-colors"
              >
                <Play className="w-4 h-4" />Nghỉ {BREAK_MINUTES}p
              </button>
              <button
                onClick={reset}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-sm font-medium hover:bg-primary-100 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />Pomodoro mới
              </button>
            </>
          )}

          {mode === 'break' && (
            <button
              onClick={skipBreak}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
            >
              <SkipForward className="w-4 h-4" />Bỏ qua nghỉ
            </button>
          )}
        </div>
      </div>

      {/* Mode hint */}
      {mode === 'idle' && (
        <p className="text-xs text-surface-400 text-center shrink-0">
          Tập trung {FOCUS_MINUTES} phút → nghỉ {BREAK_MINUTES} phút
        </p>
      )}
      
      </div>
    </div>
  )
}

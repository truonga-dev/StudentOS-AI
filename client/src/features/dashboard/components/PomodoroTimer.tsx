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

const ACCENT_MAP: Record<TimerMode, string> = {
  idle:   '#6B4EFF',
  focus:  '#6B4EFF',
  paused: '#f59e0b',
  break:  '#22c55e',
  done:   '#a855f7',
}

function RingProgress({ progress, mode }: { progress: number; mode: TimerMode }) {
  const r    = 54
  const circ = 2 * Math.PI * r
  const dash = circ * (1 - progress)
  const color = ACCENT_MAP[mode]
  return (
    <svg width="144" height="144" viewBox="0 0 144 144" className="absolute inset-0">
      {/* Track */}
      <circle cx="72" cy="72" r={r} fill="none" strokeWidth="8"
        stroke="currentColor" className="text-surface-100 dark:text-surface-800/60" />
      {/* Glow (dark mode) */}
      <circle cx="72" cy="72" r={r} fill="none" strokeWidth="10"
        stroke={color} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={dash}
        transform="rotate(-90 72 72)" opacity="0.2"
        style={{ filter: 'blur(4px)', transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease' }}
      />
      {/* Main ring */}
      <circle cx="72" cy="72" r={r} fill="none" strokeWidth="8"
        stroke={color} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={dash}
        transform="rotate(-90 72 72)"
        style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease' }}
      />
    </svg>
  )
}

export function PomodoroTimer({ onSessionLogged }: { onSessionLogged?: () => void }) {
  const navigate = useNavigate()
  const { subjects } = useSubjects()
  const { logSession } = useStudySessions()
  const { recordActivity } = useProfile()

  const [mode, setMode]                     = useState<TimerMode>('idle')
  const [secondsLeft, setSecondsLeft]       = useState(FOCUS_MINUTES * 60)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [sessionStarted, setSessionStarted] = useState<Date | null>(null)
  const [expanded, setExpanded]             = useState(false)
  const [isFullscreen, setIsFullscreen]     = useState(false)
  const [pomoCount, setPomoCount]           = useState(0)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalSeconds = mode === 'break' ? BREAK_MINUTES * 60 : FOCUS_MINUTES * 60
  const progress     = secondsLeft / totalSeconds
  const mm           = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss           = String(secondsLeft % 60).padStart(2, '0')
  const accent       = ACCENT_MAP[mode]

  const playDing = useCallback(() => {
    try {
      const ctx = new AudioContext()
      ;[[523, 0, 0.5], [659, 0.25, 0.5], [784, 0.5, 0.7]].forEach(([f, t, d]) => {
        const o = ctx.createOscillator(), g = ctx.createGain()
        o.connect(g); g.connect(ctx.destination)
        o.type = 'sine'; o.frequency.value = f
        g.gain.setValueAtTime(0, ctx.currentTime + t)
        g.gain.linearRampToValueAtTime(0.3, ctx.currentTime + t + 0.05)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + d)
        o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + d)
      })
    } catch {}
  }, [])

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  const tick = useCallback(() => {
    setSecondsLeft(p => { if (p <= 1) { clearInterval(intervalRef.current!); return 0 } return p - 1 })
  }, [])

  useEffect(() => {
    if (secondsLeft !== 0 || (mode !== 'focus' && mode !== 'break')) return
    playDing()
    if (mode === 'focus') {
      const started = sessionStarted ?? new Date(Date.now() - FOCUS_MINUTES * 60 * 1000)
      logSession({ subject_id: selectedSubjectId, duration_minutes: FOCUS_MINUTES, started_at: started.toISOString(), ended_at: new Date().toISOString() })
        .then(() => onSessionLogged?.())
      recordActivity(25, 10)
      toast.success('🔥 +25 XP! Hoàn thành 1 Pomodoro!', { icon: '🍅' })
      setPomoCount(c => c + 1); setMode('done')
    } else {
      setMode('idle'); setSecondsLeft(FOCUS_MINUTES * 60)
    }
  }, [secondsLeft]) // eslint-disable-line

  const start = () => { setMode('focus'); setSessionStarted(new Date()); intervalRef.current = setInterval(tick, 1000); setExpanded(true) }
  const pause = () => { setMode('paused'); clearInterval(intervalRef.current!) }
  const resume = () => { setMode('focus'); intervalRef.current = setInterval(tick, 1000) }
  const reset  = () => { clearInterval(intervalRef.current!); setMode('idle'); setSecondsLeft(FOCUS_MINUTES * 60); setSessionStarted(null) }
  const startBreak = () => { setMode('break'); setSecondsLeft(BREAK_MINUTES * 60); intervalRef.current = setInterval(tick, 1000) }
  const skipBreak  = () => { clearInterval(intervalRef.current!); setMode('idle'); setSecondsLeft(FOCUS_MINUTES * 60) }

  const modeLabel = { idle: 'Sẵn sàng', focus: 'Đang học', paused: 'Tạm dừng', break: 'Nghỉ giải lao', done: 'Hoàn thành! 🎉' }[mode]

  // ── Collapsed (mini) ──────────────────────────────────────────────────────
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="card p-4 flex items-center gap-3.5 hover:shadow-card-hover transition-all cursor-pointer w-full group"
      >
        {/* Ring mini */}
        <div className="relative w-11 h-11 shrink-0">
          <svg width="44" height="44" viewBox="0 0 44 44" className="absolute inset-0">
            <circle cx="22" cy="22" r="18" fill="none" strokeWidth="4"
              stroke="currentColor" className="text-surface-100 dark:text-surface-800" />
            <circle cx="22" cy="22" r="18" fill="none" strokeWidth="4"
              stroke={accent} strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 18}
              strokeDashoffset={2 * Math.PI * 18 * (1 - progress)}
              transform="rotate(-90 22 22)"
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg leading-none">{mode === 'done' ? '🏆' : '🍅'}</span>
          </div>
        </div>

        <div className="text-left flex-1 min-w-0">
          <p className="text-sm font-bold text-surface-800 dark:text-surface-100">Pomodoro Timer</p>
          <p className="text-xs text-surface-400 truncate">
            {pomoCount > 0 ? `🔥 ${pomoCount} pomo hôm nay` : 'Nhấn để bắt đầu'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-bold tabular-nums" style={{ color: accent }}>{mm}:{ss}</span>
          <div className="w-6 h-6 rounded-lg flex items-center justify-center transition-all"
            style={{ background: `${accent}18` }}>
            <Play className="w-3 h-3 ml-0.5" style={{ color: accent }} />
          </div>
        </div>
      </button>
    )
  }

  // ── Expanded ──────────────────────────────────────────────────────────────
  return (
    <div className={clsx(
      'transition-all duration-300 overflow-hidden',
      isFullscreen
        ? 'fixed inset-0 z-[100] flex items-center justify-center'
        : 'card'
    )}
      style={isFullscreen ? {
        background: 'linear-gradient(135deg, #0a0a1a 0%, #0d0b1e 50%, #0a1020 100%)'
      } : {}}>

      <div className={clsx(
        'w-full max-w-sm mx-auto flex flex-col',
        isFullscreen ? 'gap-6 scale-125' : 'gap-4 p-5'
      )}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
              style={{ background: `${accent}20` }}>🍅</div>
            <h3 className={clsx('font-bold text-sm', isFullscreen ? 'text-white' : 'text-surface-800 dark:text-surface-100')}>
              Pomodoro
            </h3>
            {pomoCount > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${accent}20`, color: accent }}>
                ×{pomoCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => navigate('/focus')}
              className={clsx('w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                isFullscreen ? 'text-white/50 hover:bg-white/10 hover:text-white' : 'text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 hover:text-primary-500')}
              title="Mở Focus Space">
              <Headphones className="w-4 h-4" />
            </button>
            <button onClick={() => setIsFullscreen(f => !f)}
              className={clsx('w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                isFullscreen ? 'text-white/50 hover:bg-white/10 hover:text-white' : 'text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 hover:text-surface-600')}>
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            {!isFullscreen && (
              <button onClick={() => setExpanded(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 hover:text-surface-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Subject picker */}
        {mode === 'idle' && (
          <div className="space-y-1.5">
            <label className={clsx('text-xs font-medium flex items-center gap-1.5',
              isFullscreen ? 'text-white/50' : 'text-surface-500 dark:text-surface-400')}>
              <BookOpen className="w-3.5 h-3.5" />Môn học
            </label>
            <select
              className={clsx('w-full text-sm py-2.5 px-3 rounded-xl outline-none border transition-all appearance-none cursor-pointer',
                isFullscreen
                  ? 'bg-white/8 border-white/15 text-white focus:border-white/30'
                  : 'input'
              )}
              style={isFullscreen ? { colorScheme: 'dark' } : {}}
              value={selectedSubjectId ?? ''}
              onChange={e => setSelectedSubjectId(e.target.value || null)}>
              <option value="">Tổng hợp (không chọn môn)</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
        )}

        {/* Timer ring */}
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="relative w-[144px] h-[144px] flex items-center justify-center">
            <RingProgress progress={progress} mode={mode} />
            <div className="text-center z-10">
              <p className={clsx('text-3xl font-black font-mono tracking-tight tabular-nums transition-colors duration-400',
                isFullscreen ? 'text-white' : '')}
                style={{ color: isFullscreen ? '#fff' : accent, textShadow: isFullscreen ? `0 0 30px ${accent}60` : 'none' }}>
                {mm}:{ss}
              </p>
              <p className="text-xs font-semibold mt-1 transition-colors duration-400" style={{ color: isFullscreen ? `${accent}bb` : accent }}>
                {modeLabel}
              </p>
            </div>
          </div>

          {/* Mode dots (pomo count) */}
          {pomoCount > 0 && (
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(pomoCount, 6) }).map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
              ))}
              {pomoCount > 6 && <span className="text-[10px] text-surface-400 ml-0.5">+{pomoCount - 6}</span>}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-2.5">
            {mode === 'idle' && (
              <button onClick={start}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-white text-sm font-bold shadow-lg transition-all hover:scale-105 active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                  boxShadow: `0 4px 20px ${accent}40`
                }}>
                <Play className="w-4 h-4 fill-white" />Bắt đầu
              </button>
            )}

            {mode === 'focus' && (
              <>
                <button onClick={pause}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
                  style={{ background: `${ACCENT_MAP.paused}18`, color: ACCENT_MAP.paused }}>
                  <Pause className="w-4 h-4" />Tạm dừng
                </button>
                <button onClick={reset}
                  className={clsx('w-9 h-9 rounded-xl flex items-center justify-center transition-colors',
                    isFullscreen ? 'text-white/40 hover:bg-white/10 hover:text-white/70' : 'text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700')}>
                  <RotateCcw className="w-4 h-4" />
                </button>
              </>
            )}

            {mode === 'paused' && (
              <>
                <button onClick={resume}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
                  style={{ background: `${accent}18`, color: accent }}>
                  <Play className="w-4 h-4" />Tiếp tục
                </button>
                <button onClick={reset}
                  className={clsx('w-9 h-9 rounded-xl flex items-center justify-center transition-colors',
                    isFullscreen ? 'text-white/40 hover:bg-white/10 hover:text-white/70' : 'text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700')}>
                  <RotateCcw className="w-4 h-4" />
                </button>
              </>
            )}

            {mode === 'done' && (
              <>
                <button onClick={startBreak}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
                  style={{ background: `${ACCENT_MAP.break}18`, color: ACCENT_MAP.break }}>
                  <Play className="w-4 h-4" />Nghỉ {BREAK_MINUTES}p
                </button>
                <button onClick={reset}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{ background: `${accent}12`, color: accent }}>
                  <RotateCcw className="w-4 h-4" />Pomo mới
                </button>
              </>
            )}

            {mode === 'break' && (
              <button onClick={skipBreak}
                className={clsx('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                  isFullscreen ? 'bg-white/8 text-white/60 hover:bg-white/15' : 'bg-surface-100 dark:bg-surface-800 text-surface-500 hover:bg-surface-200 dark:hover:bg-surface-700')}>
                <SkipForward className="w-4 h-4" />Bỏ qua nghỉ
              </button>
            )}
          </div>
        </div>

        {/* Hint */}
        {mode === 'idle' && (
          <p className={clsx('text-xs text-center', isFullscreen ? 'text-white/25' : 'text-surface-400')}>
            Tập trung {FOCUS_MINUTES} phút → nghỉ {BREAK_MINUTES} phút
          </p>
        )}
      </div>
    </div>
  )
}

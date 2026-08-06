import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Play, Pause, RotateCcw, SkipForward,
  Maximize2, Minimize2, ArrowLeft, Volume2, VolumeX,
  ListTodo, Music2, ChevronDown, Check, Coffee, Settings2, X,
  Radio, SkipBack
} from 'lucide-react'
import { clsx } from 'clsx'
import { useNavigate } from 'react-router-dom'
import { useSubjects } from '@/hooks/useSubjects'
import { useStudySessions } from '@/hooks/useStudySessions'
import { useProfile } from '@/hooks/useProfile'
import { useTasks } from '@/hooks/useTasks'
import toast from 'react-hot-toast'

type TimerMode = 'idle' | 'focus' | 'paused' | 'break' | 'done'

// ─────────────────────────────────────────────────────────────────────────────
// Đài radio internet miễn phí – phát qua thẻ <audio> trực tiếp, không widget
// Nguồn: laut.fm, ilovemusic.de, somafm.com — tất cả đều miễn phí & không BQ
// ─────────────────────────────────────────────────────────────────────────────
const STATIONS = [
  // ── Lofi / Hip Hop ────────────────────────────────────────────────────────
  {
    name: 'Lofi Hip Hop Radio',
    url: 'https://stream.laut.fm/lofi',
    emoji: '📚', mood: 'Tập trung',
    grad: ['#6B4EFF', '#a78bfa'] as [string, string],
  },
  {
    name: 'Lofi Beats 24/7',
    url: 'https://streams.ilovemusic.de/iloveradio17.mp3',
    emoji: '🎧', mood: 'Lofi chill',
    grad: ['#8b5cf6', '#c4b5fd'] as [string, string],
  },
  // ── Chill / Ambient ───────────────────────────────────────────────────────
  {
    name: 'Chillout Radio',
    url: 'https://stream.laut.fm/chillout',
    emoji: '🌙', mood: 'Chill',
    grad: ['#f59e0b', '#fbbf24'] as [string, string],
  },
  {
    name: 'Ambient Relaxation',
    url: 'https://stream.laut.fm/ambient',
    emoji: '🌿', mood: 'Thư giãn',
    grad: ['#10b981', '#6ee7b7'] as [string, string],
  },
  {
    name: 'Drone Zone — SomaFM',
    url: 'https://ice1.somafm.com/dronezone-128-mp3',
    emoji: '🌌', mood: 'Không gian',
    grad: ['#0ea5e9', '#7dd3fc'] as [string, string],
  },
  {
    name: 'Space Station — SomaFM',
    url: 'https://ice1.somafm.com/spacestation-128-mp3',
    emoji: '🚀', mood: 'Vũ trụ',
    grad: ['#1d4ed8', '#60a5fa'] as [string, string],
  },
  // ── Café / Acoustic ───────────────────────────────────────────────────────
  {
    name: 'Acoustic Café',
    url: 'https://stream.laut.fm/acoustic',
    emoji: '☕', mood: 'Café Mood',
    grad: ['#ec4899', '#f472b6'] as [string, string],
  },
  {
    name: 'Coffee House — SomaFM',
    url: 'https://ice1.somafm.com/coffeehouse-128-mp3',
    emoji: '🫖', mood: 'Quán cà phê',
    grad: ['#92400e', '#d97706'] as [string, string],
  },
  // ── Jazz ─────────────────────────────────────────────────────────────────
  {
    name: 'Smooth Jazz',
    url: 'https://stream.laut.fm/smooth-jazz',
    emoji: '🎷', mood: 'Jazz thư giãn',
    grad: ['#22c55e', '#4ade80'] as [string, string],
  },
  {
    name: 'Jazz & Blues Radio',
    url: 'https://ice1.somafm.com/groovesalad-128-mp3',
    emoji: '🎺', mood: 'Jazz & Groove',
    grad: ['#d97706', '#fbbf24'] as [string, string],
  },
  // ── Piano / Classical ─────────────────────────────────────────────────────
  {
    name: 'Piano Radio',
    url: 'https://stream.laut.fm/piano',
    emoji: '🎹', mood: 'Piano cổ điển',
    grad: ['#e2e8f0', '#94a3b8'] as [string, string],
  },
  {
    name: 'Classical Music',
    url: 'https://stream.laut.fm/classical',
    emoji: '🎻', mood: 'Cổ điển',
    grad: ['#fbbf24', '#f59e0b'] as [string, string],
  },
  // ── Deep House / Electronic ───────────────────────────────────────────────
  {
    name: 'Deep Focus',
    url: 'https://stream.laut.fm/deephouse',
    emoji: '🌊', mood: 'Deep Focus',
    grad: ['#06b6d4', '#38bdf8'] as [string, string],
  },
  {
    name: 'Indie Pop Rocks — SomaFM',
    url: 'https://ice1.somafm.com/indiepop-128-mp3',
    emoji: '🎸', mood: 'Indie nhẹ nhàng',
    grad: ['#f472b6', '#fb7185'] as [string, string],
  },
  // ── Thiên nhiên / Meditation ──────────────────────────────────────────────
  {
    name: 'Meditation & Healing',
    url: 'https://stream.laut.fm/meditation',
    emoji: '🧘', mood: 'Thiền định',
    grad: ['#34d399', '#6ee7b7'] as [string, string],
  },
]


const FOCUS_PRESETS = [15, 25, 30, 45, 50]

// Phân nhóm đài theo thể loại để hiển thị trong dropdown
const STATION_GROUPS = [
  { label: '🎧 Lofi / Hip Hop', indices: [0, 1] },
  { label: '🌙 Chill / Ambient', indices: [2, 3, 4, 5] },
  { label: '☕ Café / Acoustic', indices: [6, 7] },
  { label: '🎷 Jazz & Blues', indices: [8, 9] },
  { label: '🎹 Piano / Classical', indices: [10, 11] },
  { label: '🌊 Deep / Electronic', indices: [12, 13] },
  { label: '🧘 Thiền định', indices: [14] },
]

// Waveform bars animation (CSS)
function WaveformBars({ active, color }: { active: boolean; color: string }) {
  return (
    <div className="flex items-end gap-[2px] h-4">
      {[3, 5, 4, 6, 3, 7, 4, 5, 3].map((h, i) => (
        <div
          key={i}
          className="w-[2px] rounded-full transition-all"
          style={{
            height: active ? `${h * 2}px` : '4px',
            background: active ? color : 'rgba(255,255,255,0.2)',
            animation: active ? `waveBar ${0.5 + i * 0.07}s ease-in-out infinite alternate` : 'none',
            animationDelay: `${i * 0.06}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes waveBar {
          0% { transform: scaleY(0.4); }
          100% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  )
}

export function FocusSpacePage() {
  const navigate = useNavigate()
  const { subjects } = useSubjects()
  const { logSession } = useStudySessions()
  const { addPoints, addXp } = useProfile()
  const { tasks, toggle: toggleTask } = useTasks()

  // ── Timer state ──────────────────────────────────────────────────────────
  const [mode, setMode]                       = useState<TimerMode>('idle')
  const [focusMin, setFocusMin]               = useState(25)
  const [breakMin]                            = useState(5)
  const [secondsLeft, setSecondsLeft]         = useState(25 * 60)
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [sessionStart, setSessionStart]       = useState<Date | null>(null)
  const [isFullscreen, setIsFullscreen]       = useState(false)
  const [pomoCount, setPomoCount]             = useState(0)
  const [showTasks, setShowTasks]             = useState(false)
  const [showSettings, setShowSettings]       = useState(false)
  const [showMusicMenu, setShowMusicMenu]     = useState(false)

  // ── Music state ──────────────────────────────────────────────────────────
  const [stationIdx, setStationIdx]   = useState(0)
  const [musicPlaying, setMusicPlaying] = useState(false)
  const [volume, setVolume]             = useState(0.65)
  const [muted, setMuted]               = useState(false)
  const [musicError, setMusicError]     = useState(false)

  const audioRef    = useRef<HTMLAudioElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const station = STATIONS[stationIdx]
  const totalSec  = mode === 'break' ? breakMin * 60 : focusMin * 60
  const progress  = secondsLeft / totalSec
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')
  const R    = 110
  const circ = 2 * Math.PI * R
  const dash = circ * (1 - progress)

  const ACCENT  = mode === 'break' ? '#22c55e' : mode === 'done' ? '#a855f7' : mode === 'paused' ? '#f59e0b' : station.grad[0]
  const ACCENT2 = mode === 'break' ? '#4ade80' : mode === 'done' ? '#c084fc' : mode === 'paused' ? '#fbbf24' : station.grad[1]

  // ── Audio controls ───────────────────────────────────────────────────────
  const playAudio = useCallback(async (idx = stationIdx) => {
    const el = audioRef.current
    if (!el) return
    setMusicError(false)
    el.src = STATIONS[idx].url
    el.volume = muted ? 0 : volume
    el.load()
    try {
      await el.play()
      setMusicPlaying(true)
    } catch {
      setMusicError(true)
      toast.error('Không thể phát đài này, thử đài khác nhé!', { id: 'music-err' })
    }
  }, [stationIdx, volume, muted])

  const pauseAudio = () => {
    audioRef.current?.pause()
    setMusicPlaying(false)
  }

  const toggleMusic = () => {
    if (musicPlaying) pauseAudio()
    else playAudio()
  }

  const changeStation = (idx: number) => {
    setStationIdx(idx)
    setShowMusicMenu(false)
    setMusicError(false)
    if (musicPlaying) playAudio(idx)
    else {
      const el = audioRef.current
      if (el) { el.src = STATIONS[idx].url; el.load() }
    }
  }

  // Volume sync
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume
  }, [volume, muted])

  // ── Timer logic ──────────────────────────────────────────────────────────
  const playDing = useCallback(() => {
    try {
      const ctx = new window.AudioContext()
      ;[[523, 0, 0.5], [659, 0.25, 0.5], [784, 0.5, 0.8]].forEach(([f, t, d]) => {
        const o = ctx.createOscillator(), g = ctx.createGain()
        o.connect(g); g.connect(ctx.destination)
        o.type = 'sine'; o.frequency.value = f
        g.gain.setValueAtTime(0, ctx.currentTime + t)
        g.gain.linearRampToValueAtTime(0.35, ctx.currentTime + t + 0.05)
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
      setMode('done'); setPomoCount(c => c + 1)
      toast.success('🎉 Hoàn thành Pomodoro! +' + focusMin * 2 + ' XP', { duration: 5000, position: 'top-center' })
      if (selectedSubject && sessionStart) {
        logSession({ subject_id: selectedSubject, duration_minutes: focusMin, started_at: sessionStart.toISOString(), ended_at: new Date().toISOString() })
        addPoints(focusMin); addXp(focusMin * 2)
      }
    } else {
      setMode('idle'); setSecondsLeft(focusMin * 60)
      toast('💪 Hết giờ nghỉ! Sẵn sàng tiếp tục!', { position: 'top-center' })
    }
  }, [secondsLeft]) // eslint-disable-line

  const startFocus = () => {
    if (!selectedSubject && mode === 'idle') { toast.error('Chọn môn học để theo dõi tiến độ!'); return }
    if (mode === 'idle') setSessionStart(new Date())
    setMode('focus')
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(tick, 1000)
    // Auto-start music
    if (!musicPlaying) playAudio()
  }
  const pauseTimer = () => { setMode('paused'); clearInterval(intervalRef.current!) }
  const startBreak = () => { setMode('break'); setSecondsLeft(breakMin * 60); intervalRef.current = setInterval(tick, 1000) }
  const resetTimer = () => { setMode('idle'); setSecondsLeft(focusMin * 60); clearInterval(intervalRef.current!) }
  const changeFocus = (m: number) => { setFocusMin(m); if (mode === 'idle') setSecondsLeft(m * 60) }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) { document.documentElement.requestFullscreen().catch(() => {}); setIsFullscreen(true) }
    else { document.exitFullscreen().catch(() => {}); setIsFullscreen(false) }
  }
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  const pendingTasks = tasks.filter(t => !t.completed)

  return (
    <div className="fixed inset-0 z-50 flex flex-col select-none overflow-hidden" style={{ background: '#07070f' }}>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onError={() => { setMusicPlaying(false); setMusicError(true) }}
        onPlay={() => setMusicPlaying(true)}
        onPause={() => setMusicPlaying(false)}
        style={{ display: 'none' }}
      />

      {/* ── Animated background ─────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 transition-all duration-1000"
          style={{
            background: `
              radial-gradient(ellipse 100% 60% at 50% -10%, ${ACCENT}22 0%, transparent 65%),
              radial-gradient(ellipse 70% 55% at 90% 90%, ${ACCENT}18 0%, transparent 60%),
              radial-gradient(ellipse 60% 50% at 5% 70%, ${ACCENT2}12 0%, transparent 55%)
            `
          }} />
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: `linear-gradient(${ACCENT} 1px, transparent 1px), linear-gradient(90deg, ${ACCENT} 1px, transparent 1px)`,
          backgroundSize: '64px 64px'
        }} />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full opacity-[0.07] blur-[140px] transition-all duration-1000"
          style={{ background: `radial-gradient(circle, ${ACCENT}, transparent 65%)` }} />
      </div>

      {/* ── Top nav ─────────────────────────────────────────────────────── */}
      <div className="relative z-20 flex items-center justify-between px-4 sm:px-6 pt-4 pb-2 gap-2">
        {/* Back */}
        <button onClick={() => navigate('/dashboard')}
          className="group flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-2xl border border-white/10 backdrop-blur-xl hover:border-white/20 transition-all shrink-0"
          style={{ background: 'rgba(255,255,255,0.06)' }}>
          <ArrowLeft className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
          <span className="hidden sm:block text-sm font-medium text-white/60 group-hover:text-white transition-colors">Quay lại</span>
        </button>

        {/* Music selector */}
        <div className="relative flex-1 max-w-xs mx-auto">
          <button onClick={() => setShowMusicMenu(m => !m)}
            className="w-full flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-2xl border border-white/10 backdrop-blur-xl hover:border-white/20 transition-all"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            <span className="text-base shrink-0">{station.emoji}</span>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs sm:text-sm font-semibold text-white/80 truncate">{station.name}</p>
              <p className="text-[10px] text-white/35 hidden sm:block">{station.mood} · Free Radio</p>
            </div>
            {musicPlaying && <WaveformBars active={musicPlaying} color={ACCENT} />}
            <ChevronDown className={clsx('w-3.5 h-3.5 text-white/35 shrink-0 transition-transform', showMusicMenu && 'rotate-180')} />
          </button>

          {showMusicMenu && (
            <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl overflow-hidden shadow-2xl border border-white/10"
              style={{ background: 'rgba(8,8,18,0.97)', backdropFilter: 'blur(24px)' }}>
              {/* Header */}
              <div className="px-4 py-2.5 border-b border-white/8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-3 h-3 text-white/30" />
                  <p className="text-[10px] font-bold text-white/35 uppercase tracking-widest">15 Đài Radio · Miễn phí</p>
                </div>
                <div className="flex items-center gap-1">
                  {['laut.fm','SomaFM','iLoveMusic'].map(src => (
                    <span key={src} className="text-[9px] px-1.5 py-0.5 rounded-md border border-white/10 text-white/25">{src}</span>
                  ))}
                </div>
              </div>
              {/* Grouped list - scrollable */}
              <div className="overflow-y-auto" style={{ maxHeight: '360px' }}>
                {STATION_GROUPS.map(group => (
                  <div key={group.label}>
                    <div className="px-3 pt-3 pb-1">
                      <p className="text-[10px] font-bold text-white/25 uppercase tracking-wider">{group.label}</p>
                    </div>
                    <div className="px-2 pb-1 space-y-0.5">
                      {group.indices.map(i => {
                        const st = STATIONS[i]
                        const src = st.url.includes('somafm') ? 'SomaFM'
                          : st.url.includes('ilovemusic') ? 'iLoveMusic' : 'laut.fm'
                        return (
                          <button key={i} onClick={() => changeStation(i)}
                            className={clsx('w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all group',
                              i === stationIdx ? 'bg-white/12' : 'hover:bg-white/6')}>
                            {/* Color dot */}
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-base shrink-0"
                              style={{ background: i === stationIdx ? `${st.grad[0]}30` : 'rgba(255,255,255,0.06)' }}>
                              {st.emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={clsx('text-sm font-medium truncate', i === stationIdx ? 'text-white' : 'text-white/75 group-hover:text-white/90')}>
                                {st.name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] text-white/25">{src}</span>
                                <span className="text-white/15">·</span>
                                <span className="text-[9px] text-white/30">{st.mood}</span>
                              </div>
                            </div>
                            {/* Right indicator */}
                            {i === stationIdx && musicPlaying
                              ? <WaveformBars active={true} color={st.grad[0]} />
                              : i === stationIdx
                                ? <div className="w-1.5 h-1.5 rounded-full" style={{ background: st.grad[0], boxShadow: `0 0 6px ${st.grad[0]}` }} />
                                : null
                            }
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
                <div className="h-2" />
              </div>
            </div>
          )}
        </div>

        {/* Right icons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => setShowTasks(s => !s)}
            className={clsx('w-9 h-9 sm:w-10 sm:h-10 rounded-xl border backdrop-blur-xl flex items-center justify-center transition-all',
              showTasks ? 'border-white/25 text-white' : 'border-white/10 text-white/50 hover:text-white hover:border-white/20')}
            style={{ background: showTasks ? `${ACCENT}28` : 'rgba(255,255,255,0.06)' }}>
            <ListTodo className="w-4 h-4" />
          </button>
          <button onClick={() => setShowSettings(s => !s)}
            className={clsx('w-9 h-9 sm:w-10 sm:h-10 rounded-xl border backdrop-blur-xl flex items-center justify-center transition-all',
              showSettings ? 'border-white/25 text-white' : 'border-white/10 text-white/50 hover:text-white hover:border-white/20')}
            style={{ background: showSettings ? `${ACCENT}28` : 'rgba(255,255,255,0.06)' }}>
            <Settings2 className="w-4 h-4" />
          </button>
          <button onClick={toggleFullscreen}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-white/10 backdrop-blur-xl flex items-center justify-center text-white/50 hover:text-white hover:border-white/20 transition-all"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 pb-4 overflow-hidden">
        <div className="flex flex-col items-center gap-5 w-full max-w-sm">

          {/* Pomo dots */}
          {pomoCount > 0 && (
            <div className="flex items-center gap-1.5">
              {Array.from({ length: Math.min(pomoCount, 8) }).map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full"
                  style={{ background: ACCENT, boxShadow: `0 0 6px ${ACCENT}` }} />
              ))}
              {pomoCount > 8 && <span className="text-[10px] text-white/40 ml-1">+{pomoCount - 8}</span>}
              <span className="text-[10px] text-white/30 ml-1.5">{pomoCount} pomodoro hôm nay</span>
            </div>
          )}

          {/* Mode badge */}
          <div className="flex items-center gap-2 px-5 py-2 rounded-full border backdrop-blur-xl transition-all duration-500"
            style={{ background: `${ACCENT}18`, borderColor: `${ACCENT}40`, color: ACCENT }}>
            <span>{mode === 'idle' ? '🎯' : mode === 'focus' ? '🔥' : mode === 'paused' ? '⏸️' : mode === 'break' ? '☕' : '🏆'}</span>
            <span className="text-sm font-bold">{
              mode === 'idle' ? 'Chuẩn bị tập trung' : mode === 'focus' ? 'Đang tập trung...' :
              mode === 'paused' ? 'Đã tạm dừng' : mode === 'break' ? 'Thời gian nghỉ ngơi' : 'Hoàn thành!'
            }</span>
          </div>

          {/* SVG Ring */}
          <div className="relative flex items-center justify-center" style={{ width: 270, height: 270 }}>
            <svg width="270" height="270" viewBox="0 0 270 270" className="absolute inset-0">
              <circle cx="135" cy="135" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" />
              <circle cx="135" cy="135" r={R} fill="none" stroke={ACCENT}
                strokeWidth="18" strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={dash}
                transform="rotate(-90 135 135)" opacity="0.20"
                style={{ filter: 'blur(12px)', transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
              />
              <circle cx="135" cy="135" r={R} fill="none" stroke="url(#rg2)"
                strokeWidth="12" strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={dash}
                transform="rotate(-90 135 135)"
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
              <defs>
                <linearGradient id="rg2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={ACCENT} />
                  <stop offset="100%" stopColor={ACCENT2} />
                </linearGradient>
              </defs>
              {mode !== 'idle' && (() => {
                const angle = (progress * 2 * Math.PI) - Math.PI / 2
                return <circle cx={135 + R * Math.cos(angle)} cy={135 + R * Math.sin(angle)}
                  r="7" fill={ACCENT} style={{ filter: `drop-shadow(0 0 8px ${ACCENT})`, transition: 'all 1s linear' }} />
              })()}
            </svg>

            <div className="flex flex-col items-center z-10">
              <div className="text-[68px] sm:text-[76px] font-black tabular-nums tracking-tighter leading-none"
                style={{ color: '#fff', textShadow: `0 0 55px ${ACCENT}70` }}>
                {mm}:{ss}
              </div>
              <div className="text-sm font-medium mt-2" style={{ color: `${ACCENT}aa` }}>
                {mode === 'focus' ? `${focusMin} phút tập trung` : mode === 'break' ? `${breakMin} phút nghỉ ngơi` : mode === 'done' ? 'Xuất sắc! 🎉' : `${focusMin}p tập trung · ${breakMin}p nghỉ`}
              </div>
            </div>
          </div>

          {/* Subject picker */}
          {(mode === 'idle' || mode === 'done') && (
            <select value={selectedSubject || ''} onChange={e => setSelectedSubject(e.target.value || null)}
              className="w-full max-w-xs text-sm text-white rounded-2xl px-4 py-3 outline-none border transition-all appearance-none cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.07)', borderColor: selectedSubject ? `${ACCENT}60` : 'rgba(255,255,255,0.12)', colorScheme: 'dark' }}>
              <option value="" className="bg-gray-900">📖 Chọn môn học...</option>
              {subjects.map(s => <option key={s.id} value={s.id} className="bg-gray-900">{s.title}</option>)}
            </select>
          )}

          {/* Settings */}
          {showSettings && mode === 'idle' && (
            <div className="w-full max-w-xs rounded-2xl border border-white/10 p-4 space-y-3 animate-in slide-in-from-top-2 duration-200"
              style={{ background: 'rgba(255,255,255,0.05)' }}>
              <p className="text-[10px] font-bold text-white/35 uppercase tracking-widest">⏱ Thời gian tập trung</p>
              <div className="flex gap-2 flex-wrap">
                {FOCUS_PRESETS.map(m => (
                  <button key={m} onClick={() => changeFocus(m)}
                    className="px-3.5 py-1.5 rounded-xl text-sm font-bold transition-all"
                    style={{
                      background: focusMin === m ? ACCENT : 'rgba(255,255,255,0.08)',
                      color: focusMin === m ? '#fff' : 'rgba(255,255,255,0.45)',
                      boxShadow: focusMin === m ? `0 0 20px ${ACCENT}50` : 'none',
                    }}>
                    {m}p
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Timer controls */}
          <div className="flex items-center gap-4">
            {(mode === 'idle' || mode === 'paused') && (
              <button onClick={startFocus}
                className="flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
                  boxShadow: `0 0 55px ${ACCENT}65, 0 12px 40px rgba(0,0,0,0.5)`,
                }}>
                <Play className="w-9 h-9 text-white fill-white ml-1" />
              </button>
            )}
            {mode === 'focus' && (
              <button onClick={pauseTimer}
                className="flex items-center justify-center border border-white/20 transition-all hover:scale-110 active:scale-95 hover:bg-white/15"
                style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }}>
                <Pause className="w-9 h-9 text-white fill-white" />
              </button>
            )}
            {mode === 'done' && (
              <>
                <button onClick={startBreak}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-white text-sm hover:scale-105 transition-all"
                  style={{ background: 'linear-gradient(135deg,#22c55e,#4ade80)', boxShadow: '0 0 40px #22c55e50' }}>
                  <Coffee className="w-5 h-5" /> Nghỉ {breakMin}p
                </button>
                <button onClick={resetTimer}
                  className="w-14 h-14 rounded-2xl border border-white/12 flex items-center justify-center text-white/45 hover:text-white hover:border-white/25 transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <SkipForward className="w-5 h-5" />
                </button>
              </>
            )}
            {(mode === 'focus' || mode === 'paused' || mode === 'break') && (
              <button onClick={resetTimer}
                className="w-14 h-14 rounded-2xl border border-white/10 flex items-center justify-center text-white/40 hover:text-white/70 transition-all"
                style={{ background: 'rgba(255,255,255,0.04)' }}>
                <RotateCcw className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Music mini player */}
          <div className="w-full max-w-xs rounded-2xl border border-white/10 p-3 flex items-center gap-3"
            style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ background: `${ACCENT}25` }}>
              {station.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white/85 truncate">{station.name}</p>
              <p className="text-[10px] text-white/35">{musicError ? '⚠️ Lỗi stream' : musicPlaying ? '🎵 Đang phát' : '⏸ Tạm dừng'}</p>
            </div>
            {/* Prev station */}
            <button onClick={() => changeStation((stationIdx - 1 + STATIONS.length) % STATIONS.length)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70 transition-colors">
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            {/* Play/pause */}
            <button onClick={toggleMusic}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold transition-all hover:scale-110"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, boxShadow: `0 0 16px ${ACCENT}50` }}>
              {musicPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
            </button>
            {/* Mute */}
            <button onClick={() => setMuted(m => !m)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70 transition-colors">
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            {/* Next station */}
            <button onClick={() => changeStation((stationIdx + 1) % STATIONS.length)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70 transition-colors">
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Volume slider */}
          <div className="w-full max-w-xs flex items-center gap-3">
            <VolumeX className="w-3.5 h-3.5 text-white/25 shrink-0" />
            <input type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume}
              onChange={e => { setVolume(+e.target.value); setMuted(false) }}
              className="flex-1 h-1.5 rounded-full cursor-pointer appearance-none"
              style={{ accentColor: ACCENT }}
            />
            <Volume2 className="w-3.5 h-3.5 text-white/25 shrink-0" />
          </div>

          {/* Settings & tips */}
          {showSettings && mode === 'idle' && (
            <div className="w-full max-w-xs rounded-2xl border border-white/10 p-4 space-y-2 animate-in slide-in-from-top-2 duration-200"
              style={{ background: 'rgba(255,255,255,0.05)' }}>
              <p className="text-[10px] font-bold text-white/35 uppercase tracking-widest">⏱ Thời gian tập trung</p>
              <div className="flex gap-2 flex-wrap">
                {FOCUS_PRESETS.map(m => (
                  <button key={m} onClick={() => changeFocus(m)}
                    className="px-3.5 py-1.5 rounded-xl text-sm font-bold transition-all"
                    style={{ background: focusMin === m ? ACCENT : 'rgba(255,255,255,0.08)', color: focusMin === m ? '#fff' : 'rgba(255,255,255,0.45)', boxShadow: focusMin === m ? `0 0 20px ${ACCENT}50` : 'none' }}>
                    {m}p
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'idle' && (
            <p className="text-[11px] text-white/20 text-center leading-relaxed">
              💡 {focusMin}p tập trung → {breakMin}p nghỉ · Sau 4 pomo nghỉ dài 15–30p
            </p>
          )}
        </div>
      </div>

      {/* ── Task panel — fixed overlay responsive ───────────────────────── */}
      {showTasks && (
        <>
          <div className="fixed inset-0 z-30 sm:hidden" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowTasks(false)} />
          <div className={clsx(
            'fixed z-40 flex flex-col border border-white/10 shadow-2xl animate-in slide-in-from-right-6 duration-300',
            'bottom-0 right-0 left-0 sm:left-auto',
            'rounded-t-3xl sm:rounded-3xl',
            'h-[70vh] sm:h-[520px] sm:w-80 sm:top-1/2 sm:-translate-y-1/2 sm:bottom-auto sm:right-6'
          )}
            style={{ background: 'rgba(8,8,20,0.95)', backdropFilter: 'blur(24px)' }}>
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/20 sm:hidden" />
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 mt-2 sm:mt-0">
              <div>
                <h2 className="text-white font-bold flex items-center gap-2">
                  <ListTodo className="w-4 h-4" style={{ color: ACCENT }} />
                  Công việc hôm nay
                </h2>
                <p className="text-[11px] text-white/35 mt-0.5">{pendingTasks.length} việc cần làm</p>
              </div>
              <button onClick={() => setShowTasks(false)}
                className="w-8 h-8 rounded-xl border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/20 transition-all"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {pendingTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-white/30">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl" style={{ background: `${ACCENT}18` }}>🎯</div>
                  <p className="text-sm font-medium">Tất cả đã xong rồi!</p>
                  <p className="text-xs text-white/20">Thêm việc từ trang Dashboard</p>
                </div>
              ) : (
                pendingTasks.map(task => (
                  <label key={task.id}
                    className="flex items-start gap-3 p-3.5 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-white/8 group"
                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <input type="checkbox" checked={task.completed} onChange={() => toggleTask(task.id)}
                      className="mt-0.5 w-4 h-4 rounded cursor-pointer shrink-0"
                      style={{ accentColor: ACCENT }} />
                    <span className="text-sm text-white/75 group-hover:text-white/90 transition-colors leading-snug">{task.title}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Bottom bar ──────────────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-center gap-3 sm:gap-5 py-3 border-t border-white/5 px-4">
        <span className="text-[10px] text-white/20 truncate">{station.emoji} {station.name}</span>
        <span className="text-white/10">·</span>
        <span className="text-[10px] text-white/20">🔥 {pomoCount} pomodoro</span>
        <span className="text-white/10 hidden sm:block">·</span>
        <span className="text-[10px] text-white/20 hidden sm:block">Free Internet Radio</span>
      </div>
    </div>
  )
}

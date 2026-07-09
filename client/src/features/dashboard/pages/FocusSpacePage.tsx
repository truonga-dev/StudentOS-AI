import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, RotateCcw, SkipForward, Maximize2, Minimize2, ArrowLeft, Volume2, VolumeX, ListTodo } from 'lucide-react'
import { clsx } from 'clsx'
import { useNavigate } from 'react-router-dom'
import { useSubjects } from '@/hooks/useSubjects'
import { useStudySessions } from '@/hooks/useStudySessions'
import { useProfile } from '@/hooks/useProfile'
import { useTasks } from '@/hooks/useTasks'
import toast from 'react-hot-toast'

type TimerMode = 'idle' | 'focus' | 'paused' | 'break' | 'done'

const FOCUS_MINUTES = 25
const BREAK_MINUTES = 5

export function FocusSpacePage() {
  const navigate = useNavigate()
  const { subjects } = useSubjects()
  const { logSession } = useStudySessions()
  const { addPoints, addXp } = useProfile()
  const { tasks, toggle: toggleTask } = useTasks()

  const [mode, setMode] = useState<TimerMode>('idle')
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_MINUTES * 60)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [sessionStarted, setSessionStarted] = useState<Date | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [pomoCount, setPomoCount] = useState(0)
  const [showTasks, setShowTasks] = useState(false)
  const [muteLofi, setMuteLofi] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalSeconds = mode === 'break' ? BREAK_MINUTES * 60 : FOCUS_MINUTES * 60
  const progress = secondsLeft / totalSeconds
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')

  const playDing = useCallback(() => {
    try {
      const ctx = new window.AudioContext()
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
    } catch {}
  }, [])

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

  useEffect(() => {
    if (secondsLeft === 0 && (mode === 'focus' || mode === 'break')) {
      playDing()
      if (mode === 'focus') {
        setMode('done')
        setPomoCount(p => p + 1)
        toast.success('Hết giờ! Bạn đã hoàn thành 1 Pomodoro 🎉', { duration: 5000, position: 'top-center' })
        
        if (selectedSubjectId && sessionStarted) {
          logSession({
            subject_id: selectedSubjectId,
            duration_minutes: FOCUS_MINUTES,
            started_at: sessionStarted.toISOString(),
            ended_at: new Date().toISOString()
          })
          addPoints(FOCUS_MINUTES)
          addXp(FOCUS_MINUTES * 2)
        }
      } else if (mode === 'break') {
        setMode('idle')
        setSecondsLeft(FOCUS_MINUTES * 60)
        toast('Hết giờ nghỉ! Trở lại làm việc thôi.', { icon: '💪', position: 'top-center' })
      }
    }
  }, [secondsLeft, mode, playDing, selectedSubjectId, sessionStarted, logSession, addPoints, addXp])

  const startFocus = () => {
    if (!selectedSubjectId && mode === 'idle') {
      toast.error('Vui lòng chọn môn học trước khi bắt đầu')
      return
    }
    if (mode === 'idle') setSessionStarted(new Date())
    setMode('focus')
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(tick, 1000)
  }

  const pauseTimer = () => {
    setMode('paused')
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  const startBreak = () => {
    setMode('break')
    setSecondsLeft(BREAK_MINUTES * 60)
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(tick, 1000)
  }

  const resetTimer = () => {
    setMode('idle')
    setSecondsLeft(FOCUS_MINUTES * 60)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  // Lofi Youtube ID: jfKfPfyJRdk (Lofi Girl)
  const lofiId = "jfKfPfyJRdk"

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in fade-in duration-500">
      {/* Background YouTube Iframe */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-60">
        <iframe 
          className="w-full h-full scale-[1.2]" 
          src={`https://www.youtube.com/embed/${lofiId}?autoplay=1&mute=${muteLofi ? '1' : '0'}&controls=0&showinfo=0&rel=0&loop=1&playlist=${lofiId}&vq=hd1080`} 
          allow="autoplay; encrypted-media" 
          frameBorder="0" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-6">
        <button onClick={() => navigate('/dashboard')} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-4">
          <button onClick={() => setMuteLofi(!muteLofi)} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all">
            {muteLofi ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>
          <button onClick={() => setShowTasks(!showTasks)} className={clsx("w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center text-white transition-all", showTasks ? "bg-primary-500" : "bg-white/10 hover:bg-white/20")}>
            <ListTodo className="w-6 h-6" />
          </button>
          <button onClick={toggleFullscreen} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all">
            {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-6 gap-12">
        {/* Timer UI */}
        <div className="flex flex-col items-center max-w-md w-full bg-black/40 backdrop-blur-xl border border-white/10 p-10 rounded-[40px] shadow-2xl">
          <h1 className="text-white/80 font-medium text-xl mb-6">
            {mode === 'idle' ? 'Chuẩn bị tập trung' :
             mode === 'focus' ? 'Đang tập trung...' :
             mode === 'paused' ? 'Đã tạm dừng' :
             mode === 'break' ? 'Thời gian nghỉ ngơi' : 'Hoàn thành Pomodoro!'}
          </h1>

          <div className="relative w-64 h-64 mb-8 flex items-center justify-center">
            {/* SVG Ring */}
            <svg width="256" height="256" viewBox="0 0 256 256" className="absolute inset-0">
              <circle cx="128" cy="128" r="120" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
              <circle
                cx="128" cy="128" r="120" fill="none"
                stroke={mode === 'break' ? '#22c55e' : mode === 'done' ? '#6B4EFF' : mode === 'paused' ? '#f59e0b' : '#6B4EFF'} 
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 120}
                strokeDashoffset={2 * Math.PI * 120 * (1 - progress)}
                transform="rotate(-90 128 128)"
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
              />
            </svg>
            <div className="text-7xl font-black text-white tracking-tighter tabular-nums drop-shadow-lg">
              {mm}:{ss}
            </div>
          </div>

          {(mode === 'idle' || mode === 'done') && (
            <select
              value={selectedSubjectId || ''}
              onChange={e => setSelectedSubjectId(e.target.value)}
              className="w-full mb-8 bg-white/10 border-white/20 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500 backdrop-blur-md appearance-none"
            >
              <option value="" className="text-black">-- Chọn môn học --</option>
              {subjects.map(s => <option key={s.id} value={s.id} className="text-black">{s.title}</option>)}
            </select>
          )}

          <div className="flex items-center gap-4">
            {(mode === 'idle' || mode === 'paused') && (
              <button onClick={startFocus} className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-xl">
                <Play className="w-8 h-8 ml-1" />
              </button>
            )}
            
            {mode === 'focus' && (
              <button onClick={pauseTimer} className="w-16 h-16 rounded-full bg-white/20 text-white flex items-center justify-center hover:scale-105 transition-transform backdrop-blur-md">
                <Pause className="w-8 h-8" />
              </button>
            )}

            {mode === 'done' && (
              <>
                <button onClick={startBreak} className="px-6 h-14 rounded-full bg-success-500 text-white font-bold hover:bg-success-600 transition-colors shadow-lg shadow-success-500/30">
                  Nghỉ 5 phút
                </button>
                <button onClick={resetTimer} className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors backdrop-blur-md">
                  <SkipForward className="w-6 h-6" />
                </button>
              </>
            )}

            {(mode === 'focus' || mode === 'paused' || mode === 'break') && (
              <button onClick={resetTimer} className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors backdrop-blur-md">
                <RotateCcw className="w-6 h-6" />
              </button>
            )}
          </div>

          <div className="mt-8 flex items-center gap-2 text-white/50 text-sm font-medium">
            🔥 Đã hoàn thành: <span className="text-white font-bold">{pomoCount} Pomodoro</span>
          </div>
        </div>

        {/* Tasks Panel */}
        {showTasks && (
          <div className="w-96 bg-black/40 backdrop-blur-xl border border-white/10 rounded-[40px] shadow-2xl h-[600px] flex flex-col overflow-hidden animate-in slide-in-from-right-8 duration-300">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-white font-bold text-xl flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-primary-400" /> Công việc hôm nay
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {tasks.filter(t => !t.completed).length === 0 ? (
                <div className="text-center text-white/50 mt-10">
                  <p>Không có công việc nào đang chờ!</p>
                </div>
              ) : (
                tasks.filter(t => !t.completed).map(task => (
                  <label key={task.id} className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors border border-white/5">
                    <input 
                      type="checkbox" 
                      className="mt-1 w-5 h-5 rounded-md border-white/20 bg-black/50 text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
                      checked={task.completed}
                      onChange={() => toggleTask(task.id)}
                    />
                    <span className="text-white/90 font-medium leading-tight">{task.title}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

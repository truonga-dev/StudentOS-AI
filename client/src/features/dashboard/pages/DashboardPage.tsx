import { useState, useEffect } from 'react'
import {
  BookOpen, CheckSquare, Clock, Target, Zap,
  Flame, ArrowRight, Check, Trash2, MoreHorizontal,
  Calendar, Sparkles, TrendingUp,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '@/hooks/useAuth'
import { useTasks } from '@/hooks/useTasks'
import { useSubjects } from '@/hooks/useSubjects'
import { useStudySessions } from '@/hooks/useStudySessions'
import { useCalendarEvents } from '@/hooks/useCalendarEvents'
import { useProfile } from '@/hooks/useProfile'
import { useNavigate } from 'react-router-dom'
import { HeroProfileCard } from '@/features/dashboard/components/HeroProfileCard'
import { StudyHoursChart } from '@/features/dashboard/components/StudyHoursChart'
import { StudyStreakCalendar } from '@/features/dashboard/components/StudyStreakCalendar'
import { TodayTimeline } from '@/features/dashboard/components/TodayTimeline'
import { SubjectProgressCard } from '@/features/dashboard/components/SubjectProgressCard'
import { MindMapWidget } from '@/features/dashboard/components/MindMapWidget'
import { PomodoroTimer } from '@/features/dashboard/components/PomodoroTimer'
import { AIWeeklyReport } from '@/features/dashboard/components/AIWeeklyReport'
import { OnboardingTour } from '@/components/layout/OnboardingTour'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PRIORITY_COLORS: Record<string, string> = {
  high: 'badge-danger',
  medium: 'badge-warning',
  low: 'badge-success',
}
const PRIORITY_LABELS: Record<string, string> = {
  high: 'Khẩn', medium: 'Bình thường', low: 'Thấp',
}
const DAILY_QUOTES = [
  'Mỗi bước nhỏ hôm nay là nền tảng cho thành công ngày mai. 🚀',
  'Sự nhất quán mạnh hơn tài năng. Học đều mỗi ngày nhé! 💪',
  'Không cần hoàn hảo ngay từ đầu, chỉ cần bắt đầu. ✨',
  'Bộ não của bạn là cơ bắp — luyện tập mỗi ngày nó sẽ mạnh hơn. 🧠',
  'Học tập không phải đích đến, đó là cuộc hành trình. 🌟',
  'Hãy để sự tò mò dẫn lối, và sự kiên trì sẽ giúp bạn đến đích. 🚀',
  'Mỗi khi bạn cảm thấy muốn bỏ cuộc, hãy nhớ lý do bạn bắt đầu. 🎯',
  'Hôm nay là một trang giấy trắng, bạn sẽ viết nên câu chuyện gì? 📖',
  'Thất bại là bài học quý giá nhất trên con đường dẫn đến thành công. 📚',
  'Đầu tư vào kiến thức là khoản đầu tư sinh lời nhất. 💡',
  'Hãy biến mỗi ngày học tập thành một cuộc phiêu lưu thú vị! 🗺️',
  'Sự thông thái đến từ việc học hỏi không ngừng. 🎓',
  'Mỗi cuốn sách mở ra một thế giới mới. 🏰',
]

function getQuote() {
  const day = new Date().getDay()
  return DAILY_QUOTES[day % DAILY_QUOTES.length]
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
  bg: string
  sub?: string
  onClick?: () => void
}
function StatCard({ label, value, icon: Icon, color, bg, sub, onClick }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className={clsx('card p-4 flex items-center gap-3.5 hover:shadow-card-hover transition-all text-left w-full',
        onClick && 'cursor-pointer hover:scale-[1.01]')}
    >
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', bg)}>
        <Icon className={clsx('w-5 h-5', color)} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-black text-surface-900 dark:text-white leading-tight">{value}</p>
        <p className="text-xs text-surface-500 dark:text-surface-400 truncate">{label}</p>
        {sub && <p className="text-[10px] text-surface-400 truncate">{sub}</p>}
      </div>
    </button>
  )
}

// ─── Quick Task Item ───────────────────────────────────────────────────────────
function TaskItem({
  task,
  isOpen,
  onToggleMenu,
  onComplete,
  onDelete,
}: {
  task: any
  isOpen: boolean
  onToggleMenu: () => void
  onComplete: () => void
  onDelete: () => void
}) {
  return (
    <div className="relative p-3 rounded-xl bg-surface-50 dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-700/70 transition-colors group">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-sm font-medium text-surface-800 dark:text-surface-200 leading-snug flex-1">
          {task.title}
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={clsx('badge', PRIORITY_COLORS[task.priority])}>
            {PRIORITY_LABELS[task.priority]}
          </span>
          <button
            onClick={e => { e.stopPropagation(); onToggleMenu() }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-md transition-all"
          >
            <MoreHorizontal className="w-4 h-4 text-surface-500" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-surface-400">
        {task.subjects?.title && <span className="badge-neutral">{task.subjects.title}</span>}
        {task.due_date && (
          <span>{new Date(task.due_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</span>
        )}
      </div>
      {isOpen && (
        <div className="absolute right-2 top-10 z-10 w-36 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 py-1 overflow-hidden">
          <button onClick={onComplete}
            className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-surface-50 dark:hover:bg-surface-700 text-success-600">
            <Check className="w-4 h-4" /> Hoàn thành
          </button>
          <button onClick={onDelete}
            className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-surface-50 dark:hover:bg-surface-700 text-danger-500">
            <Trash2 className="w-4 h-4" /> Xóa bỏ
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { subjects } = useSubjects()
  const { tasks, total: totalTasks, toggle, removeTask } = useTasks()
  const { weeklyData, todayTimeFormatted, totalWeeklyHours, refresh: refreshSessions } = useStudySessions()
  const { profile, addXp, updateProfile } = useProfile()
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [showTour, setShowTour] = useState(false)

  // Auto-show tour for first-time users once profile has loaded
  useEffect(() => {
    if (profile && profile.has_completed_onboarding === false) {
      // Small delay so dashboard finishes rendering before tour starts
      const t = setTimeout(() => setShowTour(true), 600)
      return () => clearTimeout(t)
    }
  }, [profile])

  const handleTourComplete = async () => {
    setShowTour(false)
    try {
      await addXp(50)
      await updateProfile({ has_completed_onboarding: true })
    } catch (e) {
      console.error('Tour complete error:', e)
    }
  }

  const handleTourSkip = async () => {
    setShowTour(false)
    try {
      await updateProfile({ has_completed_onboarding: true })
    } catch (e) {
      console.error('Tour skip error:', e)
    }
  }

  const today = new Date()
  const { events } = useCalendarEvents(today.getFullYear(), today.getMonth())
  const todayEvents = events.filter(e => {
    const d = new Date(e.start_time)
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'bạn'
  const pendingCount = tasks.filter(t => !t.completed).length
  const upcomingTasks = tasks.filter(t => !t.completed && t.due_date).slice(0, 4)

  const hour = today.getHours()
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Xin chào' : 'Chào buổi tối'

  // Streak: count consecutive days with sessions (simplified from weeklyData)
  const streak = weeklyData.filter(d => d.hours > 0).length

  // ── Stat Cards data ──────────────────────────────────────────────────────
  const stats: StatCardProps[] = [
    {
      label: 'Môn học', value: subjects.length, icon: BookOpen,
      color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10',
      onClick: () => navigate('/subjects'),
    },
    {
      label: 'Tổng công việc', value: totalTasks, icon: CheckSquare,
      color: 'text-accent-500', bg: 'bg-accent-50 dark:bg-accent-500/10',
      sub: `${pendingCount} chưa xong`,
      onClick: () => navigate('/tasks'),
    },
    {
      label: 'Chưa hoàn thành', value: pendingCount, icon: Target,
      color: 'text-warning-500', bg: 'bg-warning-50 dark:bg-warning-500/10',
      onClick: () => navigate('/tasks'),
    },
    {
      label: 'Học hôm nay', value: todayTimeFormatted || '0m', icon: Clock,
      color: 'text-success-500', bg: 'bg-success-50 dark:bg-success-500/10',
      sub: `Tuần này: ${totalWeeklyHours}h`,
    },
    {
      label: 'Streak tuần này', value: `${streak}🔥`, icon: Flame,
      color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10',
      sub: 'ngày có học',
    },
    {
      label: 'Level', value: `Lv ${profile?.level ?? 1}`, icon: Zap,
      color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10',
      sub: `${(profile?.xp ?? 0).toLocaleString()} XP`,
      onClick: () => { },
    },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-slide-up pb-8">

      {/* ── HERO BANNER ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl p-6 border border-primary-100 dark:border-primary-900/40"
        style={{ background: 'linear-gradient(135deg, #6B4EFF08 0%, #06b6d408 50%, #f59e0b05 100%)' }}>
        {/* Gradient orb */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-10 dark:opacity-5 blur-3xl bg-primary-500 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Left: greeting */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-primary-500 uppercase tracking-widest">
                {today.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-surface-900 dark:text-white mb-2">
              {greeting}, <span className="bg-gradient-brand bg-clip-text text-transparent">{displayName}</span>!
            </h2>
            <p className="text-sm text-surface-500 dark:text-surface-400 italic mb-4 max-w-md">
              "{getQuote()}"
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => navigate('/focus')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-brand text-white text-sm font-bold shadow-glow-sm hover:shadow-glow hover:opacity-90 transition-all duration-150">
                <Zap className="w-4 h-4" /> Bắt đầu học
              </button>
              <button onClick={() => navigate('/tasks')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-sm font-semibold text-surface-700 dark:text-surface-300 hover:border-primary-300 dark:hover:border-primary-700 transition-all">
                <CheckSquare className="w-4 h-4 text-primary-500" />
                {pendingCount} việc hôm nay
              </button>
              <button onClick={() => navigate('/calendar')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-sm font-semibold text-surface-700 dark:text-surface-300 hover:border-primary-300 dark:hover:border-primary-700 transition-all">
                <Calendar className="w-4 h-4 text-primary-500" />
                {todayEvents.length} sự kiện
              </button>
            </div>
          </div>

          {/* Right: profile card */}
          <div id="hero-profile-card" className="w-full md:w-80 shrink-0">
            <HeroProfileCard
              level={profile?.level ?? 1}
              xp={profile?.xp ?? 0}
              rank={profile?.rank_tier ?? 'Bronze'}
              points={profile?.points ?? 0}
              displayName={displayName}
              streak={streak}
            />
          </div>
        </div>
      </div>

      {/* ── STAT CARDS ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* ── MAIN BENTO GRID ROW 1: Chart + Streak ───────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div id="study-hours-chart" className="xl:col-span-3">
          <StudyHoursChart weeklyData={weeklyData} totalWeeklyHours={totalWeeklyHours} />
        </div>
        <div className="xl:col-span-2">
          <StudyStreakCalendar />
        </div>
      </div>

      {/* ── BENTO ROW 2: Timeline + Subjects + Pomodoro ─────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div id="today-timeline-card">
          <TodayTimeline events={todayEvents} />
        </div>
        <SubjectProgressCard subjects={subjects} tasks={tasks} />
        <div id="pomodoro-timer">
          <PomodoroTimer onSessionLogged={refreshSessions} />
        </div>
      </div>

      {/* ── BENTO ROW 3: Mind Map + Tasks + AI ──────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* Mind Map — wide */}
        <div className="xl:col-span-3">
          <MindMapWidget subjects={subjects} tasks={tasks} userName={displayName} />
        </div>

        {/* Right column: Tasks + AI */}
        <div className="xl:col-span-2 space-y-6">

          {/* Upcoming tasks */}
          <div id="upcoming-tasks-card" className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="section-title text-base">Công việc sắp tới</h3>
                <p className="section-subtitle text-xs">{upcomingTasks.length} task có deadline</p>
              </div>
              <button onClick={() => navigate('/tasks')}
                className="w-8 h-8 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center justify-center transition-colors">
                <ArrowRight className="w-4 h-4 text-surface-400" />
              </button>
            </div>
            <div className="space-y-2">
              {upcomingTasks.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-3xl mb-2">🎉</div>
                  <p className="text-sm text-surface-400">Không có công việc sắp tới!</p>
                </div>
              ) : (
                upcomingTasks.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    isOpen={openTaskId === task.id}
                    onToggleMenu={() => setOpenTaskId(openTaskId === task.id ? null : task.id)}
                    onComplete={() => { toggle(task.id); setOpenTaskId(null) }}
                    onDelete={() => { removeTask(task.id); setOpenTaskId(null) }}
                  />
                ))
              )}
            </div>
            {pendingCount > 4 && (
              <button onClick={() => navigate('/tasks')}
                className="w-full mt-3 py-2 rounded-xl text-xs text-primary-500 font-semibold hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors">
                Xem tất cả {pendingCount} công việc →
              </button>
            )}
          </div>

          {/* AI Weekly Report */}
          <div id="ai-weekly-report">
            <AIWeeklyReport />
          </div>
        </div>
      </div>

      {/* ── ONBOARDING TOUR ──────────────────────────────────────────────── */}
      {showTour && (
        <OnboardingTour
          onComplete={handleTourComplete}
          onSkip={handleTourSkip}
        />
      )}
    </div>
  )
}

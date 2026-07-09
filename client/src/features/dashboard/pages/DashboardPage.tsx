import { useState } from 'react'
import {
  BookOpen, CheckSquare, Clock, TrendingUp, Calendar,
  Target, Zap, ArrowRight, MoreHorizontal, Check, Trash2,
} from 'lucide-react'
import { clsx } from 'clsx'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { useAuth } from '@/hooks/useAuth'
import { useTasks } from '@/hooks/useTasks'
import { useSubjects } from '@/hooks/useSubjects'
import { useStudySessions } from '@/hooks/useStudySessions'
import { useCalendarEvents } from '@/hooks/useCalendarEvents'
import { useProfile } from '@/hooks/useProfile'
import { PomodoroTimer } from '@/features/dashboard/components/PomodoroTimer'
import { RankBadge } from '@/features/dashboard/components/RankBadge'
import { AIWeeklyReport } from '@/features/dashboard/components/AIWeeklyReport'
import { useNavigate } from 'react-router-dom'

const priorityColors: Record<string, string> = {
  high:   'badge-danger',
  medium: 'badge-warning',
  low:    'badge-success',
}
const priorityLabels: Record<string, string> = {
  high: 'Khẩn', medium: 'Bình thường', low: 'Thấp',
}

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

// ─── Component ────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { user } = useAuth()
  const { subjects } = useSubjects()
  const { tasks, total: totalTasks, toggle, removeTask } = useTasks()
  const { weeklyData, todayTimeFormatted, totalWeeklyHours, refresh: refreshSessions } = useStudySessions()
  const { profile } = useProfile()
  
  const navigate = useNavigate()
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  
  const scrollToPomodoro = () => {
    const element = document.getElementById('pomodoro-timer')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Lịch hôm nay
  const today = new Date()
  const { events } = useCalendarEvents(today.getFullYear(), today.getMonth())
  const todayEvents = events.filter(e => {
    const d = new Date(e.start_time)
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'bạn'
  const upcomingTasks = tasks.filter(t => !t.completed && t.due_date).slice(0, 3)
  const pendingCount = tasks.filter(t => !t.completed).length

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Xin chào' : 'Chào buổi tối'

  const dynamicStats = [
    { label: 'Môn học', value: String(subjects.length), icon: BookOpen, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
    { label: 'Công việc', value: String(totalTasks), icon: CheckSquare, color: 'text-accent-500', bg: 'bg-accent-50 dark:bg-accent-500/10' },
    { label: 'Chưa xong', value: String(pendingCount), icon: Target, color: 'text-warning-500', bg: 'bg-warning-50 dark:bg-warning-500/10' },
    { label: 'Hôm nay', value: todayTimeFormatted || '0m', icon: Clock, color: 'text-success-500', bg: 'bg-success-50 dark:bg-success-500/10', wide: true },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-slide-up">

      {/* ── Greeting ── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-surface-900 dark:text-white">
            {greeting}, {displayName}! 👋
          </h2>
          <p className="text-surface-500 dark:text-surface-400 text-sm mt-1 mb-4">
            Bạn có {pendingCount} công việc chưa hoàn thành.
          </p>
          <button 
            onClick={scrollToPomodoro}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-brand text-white text-sm font-semibold shadow-glow-sm hover:shadow-glow hover:opacity-90 transition-all duration-150">
            <Zap className="w-4 h-4" />
            Bắt đầu học
          </button>
        </div>
        
        {/* Rank Badge */}
        <div className="w-full md:w-80 shrink-0">
          <RankBadge 
            level={profile?.level ?? 1} 
            xp={profile?.xp ?? 0} 
            rank={profile?.rank_tier ?? 'Bronze'} 
            points={profile?.points ?? 0} 
          />
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {dynamicStats.map(({ label, value, icon: Icon, color, bg, wide }) => (
          <div key={label} className={clsx('card p-4 flex items-center gap-4', wide && 'col-span-2 lg:col-span-1')}>
            <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', bg)}>
              <Icon className={clsx('w-5 h-5', color)} strokeWidth={2} />
            </div>
            <div>
              <p className="text-xl font-bold text-surface-900 dark:text-white leading-none">{value}</p>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Left: Weekly chart + Subjects */}
        <div className="xl:col-span-2 space-y-6">

          {/* Weekly study chart — real data */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="section-title text-base">Thống kê học tập tuần này</h3>
                <p className="section-subtitle text-xs">Tổng: {totalWeeklyHours}h</p>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-success-500" />
                <span className="text-success-600 dark:text-success-400 text-xs font-semibold">
                  {weeklyData.length > 0 ? 'Dữ liệu thực' : 'Chưa có data'}
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 12, fontSize: 13 }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#6B4EFF' }}
                  formatter={(v: number) => [`${v}h`, 'Học']}
                />
                <Bar dataKey="hours" fill="#6B4EFF" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Subject progress */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title text-base">Môn học</h3>
              <button className="text-xs text-primary-500 hover:text-primary-600 font-semibold flex items-center gap-1">
                Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {subjects.length === 0 ? (
              <p className="text-sm text-surface-400 text-center py-6">Chưa có môn học nào. Thêm môn học để bắt đầu!</p>
            ) : (
              <div className="space-y-4">
                {subjects.map((subject) => (
                  <div key={subject.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: subject.color }} />
                        <span className="text-sm font-medium text-surface-800 dark:text-surface-200">
                          {subject.title}
                        </span>
                        <span className="badge-neutral text-2xs">{subject.credits} TC</span>
                      </div>
                      <span className="text-xs font-semibold text-surface-600 dark:text-surface-400">
                        Học kỳ {subject.semester}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Pomodoro + Upcoming tasks */}
        <div className="space-y-6">

          {/* Pomodoro Timer — real feature */}
          <div id="pomodoro-timer">
            <PomodoroTimer onSessionLogged={refreshSessions} />
          </div>

          <AIWeeklyReport />

          {/* Upcoming tasks */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title text-base">Công việc sắp tới</h3>
              <button onClick={() => navigate('/tasks')} className="w-8 h-8 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center justify-center transition-colors">
                <ArrowRight className="w-4 h-4 text-surface-400" />
              </button>
            </div>
            <div className="space-y-2.5">
              {upcomingTasks.length === 0 ? (
                <p className="text-sm text-surface-400 text-center py-4">Không có công việc sắp tới 🎉</p>
              ) : upcomingTasks.map((task) => (
                <div key={task.id}
                  className="relative p-3 rounded-xl bg-surface-50 dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-700/70 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-sm font-medium text-surface-800 dark:text-surface-200 leading-snug">{task.title}</p>
                    <div className="flex items-center gap-2">
                      <span className={clsx('badge shrink-0', priorityColors[task.priority])}>
                        {priorityLabels[task.priority]}
                      </span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenTaskId(openTaskId === task.id ? null : task.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-md transition-all"
                      >
                        <MoreHorizontal className="w-4 h-4 text-surface-500" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.subjects && <span className="badge-neutral">{task.subjects.title}</span>}
                    <span className="text-xs text-surface-400">{formatDate(task.due_date)}</span>
                  </div>

                  {openTaskId === task.id && (
                    <div className="absolute right-2 top-10 z-10 w-36 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 py-1 overflow-hidden">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggle(task.id); setOpenTaskId(null) }}
                        className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-surface-50 dark:hover:bg-surface-700 text-success-600"
                      >
                        <Check className="w-4 h-4" /> Hoàn thành
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeTask(task.id); setOpenTaskId(null) }}
                        className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-surface-50 dark:hover:bg-surface-700 text-danger-500"
                      >
                        <Trash2 className="w-4 h-4" /> Xóa bỏ
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Today's calendar */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title text-base">Lịch hôm nay</h3>
              <button 
                onClick={() => navigate('/calendar')}
                className="w-8 h-8 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center justify-center transition-colors"
              >
                <Calendar className="w-4 h-4 text-surface-400" />
              </button>
            </div>
            
            <div className="space-y-3 mb-4">
              {todayEvents.length === 0 ? (
                <p className="text-sm text-surface-400 text-center py-4">Không có lịch học hôm nay 🏝️</p>
              ) : (
                todayEvents.slice(0, 3).map(event => (
                  <div key={event.id} className="flex gap-3 items-start p-2 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
                    <div className="w-1 rounded-full shrink-0 self-stretch" style={{ backgroundColor: event.color || '#6366f1' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">{event.title}</p>
                      <p className="text-xs text-surface-500 mt-0.5">
                        {new Date(event.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        {event.room ? ` • ${event.room}` : ''}
                      </p>
                    </div>
                  </div>
                ))
              )}
              {todayEvents.length > 3 && (
                <button onClick={() => navigate('/calendar')} className="text-xs text-primary-500 hover:text-primary-600 font-medium w-full text-center mt-2">
                  Xem thêm {todayEvents.length - 3} sự kiện...
                </button>
              )}
            </div>

            <button 
              onClick={() => navigate('/calendar')}
              className="w-full py-2 rounded-xl border-2 border-dashed border-surface-200 dark:border-surface-700 text-sm text-surface-400 hover:border-primary-400 hover:text-primary-500 transition-colors duration-150"
            >
              + Quản lý lịch học
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

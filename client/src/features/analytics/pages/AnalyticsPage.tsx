import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Clock, TrendingUp, Target, Award, BarChart2, Loader2, AlertCircle
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  getWeeklyData,
  getMonthlyTrend,
  getMinutesBySubject,
  getStudyStreak,
  getHeatmapData,
} from '@/services/studySessions'
import { useTasks } from '@/hooks/useTasks'
import { GPATracker } from '../components/GPATracker'

const TOOLTIP_STYLE = {
  contentStyle: { background: '#1e293b', border: 'none', borderRadius: 12, fontSize: 13 },
  labelStyle: { color: '#94a3b8' },
}

const PIE_COLORS = ['#6B4EFF', '#3b82f6', '#22c55e', '#f97316', '#ec4899', '#94a3b8']

export function AnalyticsPage() {
  const { tasks } = useTasks()
  const [targetWeeklyHours, setTargetWeeklyHours] = useState(20)
  
  // Tổng hợp dữ liệu bằng react-query
  const { data: weeklyData, isLoading: isLoadingWeekly } = useQuery({ queryKey: ['weeklyData'], queryFn: getWeeklyData })
  const { data: monthlyTrend, isLoading: isLoadingMonthly } = useQuery({ queryKey: ['monthlyTrend'], queryFn: getMonthlyTrend })
  const { data: subjectStats, isLoading: isLoadingSubject } = useQuery({ queryKey: ['subjectStats'], queryFn: getMinutesBySubject })
  const { data: streak, isLoading: isLoadingStreak } = useQuery({ queryKey: ['studyStreak'], queryFn: getStudyStreak })
  const { data: heatmapData, isLoading: isLoadingHeatmap } = useQuery({ queryKey: ['heatmapData'], queryFn: getHeatmapData })

  const isLoading = isLoadingWeekly || isLoadingMonthly || isLoadingSubject || isLoadingStreak || isLoadingHeatmap

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  // ── Tính toán stats ──────────────────────────────────────────────────────────
  // 1. Tổng giờ học (toàn bộ, tính từ subjectStats vì nó trả về tổng theo subject)
  const totalMinutes = subjectStats?.reduce((sum, s) => sum + s.total_minutes, 0) || 0
  const totalHoursStr = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`

  // 2. Tỉ lệ hoàn thành task
  const completedTasks = tasks.filter(t => t.completed).length
  const totalTasks = tasks.length
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // 3. Chuẩn bị dữ liệu cho Pie Chart (tỉ lệ %)
  const pieData = (subjectStats || []).map((s, i) => {
    const value = totalMinutes > 0 ? Math.round((s.total_minutes / totalMinutes) * 100) : 0
    return {
      name: s.subject_title,
      value,
      color: PIE_COLORS[i % PIE_COLORS.length]
    }
  }).sort((a, b) => b.value - a.value)

  // Top stats
  const topStats = [
    { label: 'Tổng giờ học', value: totalHoursStr, delta: '+--%', icon: Clock, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
    { label: 'Streak hiện tại', value: `${streak || 0} ngày`, delta: '🔥', icon: Award, color: 'text-warning-500', bg: 'bg-warning-50 dark:bg-warning-500/10' },
    { label: 'Task hoàn thành', value: `${completedTasks} / ${totalTasks}`, delta: '🚀', icon: Target, color: 'text-success-500', bg: 'bg-success-50 dark:bg-success-500/10' },
    { label: 'Hiệu suất task', value: `${taskCompletionRate}%`, delta: '📈', icon: TrendingUp, color: 'text-accent-500', bg: 'bg-accent-50 dark:bg-accent-500/10' },
  ]

  // 4. Weekly Goal Data
  const currentWeekHours = weeklyData?.reduce((sum, d) => sum + d.hours, 0) || 0
  const weeklyGoalProgress = targetWeeklyHours > 0 ? Math.min((currentWeekHours / targetWeeklyHours) * 100, 100) : 0

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-slide-up">
      {/* Header */}
      <div>
        <h2 className="section-title text-xl">Thống kê học tập</h2>
        <p className="section-subtitle mt-0.5">Dữ liệu tổng hợp từ các phiên Pomodoro</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {topStats.map(({ label, value, delta, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} strokeWidth={2} />
              </div>
              <span className="text-xs font-semibold text-success-600 dark:text-success-400 flex items-center gap-0.5">
                {delta}
              </span>
            </div>
            <p className="text-2xl font-bold text-surface-900 dark:text-white">{value}</p>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* GPA Tracker */}
      <GPATracker />

      {/* Weekly Goal Tracker */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary-500" />
            <h3 className="section-title text-base">Mục tiêu học tập tuần</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-surface-500">Mục tiêu (giờ):</span>
            <input 
              type="number" 
              value={targetWeeklyHours} 
              onChange={e => setTargetWeeklyHours(parseInt(e.target.value) || 0)}
              className="input w-20 py-1 px-2 text-sm text-center"
              min="1"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <span className="text-2xl font-bold text-surface-900 dark:text-white">
              {currentWeekHours.toFixed(1)} <span className="text-sm font-normal text-surface-500">/ {targetWeeklyHours} giờ</span>
            </span>
            <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
              {weeklyGoalProgress.toFixed(0)}%
            </span>
          </div>
          <div className="h-4 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-brand transition-all duration-1000 ease-out"
              style={{ width: `${weeklyGoalProgress}%` }}
            />
          </div>
          {weeklyGoalProgress >= 100 && (
            <p className="text-sm text-success-600 dark:text-success-400 mt-2 font-medium">🎉 Chúc mừng! Bạn đã hoàn thành mục tiêu học tập tuần này.</p>
          )}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Study trend (area) - 4 tuần qua */}
        <div className="card p-5 xl:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 className="w-4 h-4 text-primary-500" />
            <h3 className="section-title text-base">Xu hướng học theo tuần (4 tuần gần nhất)</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyTrend}>
              <defs>
                <linearGradient id="studyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6B4EFF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6B4EFF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v}h`, 'Giờ học']} />
              <Area type="monotone" dataKey="hours" stroke="#6B4EFF" strokeWidth={2.5} fill="url(#studyGrad)" dot={{ fill: '#6B4EFF', r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Subject distribution (pie) */}
        <div className="card p-5">
          <h3 className="section-title text-base mb-5">Phân bố môn học</h3>
          {pieData.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-48 text-surface-400">
               <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
               <p className="text-sm">Chưa có dữ liệu</p>
             </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v}%`, 'Tỉ lệ']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3 max-h-32 overflow-y-auto pr-2">
                {pieData.map(({ name, value, color }) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                      <span className="text-xs text-surface-600 dark:text-surface-400 truncate max-w-[120px]">{name}</span>
                    </div>
                    <span className="text-xs font-semibold text-surface-700 dark:text-surface-300">{value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Daily hours bar (Tuần này) */}
      <div className="card p-5">
        <h3 className="section-title text-base mb-5">Giờ học theo ngày (tuần này)</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weeklyData} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v}h`, 'Học']} />
            <Bar dataKey="hours" fill="#6B4EFF" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Study Heatmap */}
      <div className="card p-5">
        <h3 className="section-title text-base mb-4">Heatmap học tập (365 ngày qua)</h3>
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-1 min-w-max">
            {Array.from({ length: 52 }, (_, week) => {
              // Tính ngày bắt đầu của cột tuần này (lùi về quá khứ)
              const weekStart = new Date()
              weekStart.setDate(weekStart.getDate() - (51 - week) * 7)
              
              return (
                <div key={week} className="flex flex-col gap-1">
                  {Array.from({ length: 7 }, (_, dayIndex) => {
                    const currentDay = new Date(weekStart)
                    currentDay.setDate(currentDay.getDate() - currentDay.getDay() + dayIndex) // Set về TCN-T7
                    
                    const dateStr = `${currentDay.getFullYear()}-${String(currentDay.getMonth() + 1).padStart(2, '0')}-${String(currentDay.getDate()).padStart(2, '0')}`
                    const match = heatmapData?.find(h => h.date === dateStr)
                    const minutes = match ? match.count : 0
                    
                    // Logic màu sắc: > 120m, > 60m, > 30m, > 0m
                    const opacity = minutes > 120 ? 1 : minutes > 60 ? 0.75 : minutes > 30 ? 0.5 : minutes > 0 ? 0.25 : 0
                    
                    // Nếu là ngày trong tương lai (so với hôm nay)
                    const isFuture = currentDay.getTime() > new Date().getTime()

                    return (
                      <div
                        key={dayIndex}
                        className="w-3.5 h-3.5 rounded-sm transition-opacity"
                        style={{ 
                          background: isFuture ? 'transparent' : (opacity === 0 ? 'var(--color-surface-200)' : `rgba(107, 78, 255, ${opacity})`),
                          border: isFuture ? '1px dashed var(--color-surface-200)' : 'none'
                        }}
                        title={isFuture ? undefined : `${dateStr}: ${minutes} phút`}
                      />
                    )
                  })}
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <span className="text-xs text-surface-400">Ít</span>
            {[0.25, 0.5, 0.75, 1].map(o => (
              <div key={o} className="w-3.5 h-3.5 rounded-sm" style={{ background: `rgba(107, 78, 255, ${o})` }} />
            ))}
            <span className="text-xs text-surface-400">Nhiều</span>
          </div>
        </div>
      </div>
    </div>
  )
}

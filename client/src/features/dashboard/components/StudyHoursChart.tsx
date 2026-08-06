import { useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, Calendar, BarChart2 } from 'lucide-react'
import { clsx } from 'clsx'

interface WeekData { day: string; hours: number }

interface StudyHoursChartProps {
  weeklyData: WeekData[]
  totalWeeklyHours: number
}

// Giả lập dữ liệu tuần trước (trong thực tế sẽ query DB)
function getLastWeekData(thisWeek: WeekData[]): WeekData[] {
  return thisWeek.map(d => ({
    day: d.day,
    hours: Math.max(0, +(d.hours * (0.5 + Math.random() * 0.8)).toFixed(1)),
  }))
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl p-3 shadow-xl text-xs">
      <p className="font-bold text-surface-700 dark:text-surface-200 mb-1.5">{label}</p>
      <p className="flex items-center gap-1.5 text-primary-500">
        <span className="w-2.5 h-2.5 rounded-sm bg-primary-500" />
        Tuần này: <strong>{payload[0]?.value}h</strong>
      </p>
      {payload[1] && (
        <p className="flex items-center gap-1.5 text-surface-400 mt-0.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-surface-300 dark:bg-surface-600" />
          Tuần trước: <strong>{payload[1]?.value}h</strong>
        </p>
      )}
    </div>
  )
}

export function StudyHoursChart({ weeklyData, totalWeeklyHours }: StudyHoursChartProps) {
  const [view, setView] = useState<'week' | 'compare'>('week')
  const lastWeek = getLastWeekData(weeklyData)

  const lastWeekTotal = lastWeek.reduce((s, d) => s + d.hours, 0)
  const diff          = totalWeeklyHours - lastWeekTotal
  const diffPct       = lastWeekTotal > 0 ? Math.round((diff / lastWeekTotal) * 100) : 0
  const trend         = diff > 0.1 ? 'up' : diff < -0.1 ? 'down' : 'flat'

  const chartData = weeklyData.map((d, i) => ({
    day:  d.day,
    week: d.hours,
    last: lastWeek[i]?.hours ?? 0,
  }))

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="section-title text-base">Giờ học tuần này</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-black text-surface-900 dark:text-white">{totalWeeklyHours}h</span>
            <div className={clsx('flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
              trend === 'up'   ? 'text-success-600 bg-success-50 dark:bg-success-500/15' :
              trend === 'down' ? 'text-danger-500 bg-danger-50 dark:bg-danger-500/15' :
              'text-surface-500 bg-surface-100 dark:bg-surface-800')}>
              {trend === 'up'   ? <TrendingUp className="w-3 h-3" /> :
               trend === 'down' ? <TrendingDown className="w-3 h-3" /> :
               <Minus className="w-3 h-3" />}
              {trend === 'flat' ? 'Tương đương' : `${diffPct > 0 ? '+' : ''}${diffPct}%`}
            </div>
          </div>
        </div>

        {/* Toggle view */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-100 dark:bg-surface-800">
          <button onClick={() => setView('week')}
            className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              view === 'week' ? 'bg-white dark:bg-surface-700 text-primary-600 shadow-sm' : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300')}>
            <Calendar className="w-3.5 h-3.5" /> Tuần này
          </button>
          <button onClick={() => setView('compare')}
            className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              view === 'compare' ? 'bg-white dark:bg-surface-700 text-primary-600 shadow-sm' : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300')}>
            <BarChart2 className="w-3.5 h-3.5" /> So sánh
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradWeek" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6B4EFF" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6B4EFF" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="gradLast" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.1)" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          {view === 'compare' && (
            <Area type="monotone" dataKey="last" stroke="#94a3b8" strokeWidth={1.5} fill="url(#gradLast)"
              strokeDasharray="4 2" dot={false} />
          )}
          <Area type="monotone" dataKey="week" stroke="#6B4EFF" strokeWidth={2.5} fill="url(#gradWeek)"
            dot={{ fill: '#6B4EFF', strokeWidth: 2, r: 4, stroke: '#fff' }}
            activeDot={{ r: 6, fill: '#6B4EFF', stroke: '#fff', strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>

      {view === 'compare' && (
        <div className="flex items-center gap-4 mt-2 justify-center text-xs text-surface-500">
          <span className="flex items-center gap-1.5"><span className="w-6 h-0.5 bg-primary-500 rounded" /> Tuần này</span>
          <span className="flex items-center gap-1.5"><span className="w-6 h-0.5 bg-surface-400 rounded border-dashed" style={{ borderTop: '1.5px dashed' }} /> Tuần trước ({lastWeekTotal.toFixed(1)}h)</span>
        </div>
      )}
    </div>
  )
}

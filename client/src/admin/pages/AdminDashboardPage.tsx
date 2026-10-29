import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts'
import {
  Users, UserPlus, Flag, MessagesSquare, BookOpen, CheckCircle2, Clock, Layers, FileText, Ban, ArrowUpRight, Trophy,
} from 'lucide-react'
import { adminApi } from '../services/adminApi'
import { Avatar, Badge, Card, PageHeader, Spinner, StatCard, fmtDate, fmtNum } from '../components/ui'

const PIE_COLORS = ['#a78bfa', '#f0abfc', '#67e8f9', '#fcd34d', '#6ee7b7', '#fda4af', '#93c5fd', '#c4b5fd']

const tooltipStyle = {
  contentStyle: { background: '#12121c', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 12 },
  labelStyle: { color: '#a1a1aa' },
}

export function AdminDashboardPage() {
  const [days, setDays] = useState(30)
  const { data: stats, isLoading } = useQuery({ queryKey: ['admin', 'stats'], queryFn: adminApi.stats })
  const { data: analytics } = useQuery({ queryKey: ['admin', 'analytics', days], queryFn: () => adminApi.analytics(days) })

  if (isLoading || !stats) return <Spinner />

  const completion = stats.academic.tasks ? Math.round((stats.academic.completed_tasks / stats.academic.tasks) * 100) : 0
  const series = (analytics?.series ?? []).map(p => ({ ...p, label: p.date.slice(5).split('-').reverse().join('/') }))

  return (
    <>
      <PageHeader title="Tổng quan hệ thống" subtitle="Số liệu thời gian thực trên toàn nền tảng Student OS AI." />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Tổng người dùng" value={fmtNum(stats.users.total)} icon={Users} accent="violet"
          hint={<span className="text-emerald-400">+{stats.users.new_7d} trong 7 ngày</span>} />
        <StatCard label="Phút học tập" value={fmtNum(stats.academic.study_minutes)} icon={Clock} accent="sky"
          hint={`${fmtNum(stats.academic.study_sessions)} phiên Pomodoro`} />
        <StatCard label="Tin nhắn cộng đồng" value={fmtNum(stats.community.messages)} icon={MessagesSquare} accent="fuchsia"
          hint={`${fmtNum(stats.community.messages_7d)} trong 7 ngày · ${stats.community.channels} kênh`} />
        <StatCard label="Báo cáo chờ xử lý" value={fmtNum(stats.community.pending_reports)} icon={Flag} accent="rose"
          hint={`${fmtNum(stats.community.total_reports)} báo cáo tổng`} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mt-4">
        {[
          { label: 'Môn học', v: stats.academic.subjects, icon: BookOpen },
          { label: 'Task', v: stats.academic.tasks, icon: CheckCircle2 },
          { label: 'Ghi chú', v: stats.academic.notes, icon: FileText },
          { label: 'Flashcard', v: stats.academic.flashcards, icon: Layers },
          { label: 'Admin', v: stats.users.admins, icon: UserPlus },
          { label: 'Bị khóa', v: stats.users.banned, icon: Ban },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.015] px-4 py-3">
            <s.icon className="w-4 h-4 text-zinc-500" />
            <div>
              <p className="text-lg font-semibold text-white tabular-nums leading-none">{fmtNum(s.v)}</p>
              <p className="text-[11px] text-zinc-500 mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-6">
        <Card title="Tăng trưởng & hoạt động" className="xl:col-span-2" action={
          <div className="flex rounded-lg bg-white/[0.03] p-0.5 text-xs">
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-2.5 py-1 rounded-md transition ${days === d ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'}`}>{d} ngày</button>
            ))}
          </div>
        }>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gSign" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a78bfa" stopOpacity={0.5} /><stop offset="100%" stopColor="#a78bfa" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gMsg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f0abfc" stopOpacity={0.35} /><stop offset="100%" stopColor="#f0abfc" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gTask" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#67e8f9" stopOpacity={0.3} /><stop offset="100%" stopColor="#67e8f9" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={20} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...tooltipStyle} />
                <Area type="monotone" dataKey="signups" name="Đăng ký mới" stroke="#a78bfa" strokeWidth={2} fill="url(#gSign)" />
                <Area type="monotone" dataKey="messages" name="Tin nhắn" stroke="#f0abfc" strokeWidth={2} fill="url(#gMsg)" />
                <Area type="monotone" dataKey="tasks" name="Task mới" stroke="#67e8f9" strokeWidth={2} fill="url(#gTask)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Phân bố hạng người dùng">
          <div className="h-72">
            {analytics?.rank_distribution?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics.rank_distribution} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3} stroke="none">
                    {analytics.rank_distribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : <Spinner />}
          </div>
          <div className="flex flex-wrap gap-2 -mt-2">
            {analytics?.rank_distribution.map((r, i) => (
              <span key={r.name} className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400">
                <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />{r.name} ({r.value})
              </span>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
        <Card title="Phút học theo ngày">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ left: -20, right: 4 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={16} />
                <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="study_minutes" name="Phút học" fill="#818cf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1.5"><span className="text-zinc-400">Tỉ lệ hoàn thành task</span><span className="text-white font-medium">{completion}%</span></div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: `${completion}%` }} /></div>
          </div>
        </Card>

        <Card title="Người dùng mới" action={<Link to="/admin/users" className="text-xs text-violet-300 hover:text-violet-200 inline-flex items-center gap-1">Xem tất cả <ArrowUpRight className="w-3 h-3" /></Link>}>
          <ul className="space-y-3">
            {stats.recent_users.map(u => (
              <li key={u.id} className="flex items-center gap-3">
                <Avatar src={u.avatar_url} name={u.full_name || u.email} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">{u.full_name || '—'}</p>
                  <p className="text-[11px] text-zinc-500 truncate">{u.email}</p>
                </div>
                <div className="text-right">
                  {u.role === 'admin' && <Badge tone="violet">Admin</Badge>}
                  <p className="text-[11px] text-zinc-500 mt-0.5">{fmtDate(u.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Top XP">
          <ul className="space-y-3">
            {stats.top_users.map((u, i) => (
              <li key={u.id} className="flex items-center gap-3">
                <span className={`w-6 text-center text-sm font-bold ${i === 0 ? 'text-amber-300' : i === 1 ? 'text-zinc-300' : i === 2 ? 'text-orange-400' : 'text-zinc-600'}`}>
                  {i < 3 ? <Trophy className="w-4 h-4 mx-auto" /> : i + 1}
                </span>
                <Avatar src={u.avatar_url} name={u.full_name || u.email} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">{u.full_name || u.email}</p>
                  <p className="text-[11px] text-zinc-500">Lv {u.level ?? 1} · {u.rank_tier || 'Unranked'}</p>
                </div>
                <span className="text-sm font-semibold text-violet-300 tabular-nums">{fmtNum(u.xp)} XP</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}

import { Star, Shield, ShieldAlert, Award, Trophy, Flame, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import { useNavigate } from 'react-router-dom'

const RANK_CONFIG = {
  Bronze: { icon: ShieldAlert, color: '#cd7f32', bg: 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20', ring: '#cd7f32', label: '🥉 Đồng' },
  Silver: { icon: Shield, color: '#94a3b8', bg: 'from-slate-50 to-gray-50 dark:from-slate-800 dark:to-gray-800', ring: '#94a3b8', label: '🥈 Bạc' },
  Gold: { icon: Award, color: '#f59e0b', bg: 'from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20', ring: '#f59e0b', label: '🥇 Vàng' },
  Platinum: { icon: Star, color: '#2dd4bf', bg: 'from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20', ring: '#2dd4bf', label: '💎 Bạch Kim' },
  Diamond: { icon: Trophy, color: '#06b6d4', bg: 'from-cyan-50 to-sky-50 dark:from-cyan-900/20 dark:to-sky-900/20', ring: '#06b6d4', label: '👑 Kim Cương' },
  Thach_Dau: { icon: Trophy, color: '#06b6d4', bg: 'from-cyan-50 to-sky-50 dark:from-cyan-900/20 dark:to-sky-900/20', ring: '#06b6d4', label: '💀 Thách Đấu' },
}

const NEXT_RANK: Record<string, string> = {
  Bronze: 'Đồng', Silver: 'Bạc', Gold: 'Vàng', Platinum: 'Bạch Kim', Diamond: 'Kim Cương', Thach_Dau: 'Thách Đấu',
}

interface HeroProfileCardProps {
  level: number
  xp: number
  rank: string
  points: number
  displayName: string
  streak?: number
}

function AnimatedRing({ color, size = 72 }: { color: string; size?: number }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {/* Outer glow ring */}
      <svg width={size} height={size} className="absolute inset-0 animate-spin-slow" style={{ animationDuration: '8s' }}>
        <defs>
          <linearGradient id={`ring-grad-${color.slice(1)}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="50%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 3} fill="none"
          stroke={`url(#ring-grad-${color.slice(1)})`} strokeWidth="3"
          strokeLinecap="round" strokeDasharray="15 8"
        />
      </svg>
      {/* Inner avatar */}
      <div className="absolute inset-[6px] rounded-full flex items-center justify-center font-black text-2xl select-none"
        style={{ background: `linear-gradient(135deg, ${color}22, ${color}44)`, border: `2px solid ${color}40` }}>
        🎓
      </div>
    </div>
  )
}

export function HeroProfileCard({ level, xp, rank, points, displayName, streak = 0 }: HeroProfileCardProps) {
  const navigate = useNavigate()
  const config = RANK_CONFIG[rank as keyof typeof RANK_CONFIG] || RANK_CONFIG.Bronze
  const Icon = config.icon
  const nextRank = NEXT_RANK[rank]

  // XP calculation
  const currentLevelXpStart = level === 1 ? 0 : ((level - 1) * level / 2) * 100
  const nextLevelXpStart = (level * (level + 1) / 2) * 100
  const xpNeeded = nextLevelXpStart - currentLevelXpStart
  const xpProgress = Math.max(0, xp - currentLevelXpStart)
  const progressPct = Math.min(100, Math.round((xpProgress / xpNeeded) * 100))

  return (
    <div className={clsx('card overflow-hidden relative', `bg-gradient-to-br ${config.bg}`)}>
      {/* Subtle pattern */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
        style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

      <div className="relative p-5 space-y-4">
        {/* Top row: avatar + info */}
        <div className="flex items-start gap-4">
          <AnimatedRing color={config.ring} size={68} />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <h3 className="font-bold text-surface-900 dark:text-white text-base leading-tight truncate">{displayName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{ background: `${config.ring}20`, color: config.ring }}>
                    <Icon className="w-3 h-3" />
                    {config.label}
                  </div>
                  <span className="text-xs font-semibold text-surface-500 dark:text-surface-400">Lv {level}</span>
                </div>
              </div>
              {streak > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-bold shrink-0"
                  style={{ background: '#ff6b3520', color: '#ff6b35' }}>
                  <Flame className="w-3.5 h-3.5" />
                  {streak}
                </div>
              )}
            </div>

            {/* Stats mini row */}
            <div className="flex items-center gap-3 text-xs text-surface-500 dark:text-surface-400 mt-2">
              <span><strong className="text-surface-700 dark:text-surface-200">{xp.toLocaleString()}</strong> XP</span>
              <span className="text-surface-200 dark:text-surface-700">·</span>
              <span><strong className="text-surface-700 dark:text-surface-200">{points}</strong> điểm</span>
            </div>
          </div>
        </div>

        {/* XP Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-surface-600 dark:text-surface-400">
              Tiến độ lên Lv {level + 1}
            </span>
            <span className="font-bold" style={{ color: config.ring }}>{progressPct}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-black/5 dark:bg-white/8 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
              style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${config.ring}cc, ${config.ring})` }}>
              {/* Shimmer */}
              <div className="absolute inset-0 animate-shimmer"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)', backgroundSize: '200% 100%' }} />
            </div>
          </div>
          <p className="text-xs text-surface-400">Còn <strong>{Math.max(0, xpNeeded - xpProgress).toLocaleString()} XP</strong> để đạt Lv {level + 1} · Rank tiếp theo: <strong>{nextRank}</strong></p>
        </div>

        {/* Quick action */}
        <button onClick={() => navigate('/focus')}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.01]"
          style={{ background: `linear-gradient(135deg, ${config.ring}18, ${config.ring}28)`, color: config.ring }}>
          <span>🚀 Bắt đầu học</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

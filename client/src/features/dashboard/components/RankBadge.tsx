import { Trophy, Star, Shield, ShieldAlert, Award } from 'lucide-react'
import { clsx } from 'clsx'

const RANK_CONFIG = {
  Bronze: { icon: ShieldAlert, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-700' },
  Silver: { icon: Shield, color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800', border: 'border-slate-200 dark:border-slate-600' },
  Gold:   { icon: Award, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-700/50' },
  Platinum: { icon: Star, color: 'text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/20', border: 'border-teal-200 dark:border-teal-700' },
  Diamond: { icon: Trophy, color: 'text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-200 dark:border-cyan-700' }
}

interface RankBadgeProps {
  level: number
  xp: number
  rank: string
  points: number
}

export function RankBadge({ level, xp, rank, points }: RankBadgeProps) {
  const config = RANK_CONFIG[rank as keyof typeof RANK_CONFIG] || RANK_CONFIG.Bronze
  const Icon = config.icon

  // Tính % XP cho level hiện tại (giả sử mỗi level = level * 100 XP)
  // Nếu level 1: cần 100 XP lên 2. XP max hiện tại là 100.
  const currentLevelXpStart = level === 1 ? 0 : ((level - 1) * level / 2) * 100
  const nextLevelXpStart = (level * (level + 1) / 2) * 100
  const xpNeeded = nextLevelXpStart - currentLevelXpStart
  const xpProgress = Math.max(0, xp - currentLevelXpStart)
  const progressPercent = Math.min(100, Math.max(0, Math.round((xpProgress / xpNeeded) * 100)))

  return (
    <div className={clsx('flex items-center gap-4 px-4 py-3 rounded-2xl border', config.bg, config.border)}>
      {/* Icon */}
      <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center bg-white dark:bg-surface-800 shadow-sm shrink-0', config.color)}>
        <Icon className="w-6 h-6" strokeWidth={2} />
      </div>

      <div className="flex-1 min-w-[150px]">
        <div className="flex items-end justify-between mb-1">
          <div>
            <h4 className={clsx('font-bold text-sm leading-none', config.color)}>{rank}</h4>
            <p className="text-xs font-semibold text-surface-600 dark:text-surface-300 mt-1">Level {level}</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-surface-700 dark:text-surface-200">{xp} XP</span>
            <p className="text-2xs text-surface-500">{points} streak</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
          <div 
            className={clsx('h-full transition-all duration-500 rounded-full', config.color.replace('text-', 'bg-'))}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-2xs text-surface-400 mt-1 text-center">Còn {Math.max(0, xpNeeded - xpProgress)} XP để lên Lv {level + 1}</p>
      </div>
    </div>
  )
}

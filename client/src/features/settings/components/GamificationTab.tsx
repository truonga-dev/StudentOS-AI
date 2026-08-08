import { useProfile } from '@/hooks/useProfile'
import { clsx } from 'clsx'
import { Zap, Flame, Trophy, Star, Lock, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

const RANK_PROGRESSION = [
  { name: 'Bronze',   label: '🥉 Đồng',     color: '#cd7f32', minLevel: 1  },
  { name: 'Silver',   label: '🥈 Bạc',      color: '#94a3b8', minLevel: 3  },
  { name: 'Gold',     label: '🥇 Vàng',     color: '#f59e0b', minLevel: 5  },
  { name: 'Platinum', label: '💎 Bạch Kim', color: '#2dd4bf', minLevel: 10 },
  { name: 'Diamond',  label: '👑 Kim Cương', color: '#06b6d4', minLevel: 15 },
  { name: 'Master',   label: '💀 Master',   color: '#a855f7', minLevel: 20 },
]

const BADGES = [
  { id: 'first_task', emoji: '✅', label: 'Nhiệm vụ đầu tiên', desc: 'Hoàn thành task đầu tiên', earned: true },
  { id: 'streak_7',   emoji: '🔥', label: 'Chuỗi 7 ngày',      desc: 'Học liên tục 7 ngày',    earned: true },
  { id: 'flashcard_50', emoji: '🃏', label: '50 Flashcards', desc: 'Tạo 50 thẻ ghi nhớ',     earned: false },
  { id: 'note_10',    emoji: '📝', label: '10 Ghi chú',        desc: 'Viết 10 ghi chú',       earned: false },
  { id: 'level_5',    emoji: '⚡', label: 'Level 5',           desc: 'Đạt cấp độ 5',         earned: false },
  { id: 'streak_30',  emoji: '🏆', label: 'Chuỗi 30 ngày',    desc: 'Học liên tục 30 ngày',  earned: false },
  { id: 'xp_1000',    emoji: '💎', label: '1000 XP',           desc: 'Tích lũy 1000 XP',     earned: false },
  { id: 'perfect_week', emoji: '🌟', label: 'Tuần hoàn hảo',  desc: 'Học đủ 7 ngày/tuần',   earned: false },
]

export function GamificationTab() {
  const { profile, updateProfile } = useProfile()
  const level = profile?.level ?? 1
  const xp = profile?.xp ?? 0
  const rankTier = profile?.rank_tier ?? 'Bronze'
  const streak = profile?.current_streak ?? 0
  const points = profile?.points ?? 0

  const currentRankIdx = RANK_PROGRESSION.findIndex(r => r.name === rankTier)
  const currentRankData = RANK_PROGRESSION[currentRankIdx] ?? RANK_PROGRESSION[0]
  const nextRankData = RANK_PROGRESSION[currentRankIdx + 1]

  const currentLevelXpStart = level === 1 ? 0 : ((level - 1) * level / 2) * 100
  const nextLevelXpStart = (level * (level + 1) / 2) * 100
  const xpNeeded = nextLevelXpStart - currentLevelXpStart
  const xpProgress = Math.max(0, xp - currentLevelXpStart)
  const progressPct = Math.min(100, Math.round((xpProgress / xpNeeded) * 100))

  const handleResetTour = async () => {
    try {
      await updateProfile({ has_completed_onboarding: false })
      toast.success('Tour sẽ hiển thị lại khi bạn vào Dashboard!')
    } catch {
      toast.error('Không thể reset tour')
    }
  }

  return (
    <div className="space-y-8">
      {/* ── XP & Level ──────────────────────────────────────────────────── */}
      <div>
        <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary-500" /> Tiến độ XP & Level
        </h4>
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-black text-surface-900 dark:text-white">Level {level}</p>
              <p className="text-sm text-surface-500 flex items-center gap-1.5 mt-0.5">
                <span style={{ color: currentRankData.color }}>{currentRankData.label}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-surface-900 dark:text-white">{xp.toLocaleString()} XP</p>
              <p className="text-xs text-surface-500">{points.toLocaleString()} điểm tích lũy</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-surface-500">Tiến độ lên Level {level + 1}</span>
              <span className="font-bold" style={{ color: currentRankData.color }}>{progressPct}%</span>
            </div>
            <div className="h-3 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
                style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${currentRankData.color}cc, ${currentRankData.color})` }}>
                <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)', animation: 'shimmer 2s infinite' }} />
              </div>
            </div>
            <p className="text-xs text-surface-400">Còn <strong>{Math.max(0, xpNeeded - xpProgress).toLocaleString()} XP</strong> để lên Level {level + 1}</p>
          </div>

          {/* Streak */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-50 dark:bg-orange-500/10">
            <Flame className="w-5 h-5 text-orange-500" />
            <div>
              <p className="text-sm font-bold text-orange-600 dark:text-orange-400">{streak} ngày học liên tục 🔥</p>
              <p className="text-xs text-surface-500">Duy trì streak để nhận bonus XP mỗi ngày!</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Rank Roadmap ─────────────────────────────────────────────────── */}
      <div>
        <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" /> Lộ trình Rank
        </h4>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {RANK_PROGRESSION.map((rank, idx) => {
            const isPassed = level >= (RANK_PROGRESSION[idx + 1]?.minLevel ?? 999)
            const isCurrent = rank.name === rankTier
            return (
              <div key={rank.name} className={clsx(
                'flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 min-w-[80px] transition-all',
                isCurrent ? 'border-2 shadow-md' : isPassed ? 'opacity-60' : 'opacity-40 border-surface-200 dark:border-surface-700',
              )} style={{ borderColor: isCurrent ? rank.color : undefined, background: isCurrent ? `${rank.color}12` : undefined }}>
                <span className="text-2xl">{rank.label.split(' ')[0]}</span>
                <p className="text-[10px] font-bold text-center leading-tight" style={{ color: isCurrent ? rank.color : undefined }}>
                  {rank.label.split(' ').slice(1).join(' ')}
                </p>
                <p className="text-[10px] text-surface-400">Lv {rank.minLevel}+</p>
                {isCurrent && <div className="w-1.5 h-1.5 rounded-full" style={{ background: rank.color }} />}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Badges ───────────────────────────────────────────────────────── */}
      <div>
        <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-500" /> Bộ sưu tập Huy hiệu
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {BADGES.map(badge => (
            <div key={badge.id} className={clsx(
              'p-3 rounded-2xl border flex flex-col items-center gap-2 text-center transition-all',
              badge.earned
                ? 'border-yellow-200 dark:border-yellow-800/50 bg-yellow-50 dark:bg-yellow-900/10'
                : 'border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/30 opacity-50',
            )}>
              <span className="text-2xl relative">
                {badge.emoji}
                {!badge.earned && <Lock className="w-3 h-3 text-surface-400 absolute -bottom-0.5 -right-0.5" />}
              </span>
              <div>
                <p className="text-xs font-semibold text-surface-800 dark:text-surface-200">{badge.label}</p>
                <p className="text-[10px] text-surface-500 mt-0.5">{badge.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Reset Tour ───────────────────────────────────────────────────── */}
      <div className="pt-2 border-t border-surface-200 dark:border-surface-700">
        <button onClick={handleResetTour}
          className="flex items-center gap-2 text-sm text-surface-500 hover:text-primary-500 transition-colors">
          <RotateCcw className="w-4 h-4" /> Xem lại Tour hướng dẫn
        </button>
      </div>
    </div>
  )
}

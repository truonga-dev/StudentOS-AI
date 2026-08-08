import { useState, useEffect, useCallback } from 'react'
import { Trophy, Flame, Medal, Crown, RefreshCw, Loader2, Star, TrendingUp, Info, X } from 'lucide-react'
import { clsx } from 'clsx'
import { getGlobalLeaderboard, getStreakLeaderboard, getPointsLeaderboard, type LeaderboardEntry } from '@/services/leaderboard'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'

// ─── Rank config ──────────────────────────────────────────────────────────────

const RANK_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  Bronze: { color: '#cd7f32', bg: 'rgba(205,127,50,0.12)', label: 'Đồng' },
  Silver: { color: '#aaa9ad', bg: 'rgba(170,169,173,0.12)', label: 'Bạc' },
  Gold: { color: '#ffd700', bg: 'rgba(255,215,0,0.12)', label: 'Vàng' },
  Platinum: { color: '#e5e4e2', bg: 'rgba(229,228,226,0.12)', label: 'Bạch Kim' },
  Diamond: { color: '#b9f2ff', bg: 'rgba(185,242,255,0.12)', label: 'Kim Cương' },
  Master: { color: '#ff8c00', bg: 'rgba(255,140,0,0.12)', label: 'Cao Thủ' },
  Challenger: { color: '#d4af37', bg: 'rgba(212,175,55,0.12)', label: 'Thách Đấu' },
}

// ─── Podium top 3 ──────────────────────────────────────────────────────────────

function PodiumBlock({ entry, position }: { entry: LeaderboardEntry; position: 1 | 2 | 3 }) {
  const heightMap = { 1: 'h-28', 2: 'h-20', 3: 'h-16' }
  const orderMap = { 1: 'order-2', 2: 'order-1', 3: 'order-3' }
  const crownColor = { 1: 'text-yellow-400', 2: 'text-slate-400', 3: 'text-amber-700' }
  const glowMap = { 1: 'shadow-[0_0_30px_rgba(251,191,36,0.4)]', 2: 'shadow-[0_0_16px_rgba(148,163,184,0.3)]', 3: 'shadow-[0_0_16px_rgba(180,83,9,0.3)]' }
  const bgMap = { 1: 'bg-gradient-to-br from-yellow-500 to-amber-600', 2: 'bg-gradient-to-br from-slate-400 to-slate-500', 3: 'bg-gradient-to-br from-amber-700 to-amber-800' }

  const initials = (entry.full_name ?? 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className={clsx('flex flex-col items-center gap-2', orderMap[position])}>
      {/* Crown / rank badge */}
      <div className="flex flex-col items-center gap-1">
        <Crown className={clsx('w-5 h-5', crownColor[position])} fill="currentColor" />
        <span className={clsx('text-xs font-black', crownColor[position])}>#{position}</span>
      </div>

      {/* Avatar */}
      <div className={clsx('relative rounded-full border-4 border-white dark:border-surface-800', glowMap[position])}>
        {entry.avatar_url ? (
          <img src={entry.avatar_url} alt={entry.full_name ?? 'User'} className="w-14 h-14 rounded-full object-cover" />
        ) : (
          <div className={clsx('w-14 h-14 rounded-full flex items-center justify-center text-white font-black text-lg', bgMap[position])}>
            {initials}
          </div>
        )}
        {position === 1 && (
          <span className="absolute -top-1 -right-1 text-lg">🏆</span>
        )}
      </div>

      {/* Name */}
      <p className="text-xs font-bold text-surface-900 dark:text-white text-center max-w-[80px] truncate">
        {entry.full_name ?? 'Ẩn danh'}
      </p>
      <p className="text-xs font-bold text-primary-500">{(entry.xp ?? 0).toLocaleString()} XP</p>

      {/* Podium base */}
      <div className={clsx('w-20 rounded-t-xl flex items-center justify-center', heightMap[position], bgMap[position])}>
        <span className="text-2xl font-black text-white/70">{position}</span>
      </div>
    </div>
  )
}

// ─── Row for rank 4+ ──────────────────────────────────────────────────────────

function LeaderboardRow({
  entry, rank, isMe, tab
}: {
  entry: LeaderboardEntry
  rank: number
  isMe: boolean
  tab: 'global' | 'streak' | 'points'
}) {
  const initials = (entry.full_name ?? 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const rankCfg = RANK_CONFIG[entry.rank_tier ?? 'Bronze'] ?? RANK_CONFIG['Bronze']

  const scoreValue = tab === 'streak' ? entry.current_streak : tab === 'points' ? entry.points : (entry.xp ?? 0)
  const scoreLabel = tab === 'streak' ? '🔥 ngày' : tab === 'points' ? '⭐ pts' : 'XP'

  return (
    <div className={clsx(
      'flex items-center gap-3 px-4 py-3 rounded-2xl transition-all',
      isMe
        ? 'bg-primary-50 dark:bg-primary-500/10 border-2 border-primary-300 dark:border-primary-700'
        : 'hover:bg-surface-50 dark:hover:bg-surface-800/50 border border-transparent'
    )}>
      {/* Rank number */}
      <div className="w-8 text-center shrink-0">
        {rank <= 3 ? (
          <Medal className={clsx('w-5 h-5 mx-auto', rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-slate-400' : 'text-amber-700')} fill="currentColor" />
        ) : (
          <span className="text-sm font-bold text-surface-400">{rank}</span>
        )}
      </div>

      {/* Avatar */}
      {entry.avatar_url ? (
        <img src={entry.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-gradient-brand flex items-center justify-center text-white font-bold text-sm shrink-0">
          {initials}
        </div>
      )}

      {/* Name + rank badge */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={clsx('font-semibold text-sm truncate', isMe ? 'text-primary-600 dark:text-primary-400' : 'text-surface-900 dark:text-white')}>
            {entry.full_name ?? 'Ẩn danh'}{isMe && ' (Bạn)'}
          </p>
          {entry.rank_tier && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
              style={{ color: rankCfg.color, background: rankCfg.bg }}>
              {rankCfg.label}
            </span>
          )}
        </div>
        <p className="text-xs text-surface-500">
          Lv.{entry.level ?? 1} • Streak: {entry.current_streak}🔥
        </p>
      </div>

      {/* Score */}
      <div className="text-right shrink-0">
        <p className={clsx('font-black text-base', isMe ? 'text-primary-600 dark:text-primary-400' : 'text-surface-700 dark:text-surface-200')}>
          {scoreValue?.toLocaleString()}
        </p>
        <p className="text-[10px] text-surface-400">{scoreLabel}</p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'global' | 'streak' | 'points'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'global', label: 'Toàn cầu (XP)', icon: Trophy },
  { id: 'streak', label: 'Streak', icon: Flame },
  { id: 'points', label: 'Điểm thưởng', icon: Star },
]

export function LeaderboardPage() {
  const { user } = useAuth()
  const { profile } = useProfile()
  const [tab, setTab] = useState<Tab>('global')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [myRank, setMyRank] = useState<number | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState(new Date())

  const [showRankInfo, setShowRankInfo] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      let data: LeaderboardEntry[]
      if (tab === 'global') data = await getGlobalLeaderboard()
      else if (tab === 'streak') data = await getStreakLeaderboard()
      else data = await getPointsLeaderboard()
      setEntries(data)

      // Find my rank
      if (user) {
        const idx = data.findIndex(e => e.id === user.id)
        setMyRank(idx >= 0 ? idx + 1 : null)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setLastRefreshed(new Date())
    }
  }, [tab, user])

  useEffect(() => { load() }, [load])

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)

  const myEntry = user ? entries.find(e => e.id === user.id) : null

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 animate-slide-up">
      {/* ── Header ── */}
      <div className="text-center space-y-1 relative">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-800 mb-2">
          <TrendingUp className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
          <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">Live Rankings</span>
        </div>
        <div className="relative inline-block">
          <h1 className="text-2xl sm:text-3xl font-black text-surface-900 dark:text-white">🏆 Bảng xếp hạng</h1>
          <button
            onClick={() => setShowRankInfo(true)}
            className="absolute -right-8 top-1.5 p-1 text-surface-400 hover:text-primary-500 transition-colors"
            title="Hệ thống Rank"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
        <p className="text-surface-500 text-sm">Cạnh tranh lành mạnh, học tập vươn cao!</p>
      </div>

      {/* ── My rank card ── */}
      {profile && myEntry && (
        <div className="rounded-2xl p-4 bg-gradient-to-r from-primary-500/10 via-cyan-500/10 to-purple-500/10 border border-primary-200 dark:border-primary-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-brand flex items-center justify-center text-white font-black">
                {(profile.full_name ?? 'U')[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="font-bold text-surface-900 dark:text-white text-sm">{profile.full_name ?? 'Bạn'}</p>
            <p className="text-xs text-surface-500">Lv.{profile.level ?? 1} • {RANK_CONFIG[profile.rank_tier ?? 'Bronze']?.label ?? 'Đồng'}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-primary-500">#{myRank ?? '—'}</p>
            <p className="text-xs text-surface-400">hạng của bạn</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-black text-surface-700 dark:text-surface-200">{(profile.xp ?? 0).toLocaleString()}</p>
            <p className="text-xs text-surface-400">XP</p>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 bg-surface-100 dark:bg-surface-800 rounded-2xl">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200',
              tab === id
                ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-sm'
                : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
        <button
          onClick={load}
          className="p-2.5 rounded-xl text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-white dark:hover:bg-surface-700 transition-all"
          title="Làm mới"
          disabled={loading}
        >
          <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20 text-surface-500">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Chưa có dữ liệu xếp hạng</p>
        </div>
      ) : (
        <>
          {/* ── Podium ── */}
          {top3.length >= 3 && tab === 'global' && (
            <div className="pt-4">
              <div className="flex items-end justify-center gap-4">
                <PodiumBlock entry={top3[1]} position={2} />
                <PodiumBlock entry={top3[0]} position={1} />
                <PodiumBlock entry={top3[2]} position={3} />
              </div>
            </div>
          )}

          {/* ── Ranking list ── */}
          <div className="space-y-1.5">
            {/* Header row */}
            <div className="flex items-center gap-3 px-4 py-2 text-xs text-surface-400 font-semibold uppercase tracking-wider">
              <span className="w-8 text-center">#</span>
              <span className="w-9 shrink-0" />
              <span className="flex-1">Người dùng</span>
              <span className="text-right">{tab === 'streak' ? 'Streak' : tab === 'points' ? 'Điểm' : 'XP'}</span>
            </div>

            {/* Show top 3 as rows when not in XP tab (no podium) */}
            {(tab !== 'global' ? entries : rest).map((entry, idx) => (
              <LeaderboardRow
                key={entry.id}
                entry={entry}
                rank={tab !== 'global' ? idx + 1 : idx + 4}
                isMe={entry.id === user?.id}
                tab={tab}
              />
            ))}

            {/* If XP tab, also show top 3 as rows below podium */}
            {tab === 'global' && top3.map((entry, idx) => (
              <LeaderboardRow
                key={entry.id}
                entry={entry}
                rank={idx + 1}
                isMe={entry.id === user?.id}
                tab={tab}
              />
            ))}
          </div>

          <p className="text-center text-xs text-surface-400 pt-2">
            Cập nhật lúc {lastRefreshed.toLocaleTimeString('vi-VN')} • Top {entries.length} người dùng
          </p>
        </>
      )}

      {/* ── Rank Info Modal ── */}
      {showRankInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-sm p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-surface-900 dark:text-white flex items-center gap-2">
                <Medal className="w-5 h-5 text-primary-500" />
                Hệ thống Xếp hạng
              </h2>
              <button onClick={() => setShowRankInfo(false)} className="p-1.5 rounded-lg text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                <span className="font-bold text-[#ff8c00]">Cao Thủ</span>
                <span className="text-sm font-semibold">Từ Level 20</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                <span className="font-bold text-[#b9f2ff]">Kim Cương</span>
                <span className="text-sm font-semibold">Từ Level 15</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                <span className="font-bold text-[#e5e4e2]">Bạch Kim</span>
                <span className="text-sm font-semibold">Từ Level 10</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                <span className="font-bold text-[#ffd700]">Vàng</span>
                <span className="text-sm font-semibold">Từ Level 5</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                <span className="font-bold text-[#aaa9ad]">Bạc</span>
                <span className="text-sm font-semibold">Từ Level 3</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                <span className="font-bold text-[#cd7f32]">Đồng</span>
                <span className="text-sm font-semibold">Level 1 - 2</span>
              </div>
            </div>

            <p className="text-xs text-surface-500 mt-5 text-center">
              Học tập chăm chỉ mỗi ngày để kiếm XP và nâng cấp Level của bạn!
            </p>
          </div>
        </div>
      )}
    </div>
  )
}


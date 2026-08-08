import { supabase } from '@/lib/supabase'

export interface LeaderboardEntry {
  id: string
  full_name: string | null
  avatar_url: string | null
  xp: number
  points: number
  current_streak: number
  level: number
  rank_tier: string
}

/** Top 100 users by total XP */
export async function getGlobalLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, xp, points, current_streak, level, rank_tier')
    .order('xp', { ascending: false })
    .limit(100)

  if (error) throw error
  return (data ?? []) as LeaderboardEntry[]
}

/** Top 100 by streak */
export async function getStreakLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, xp, points, current_streak, level, rank_tier')
    .order('current_streak', { ascending: false })
    .limit(100)

  if (error) throw error
  return (data ?? []) as LeaderboardEntry[]
}

/** Top 100 by total points (weekly proxy — can be enhanced with proper weekly_xp column) */
export async function getPointsLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, xp, points, current_streak, level, rank_tier')
    .order('points', { ascending: false })
    .limit(100)

  if (error) throw error
  return (data ?? []) as LeaderboardEntry[]
}

/** Get current user's rank position in XP leaderboard */
export async function getMyRank(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gt('xp', 
      (await supabase.from('profiles').select('xp').eq('id', userId).single()).data?.xp ?? 0
    )

  if (error) return 0
  return (count ?? 0) + 1
}

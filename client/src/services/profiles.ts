import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

export async function getProfile(): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) throw error
  
  if (!data) {
    // Nếu chưa có profile (user cũ hoặc thiếu trigger), tạo mới
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({ 
        id: user.id, 
        email: user.email || '', 
        full_name: user.user_metadata?.full_name || null 
      })
      .select()
      .single()
      
    if (insertError) throw insertError
    return newProfile as Profile
  }
  
  return data as Profile
}

export async function getTopProfiles(limit: number = 50): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, xp, level, rank_tier')
    .order('xp', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (error) throw error
  return data as Profile[]
}

export async function addPointsAndUpdateStreak(pointsToAdd: number): Promise<Profile> {
  const profile = await getProfile()
  
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const lastStudyDate = profile.last_study_date
  
  let newStreak = profile.current_streak || 0

  if (lastStudyDate) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    
    if (lastStudyDate === yesterday) {
      newStreak += 1
    } else if (lastStudyDate !== today) {
      // Bị đứt chuỗi
      newStreak = 1
    }
    // Nếu lastStudyDate == today thì giữ nguyên streak
  } else {
    // Ngày học đầu tiên
    newStreak = 1
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ 
      points: (profile.points || 0) + pointsToAdd,
      current_streak: newStreak,
      last_study_date: today
    })
    .eq('id', profile.id)
    .select()
    .single()

  if (error) throw error
  return data as Profile
}

// ─── Gamification Logic ────────────────────────────────────────────────────────

export function calculateLevelAndRank(xp: number): { level: number, rank_tier: string } {
  // Công thức: Level = floor(sqrt(xp / 100)) + 1
  // Level 1: 0 - 99 XP
  // Level 2: 100 - 399 XP
  // Level 3: 400 - 899 XP
  // Level 4: 900 - 1599 XP
  // Level 5: 1600 - 2499 XP
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  let rank_tier = 'Bronze';
  
  if (level >= 20) rank_tier = 'Master';
  else if (level >= 15) rank_tier = 'Diamond';
  else if (level >= 10) rank_tier = 'Platinum';
  else if (level >= 5) rank_tier = 'Gold';
  else if (level >= 3) rank_tier = 'Silver';
  
  return { level, rank_tier };
}

export async function addXp(xpToAdd: number): Promise<Profile> {
  const profile = await getProfile()
  
  const currentXp = profile.xp || 0
  const newXp = currentXp + xpToAdd
  const { level, rank_tier } = calculateLevelAndRank(newXp)

  const { data, error } = await supabase
    .from('profiles')
    .update({ 
      xp: newXp,
      level: level,
      rank_tier: rank_tier
    })
    .eq('id', profile.id)
    .select()
    .single()

  if (error) throw error
  return data as Profile
}

export async function updateProfile(updates: Partial<Profile>): Promise<Profile> {
  const profile = await getProfile()
  
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', profile.id)
    .select()
    .single()

  if (error) throw error
  return data as Profile
}

export async function uploadAvatar(file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const BUCKET = import.meta.env.VITE_STORAGE_BUCKET ?? 'student-files'
  const ext = file.name.split('.').pop() ?? 'png'
  const storagePath = `${user.id}/avatars/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { upsert: true })

  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  return urlData.publicUrl
}

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

export async function recordActivity({ xpToAdd = 0, pointsToAdd = 0 }: { xpToAdd?: number, pointsToAdd?: number }): Promise<Profile> {
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
  } else {
    // Ngày học đầu tiên
    newStreak = 1
  }

  const newXp = (profile.xp || 0) + xpToAdd
  const { level, rank_tier } = calculateLevelAndRank(newXp)

  const { data, error } = await supabase
    .from('profiles')
    .update({ 
      xp: newXp,
      level,
      rank_tier,
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

export async function addPointsAndUpdateStreak(pointsToAdd: number): Promise<Profile> {
  return recordActivity({ pointsToAdd })
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
  
  if (level >= 30) rank_tier = 'Challenger';
  else if (level >= 20) rank_tier = 'Master';
  else if (level >= 15) rank_tier = 'Diamond';
  else if (level >= 10) rank_tier = 'Platinum';
  else if (level >= 5) rank_tier = 'Gold';
  else if (level >= 3) rank_tier = 'Silver';
  
  return { level, rank_tier };
}

export async function addXp(xpToAdd: number): Promise<Profile> {
  return recordActivity({ xpToAdd })
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

export async function uploadCoverPhoto(file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const BUCKET = import.meta.env.VITE_STORAGE_BUCKET ?? 'student-files'
  const ext = file.name.split('.').pop() ?? 'jpg'
  const storagePath = `${user.id}/covers/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { upsert: true })

  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  return urlData.publicUrl
}

// ─── Full Data Export ──────────────────────────────────────────────────────────

export async function exportUserData(): Promise<Blob> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const uid = user.id

  // Fetch all user data in parallel
  const [
    profileRes,
    subjectsRes,
    tasksRes,
    notesRes,
    flashcardsRes,
    eventsRes,
    sessionsRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', uid).single(),
    supabase.from('subjects').select('*').eq('user_id', uid),
    supabase.from('tasks').select('*').eq('user_id', uid),
    supabase.from('notes').select('*').eq('user_id', uid),
    supabase.from('flashcards').select('*').eq('user_id', uid),
    supabase.from('calendar_events').select('*').eq('user_id', uid),
    supabase.from('study_sessions').select('*').eq('user_id', uid),
  ])

  const exportData = {
    exported_at: new Date().toISOString(),
    app: 'Student OS AI',
    version: '1.0',
    user: {
      id: uid,
      email: user.email,
    },
    data: {
      profile: profileRes.data,
      subjects: subjectsRes.data ?? [],
      tasks: tasksRes.data ?? [],
      notes: notesRes.data ?? [],
      flashcards: flashcardsRes.data ?? [],
      calendar_events: eventsRes.data ?? [],
      study_sessions: sessionsRes.data ?? [],
    },
    stats: {
      subjects_count: subjectsRes.data?.length ?? 0,
      tasks_count: tasksRes.data?.length ?? 0,
      notes_count: notesRes.data?.length ?? 0,
      flashcards_count: flashcardsRes.data?.length ?? 0,
      events_count: eventsRes.data?.length ?? 0,
      sessions_count: sessionsRes.data?.length ?? 0,
    },
  }

  // Dynamic import of JSZip to keep bundle lean
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()

  zip.file('export_info.json', JSON.stringify({ exported_at: exportData.exported_at, app: exportData.app, version: exportData.version, user: exportData.user, stats: exportData.stats }, null, 2))
  zip.file('profile.json', JSON.stringify(exportData.data.profile, null, 2))
  zip.file('subjects.json', JSON.stringify(exportData.data.subjects, null, 2))
  zip.file('tasks.json', JSON.stringify(exportData.data.tasks, null, 2))
  zip.file('notes.json', JSON.stringify(exportData.data.notes, null, 2))
  zip.file('flashcards.json', JSON.stringify(exportData.data.flashcards, null, 2))
  zip.file('calendar_events.json', JSON.stringify(exportData.data.calendar_events, null, 2))
  zip.file('study_sessions.json', JSON.stringify(exportData.data.study_sessions, null, 2))

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
}

// ─── Account Deletion ──────────────────────────────────────────────────────────

export async function deleteAccount(): Promise<void> {
  // Calls a Supabase Edge Function that deletes the user server-side
  // (client-side auth.admin.deleteUser requires service role key)
  const { error } = await supabase.functions.invoke('delete-account')
  if (error) throw error
}


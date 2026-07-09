import { supabase } from '@/lib/supabase'
import type { StudySession, CreateSessionInput, WeeklyData } from '@/types'

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

// ── Tạo session mới (gọi khi Pomodoro hoàn thành) ────────────────────────────
export async function createSession(input: CreateSessionInput): Promise<StudySession> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Chưa đăng nhập')

  const { data, error } = await supabase
    .from('study_sessions')
    .insert({ ...input, user_id: user.id })
    .select('*, subjects(title, color)')
    .single()

  if (error) throw error
  return data
}

// ── Lấy sessions hôm nay ──────────────────────────────────────────────────────
export async function getTodaySessions(): Promise<StudySession[]> {
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('study_sessions')
    .select('*, subjects(title, color)')
    .gte('started_at', start.toISOString())
    .order('started_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

// ── Tổng phút học hôm nay ─────────────────────────────────────────────────────
export async function getTodayMinutes(): Promise<number> {
  const sessions = await getTodaySessions()
  return sessions.reduce((sum, s) => sum + s.duration_minutes, 0)
}

// ── Dữ liệu theo tuần (7 ngày hiện tại) cho biểu đồ ─────────────────────────
export async function getWeeklyData(): Promise<WeeklyData[]> {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sun

  // Tính ngày đầu tuần (Thứ 2)
  const monday = new Date(now)
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek)
  monday.setDate(now.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)

  // Lấy sessions từ đầu tuần
  const { data, error } = await supabase
    .from('study_sessions')
    .select('started_at, duration_minutes')
    .gte('started_at', monday.toISOString())
    .order('started_at')

  if (error) throw error
  const sessions = data ?? []

  // Group theo ngày trong tuần
  const minutesByDay: Record<number, number> = {}
  for (const s of sessions) {
    const d = new Date(s.started_at).getDay()
    minutesByDay[d] = (minutesByDay[d] ?? 0) + s.duration_minutes
  }

  // Tạo array T2-CN
  const orderedDays = [1, 2, 3, 4, 5, 6, 0] // Mon-Sun
  return orderedDays.map(d => ({
    day: DAY_LABELS[d],
    hours: Math.round((minutesByDay[d] ?? 0) / 60 * 10) / 10, // làm tròn 1 chữ số
  }))
}

// ── Tổng phút theo môn học (cho analytics) ───────────────────────────────────
export async function getMinutesBySubject(): Promise<Array<{ subject_id: string; subject_title: string; total_minutes: number }>> {
  const { data, error } = await supabase
    .from('study_sessions')
    .select('subject_id, duration_minutes, subjects(title)')

  if (error) throw error
  const sessions = data ?? []

  const map: Record<string, { subject_title: string; total_minutes: number }> = {}
  for (const s of sessions) {
    const sid = s.subject_id ?? '__none__'
    const title = ((s.subjects as unknown) as { title: string } | null)?.title ?? 'Không rõ'
    if (!map[sid]) map[sid] = { subject_title: title, total_minutes: 0 }
    map[sid].total_minutes += s.duration_minutes
  }

  return Object.entries(map).map(([subject_id, v]) => ({ subject_id, ...v }))
}

// ── Biểu đồ hàng tháng (4 tuần) ──────────────────────────────────────────────
export async function getMonthlyTrend(): Promise<{ week: string; hours: number }[]> {
  const now = new Date()
  const oneMonthAgo = new Date(now)
  oneMonthAgo.setDate(now.getDate() - 28) // 4 weeks

  const { data, error } = await supabase
    .from('study_sessions')
    .select('started_at, duration_minutes')
    .gte('started_at', oneMonthAgo.toISOString())
    .order('started_at')

  if (error) throw error
  const sessions = data ?? []

  // Group by week (Tuần 1, Tuần 2, Tuần 3, Tuần 4)
  const weeks = [
    { week: 'Tuần 1', hours: 0 },
    { week: 'Tuần 2', hours: 0 },
    { week: 'Tuần 3', hours: 0 },
    { week: 'Tuần 4', hours: 0 },
  ]

  sessions.forEach(s => {
    const d = new Date(s.started_at)
    const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diff < 7) weeks[3].hours += s.duration_minutes / 60
    else if (diff < 14) weeks[2].hours += s.duration_minutes / 60
    else if (diff < 21) weeks[1].hours += s.duration_minutes / 60
    else if (diff < 28) weeks[0].hours += s.duration_minutes / 60
  })

  // Round hours
  return weeks.map(w => ({ week: w.week, hours: Math.round(w.hours * 10) / 10 }))
}

// ── Đếm ngày học liên tiếp (Streak) ──────────────────────────────────────────
export async function getStudyStreak(): Promise<number> {
  const { data, error } = await supabase
    .from('study_sessions')
    .select('started_at')
    .order('started_at', { ascending: false })

  if (error) throw error
  if (!data || data.length === 0) return 0

  // Extract unique dates sorted descending
  const uniqueDates = [...new Set(data.map(s => {
    const d = new Date(s.started_at)
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
  }))]

  let streak = 0
  const todayStr = `${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`

  // If they didn't study today or yesterday, streak is 0
  if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) return 0

  let currentDate = new Date(uniqueDates[0])
  for (let i = 0; i < uniqueDates.length; i++) {
    const d = new Date(uniqueDates[i])
    
    // Check if it's contiguous
    if (i === 0 || Math.floor((currentDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)) === 1) {
      streak++
      currentDate = d
    } else {
      break
    }
  }

  return streak
}

// ── Dữ liệu Heatmap (365 ngày) ───────────────────────────────────────────────
export async function getHeatmapData(): Promise<{ date: string; count: number }[]> {
  const now = new Date()
  const oneYearAgo = new Date(now)
  oneYearAgo.setFullYear(now.getFullYear() - 1)

  const { data, error } = await supabase
    .from('study_sessions')
    .select('started_at, duration_minutes')
    .gte('started_at', oneYearAgo.toISOString())

  if (error) throw error
  
  const map: Record<string, number> = {}
  ;(data || []).forEach(s => {
    const d = new Date(s.started_at)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    map[dateStr] = (map[dateStr] || 0) + s.duration_minutes
  })

  return Object.entries(map).map(([date, count]) => ({ date, count }))
}

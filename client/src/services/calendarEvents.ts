import { supabase } from '@/lib/supabase'
import type { CalendarEvent, CreateEventInput } from '@/types'

// ── Lấy sự kiện trong 1 tháng (cộng trừ 1 tháng lân cận để cover các ngày rìa lịch)
export async function getEventsForMonth(year: number, month: number): Promise<CalendarEvent[]> {
  const start = new Date(year, month - 1, 1) // Lấy từ tháng trước
  const end = new Date(year, month + 2, 0) // Lấy đến hết tháng sau

  const { data, error } = await supabase
    .from('calendar_events')
    .select('*, subjects(title, color)')
    .gte('start_time', start.toISOString())
    .lte('start_time', end.toISOString())
    .order('start_time')

  if (error) throw error
  return data ?? []
}

// ── Thêm sự kiện ─────────────────────────────────────────────────────────────
export async function createEvent(input: CreateEventInput): Promise<CalendarEvent> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Chưa đăng nhập')

  const { data, error } = await supabase
    .from('calendar_events')
    .insert({ ...input, user_id: user.id })
    .select('*, subjects(title, color)')
    .single()

  if (error) throw error
  return data
}

// ── Xoá sự kiện ──────────────────────────────────────────────────────────────
export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', id)

  if (error) throw error
}

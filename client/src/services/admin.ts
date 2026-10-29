import { api } from './api'
import { supabase } from '@/lib/supabase'
import type { Profile, Report, ChatChannel } from '@/types'

export interface SystemStats {
  users: {
    total: number
    admins: number
    banned: number
  }
  academic: {
    subjects: number
    tasks: number
    completed_tasks: number
    notes: number
    flashcards: number
    files: number
    study_sessions: number
    study_minutes: number
  }
  community: {
    channels: number
    messages: number
    pending_reports: number
    total_reports: number
  }
  recent_users: Pick<Profile, 'id' | 'email' | 'full_name' | 'avatar_url' | 'role' | 'xp' | 'level' | 'rank_tier' | 'created_at'>[]
}

export interface AdminChannel extends Omit<ChatChannel, 'chat_members'> {
  creator?: { id: string; full_name: string | null; email: string } | null
  chat_members?: { count: number }[]
  community_messages?: { count: number }[]
}

// ─── 1. Thống kê hệ thống ─────────────────────────────────────────────────────

export async function getAdminStats(): Promise<SystemStats> {
  try {
    return await api.get<SystemStats>('/admin/stats')
  } catch {
    // Fallback sang truy vấn trực tiếp Supabase nếu Backend chưa khởi động hoặc đang sleep
    const [
      profilesRes,
      subjectsRes,
      tasksRes,
      completedTasksRes,
      notesRes,
      flashcardsRes,
      filesRes,
      channelsRes,
      messagesRes,
      reportsRes,
      pendingReportsRes,
      sessionsRes,
    ] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name, avatar_url, role, is_banned, xp, level, rank_tier, created_at').order('created_at', { ascending: false }),
      supabase.from('subjects').select('id', { count: 'exact', head: true }),
      supabase.from('tasks').select('id', { count: 'exact', head: true }),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('completed', true),
      supabase.from('notes').select('id', { count: 'exact', head: true }),
      supabase.from('flashcards').select('id', { count: 'exact', head: true }),
      supabase.from('files').select('id', { count: 'exact', head: true }),
      supabase.from('chat_channels').select('id', { count: 'exact', head: true }),
      supabase.from('community_messages').select('id', { count: 'exact', head: true }),
      supabase.from('reports').select('id', { count: 'exact', head: true }),
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('study_sessions').select('duration_minutes'),
    ])

    const profiles = (profilesRes.data || []) as Profile[]
    const sessions = sessionsRes.data || []
    const studyMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)

    return {
      users: {
        total: profiles.length,
        admins: profiles.filter(p => p.role === 'admin').length,
        banned: profiles.filter(p => p.is_banned).length,
      },
      academic: {
        subjects: subjectsRes.count ?? 0,
        tasks: tasksRes.count ?? 0,
        completed_tasks: completedTasksRes.count ?? 0,
        notes: notesRes.count ?? 0,
        flashcards: flashcardsRes.count ?? 0,
        files: filesRes.count ?? 0,
        study_sessions: sessions.length,
        study_minutes: studyMinutes,
      },
      community: {
        channels: channelsRes.count ?? 0,
        messages: messagesRes.count ?? 0,
        pending_reports: pendingReportsRes.count ?? 0,
        total_reports: reportsRes.count ?? 0,
      },
      recent_users: profiles.slice(0, 5),
    }
  }
}

// ─── 2. Quản lý Người dùng ────────────────────────────────────────────────────

export async function getAdminUsers(search?: string, role?: string): Promise<Profile[]> {
  try {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (role && role !== 'all') params.set('role', role)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return await api.get<Profile[]>(`/admin/users${qs}`)
  } catch {
    let query = supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (role && role !== 'all') query = query.eq('role', role)
    if (search) query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
    const { data, error } = await query
    if (error) throw error
    return (data || []) as Profile[]
  }
}

export async function updateAdminUser(
  userId: string,
  updates: { role?: 'user' | 'admin'; is_banned?: boolean; xp?: number; points?: number; level?: number; rank_tier?: string }
): Promise<Profile> {
  try {
    return await api.patch<Profile>(`/admin/users/${userId}`, updates)
  } catch {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    if (error) throw error
    return data as Profile
  }
}

export async function deleteAdminUser(userId: string): Promise<void> {
  try {
    await api.delete(`/admin/users/${userId}`)
  } catch {
    const { error } = await supabase.from('profiles').delete().eq('id', userId)
    if (error) throw error
  }
}

// ─── 3. Quản lý Báo cáo vi phạm ───────────────────────────────────────────────

export async function getAdminReports(statusFilter?: string): Promise<Report[]> {
  try {
    const qs = statusFilter && statusFilter !== 'all' ? `?status=${statusFilter}` : ''
    return await api.get<Report[]>(`/admin/reports${qs}`)
  } catch {
    let query = supabase
      .from('reports')
      .select(
        '*, reporter:profiles!reports_reporter_id_fkey(id, email, full_name, avatar_url), reported_user:profiles!reports_reported_user_id_fkey(id, email, full_name, avatar_url, is_banned), message:community_messages!reports_message_id_fkey(id, content, channel_id, is_deleted, created_at)'
      )
      .order('created_at', { ascending: false })

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const { data, error } = await query
    if (error) {
      // Fallback nếu tên foreign key không khớp
      let fb = supabase.from('reports').select('*').order('created_at', { ascending: false })
      if (statusFilter && statusFilter !== 'all') fb = fb.eq('status', statusFilter)
      const fbRes = await fb
      return (fbRes.data || []) as Report[]
    }
    return (data || []) as Report[]
  }
}

export async function resolveAdminReport(
  reportId: string,
  payload: { status: 'pending' | 'resolved' | 'dismissed'; delete_message?: boolean; ban_reported_user?: boolean }
): Promise<void> {
  try {
    await api.patch(`/admin/reports/${reportId}`, payload)
  } catch {
    const { data: report } = await supabase.from('reports').select('*').eq('id', reportId).single()
    if (payload.delete_message && report?.message_id) {
      await supabase
        .from('community_messages')
        .update({
          is_deleted: true,
          content: '[Tin nhắn đã bị Quản trị viên xóa do vi phạm tiêu chuẩn cộng đồng]',
          attachments: null,
        })
        .eq('id', report.message_id)
    }
    if (payload.ban_reported_user && report?.reported_user_id) {
      await supabase.from('profiles').update({ is_banned: true }).eq('id', report.reported_user_id)
    }
    const { error } = await supabase.from('reports').update({ status: payload.status }).eq('id', reportId)
    if (error) throw error
  }
}

export async function deleteAdminReport(reportId: string): Promise<void> {
  try {
    await api.delete(`/admin/reports/${reportId}`)
  } catch {
    const { error } = await supabase.from('reports').delete().eq('id', reportId)
    if (error) throw error
  }
}

// ─── 4. Quản lý Kênh Cộng đồng ────────────────────────────────────────────────

export async function getAdminChannels(): Promise<AdminChannel[]> {
  try {
    return await api.get<AdminChannel[]>('/admin/channels')
  } catch {
    const { data, error } = await supabase
      .from('chat_channels')
      .select('*, creator:profiles(id, full_name, email), chat_members(count), community_messages(count)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as AdminChannel[]
  }
}

export async function updateAdminChannel(
  channelId: string,
  updates: { name?: string; description?: string; category?: string; is_global?: boolean; is_archived?: boolean }
): Promise<void> {
  try {
    await api.patch(`/admin/channels/${channelId}`, updates)
  } catch {
    const { error } = await supabase.from('chat_channels').update(updates).eq('id', channelId)
    if (error) throw error
  }
}

export async function deleteAdminChannel(channelId: string): Promise<void> {
  try {
    await api.delete(`/admin/channels/${channelId}`)
  } catch {
    const { error } = await supabase.from('chat_channels').delete().eq('id', channelId)
    if (error) throw error
  }
}

// ─── 5. Phát thông báo toàn hệ thống ──────────────────────────────────────────

export async function sendAdminBroadcast(payload: {
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  link?: string
}): Promise<{ sent_count: number }> {
  try {
    return await api.post<{ sent_count: number }>('/admin/broadcast', payload)
  } catch {
    const { data: users, error: uErr } = await supabase.from('profiles').select('id')
    if (uErr) throw uErr
    if (!users || users.length === 0) return { sent_count: 0 }

    const rows = users.map(u => ({
      user_id: u.id,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      link: payload.link || null,
    }))
    const { error } = await supabase.from('notifications').insert(rows)
    if (error) throw error
    return { sent_count: rows.length }
  }
}

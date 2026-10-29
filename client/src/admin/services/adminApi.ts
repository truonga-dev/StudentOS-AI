/**
 * Admin API client — chỉ dùng trong khu vực /admin.
 * Mọi thao tác đi qua FastAPI backend (service role) để đảm bảo phân quyền + ghi audit log.
 */
import { api } from '@/services/api'
import type { Profile, Report, ChatChannel } from '@/types'

export interface Owner { id: string; email: string; full_name: string | null; avatar_url: string | null }

export interface SystemStats {
  users: { total: number; admins: number; banned: number; new_7d: number }
  academic: {
    subjects: number; tasks: number; completed_tasks: number; notes: number
    flashcards: number; files: number; study_sessions: number; study_minutes: number
  }
  community: { channels: number; messages: number; messages_7d: number; pending_reports: number; total_reports: number }
  recent_users: Profile[]
  top_users: Profile[]
}

export interface AnalyticsPoint { date: string; signups: number; study_minutes: number; messages: number; tasks: number }
export interface Analytics { series: AnalyticsPoint[]; rank_distribution: { name: string; value: number }[] }

export interface UserDetail {
  profile: Profile
  stats: {
    subjects: number; tasks: number; notes: number; flashcards: number; files: number
    messages: number; reports_against: number; study_minutes: number
  }
}

export interface AdminChannel extends Omit<ChatChannel, 'chat_members'> {
  owner?: Owner | null
  chat_members?: { count: number }[]
  community_messages?: { count: number }[]
}

export interface AdminMessage {
  id: string; channel_id: string; user_id: string; content: string
  is_deleted?: boolean; created_at: string; owner?: Owner | null
}

export type ContentType = 'subjects' | 'tasks' | 'notes' | 'flashcards' | 'files'
export interface ContentItem { id: string; user_id: string; created_at?: string; owner?: Owner | null; [k: string]: unknown }

export interface Broadcast {
  id: string; title: string; message: string; type: string; link: string | null
  target: string; sent_count: number; created_at: string
}

export interface AuditLog {
  id: string; admin_id: string | null; admin_email: string | null; action: string
  target_type: string | null; target_id: string | null; details: Record<string, unknown>; created_at: string
}

export type SystemSettings = Record<string, unknown>

const qs = (params: Record<string, string | number | boolean | undefined | null>) => {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'all') p.set(k, String(v))
  })
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const adminApi = {
  me: () => api.get<Profile>('/admin/me'),

  stats: () => api.get<SystemStats>('/admin/stats'),
  analytics: (days = 30) => api.get<Analytics>(`/admin/analytics?days=${days}`),

  users: (f: { search?: string; role?: string; banned?: boolean } = {}) =>
    api.get<Profile[]>(`/admin/users${qs(f)}`),
  user: (id: string) => api.get<UserDetail>(`/admin/users/${id}`),
  updateUser: (id: string, body: Partial<Pick<Profile, 'role' | 'is_banned' | 'xp' | 'points' | 'level' | 'rank_tier' | 'full_name'>>) =>
    api.patch<Profile>(`/admin/users/${id}`, body),
  deleteUser: (id: string) => api.delete<void>(`/admin/users/${id}`),

  reports: (status?: string) => api.get<Report[]>(`/admin/reports${qs({ status })}`),
  resolveReport: (id: string, body: { status: Report['status']; delete_message?: boolean; ban_reported_user?: boolean }) =>
    api.patch(`/admin/reports/${id}`, body),
  deleteReport: (id: string) => api.delete<void>(`/admin/reports/${id}`),

  channels: () => api.get<AdminChannel[]>('/admin/channels'),
  updateChannel: (id: string, body: Partial<Pick<ChatChannel, 'name' | 'description' | 'category' | 'is_global' | 'is_archived'>>) =>
    api.patch(`/admin/channels/${id}`, body),
  deleteChannel: (id: string) => api.delete<void>(`/admin/channels/${id}`),
  messages: (f: { channel_id?: string; search?: string } = {}) =>
    api.get<AdminMessage[]>(`/admin/messages${qs(f)}`),
  deleteMessage: (id: string) => api.delete<void>(`/admin/messages/${id}`),

  content: (type: ContentType, f: { search?: string; user_id?: string } = {}) =>
    api.get<ContentItem[]>(`/admin/content/${type}${qs(f)}`),
  deleteContent: (type: ContentType, id: string) => api.delete<void>(`/admin/content/${type}/${id}`),

  broadcast: (body: { title: string; message: string; type: string; link?: string; target: string }) =>
    api.post<{ sent_count: number }>('/admin/broadcast', body),
  broadcasts: () => api.get<Broadcast[]>('/admin/broadcasts'),

  auditLogs: (action?: string) => api.get<AuditLog[]>(`/admin/audit-logs${qs({ action })}`),

  settings: () => api.get<SystemSettings>('/admin/settings'),
  saveSettings: (settings: SystemSettings) => api.put<SystemSettings>('/admin/settings', { settings }),
}

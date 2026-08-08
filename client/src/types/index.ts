// ─── Database entity types ────────────────────────────────────────────────────

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  points: number
  current_streak: number
  last_study_date: string | null
  xp?: number
  level?: number
  rank_tier?: string
  bio?: string | null
  cover_url?: string | null
  has_completed_onboarding?: boolean
  // Extended profile
  github_url?: string | null
  linkedin_url?: string | null
  school?: string | null
  major?: string | null
  study_year?: number | null
  target_gpa?: number | null
  // Study preferences (stored as JSON in profile or separate columns)
  pref_pomodoro_work?: number | null      // minutes, default 25
  pref_pomodoro_break?: number | null     // minutes, default 5
  pref_daily_goal_hours?: number | null   // default 2
  pref_weekly_goal_days?: number | null   // default 5
  pref_accent_color?: string | null       // hex color
}

export interface Subject {
  id: string
  user_id: string
  title: string
  color: string
  credits: number
  semester: string
  created_at: string
  is_public: boolean
}

export interface Task {
  id: string
  user_id: string
  subject_id: string | null
  title: string
  description: string | null
  due_date: string | null
  priority: 'low' | 'medium' | 'high'
  completed: boolean
  created_at: string
  // Joined từ subjects (khi query với select)
  subjects?: { title: string; color: string } | null
}

export interface Note {
  id: string
  user_id: string
  subject_id: string | null
  title: string
  content: string
  icon?: string | null
  cover_image?: string | null
  created_at: string
  updated_at: string
  // Joined từ subjects
  subjects?: { title: string; color: string } | null
}

// ─── Input types (cho create/update) ─────────────────────────────────────────

export type CreateSubjectInput = Pick<Subject, 'title' | 'color' | 'credits' | 'semester'>
export type UpdateSubjectInput = Partial<CreateSubjectInput> & { is_public?: boolean }

export type CreateTaskInput = Pick<Task, 'title' | 'priority'> & {
  subject_id?: string | null
  description?: string | null
  due_date?: string | null
}
export type UpdateTaskInput = Partial<CreateTaskInput> & { completed?: boolean }

export type CreateNoteInput = Pick<Note, 'title' | 'content' | 'icon' | 'cover_image'> & { subject_id?: string | null }
export type UpdateNoteInput = Partial<CreateNoteInput>

// ─── File ────────────────────────────────────────────────────────────────────

export interface FileRecord {
  id: string
  user_id: string
  subject_id: string | null
  name: string
  file_url: string
  storage_path: string
  size_bytes: number | null
  mime_type: string | null
  created_at: string
  subjects?: { title: string; color: string } | null
}

export type CreateFileInput = Pick<FileRecord, 'name' | 'file_url' | 'storage_path' | 'size_bytes' | 'mime_type'> & {
  subject_id?: string | null
}

// ─── Study Session ────────────────────────────────────────────────────────────

export interface StudySession {
  id: string
  user_id: string
  subject_id: string | null
  duration_minutes: number
  started_at: string
  ended_at: string | null
  notes: string | null
  subjects?: { title: string; color: string } | null
}

export type CreateSessionInput = {
  subject_id?: string | null
  duration_minutes: number
  started_at: string
  ended_at?: string | null
  notes?: string | null
}

// ─── Calendar Event ───────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string
  user_id: string
  subject_id: string | null
  title: string
  room: string | null
  start_time: string
  end_time: string
  recurrence: 'once' | 'weekly' | 'daily'
  color: string
  created_at: string
  subjects?: { title: string; color: string } | null
}

export type CreateEventInput = Pick<CalendarEvent, 'title' | 'start_time' | 'end_time' | 'recurrence' | 'color'> & {
  subject_id?: string | null
  room?: string | null
}
export type UpdateEventInput = Partial<CreateEventInput>

// ─── AI Summary ───────────────────────────────────────────────────────────────

export interface AiSummary {
  id: string
  user_id: string
  note_id: string | null
  summary: string
  model: string
  created_at: string
}

// ─── AI Chat ───────────────────────────────────────────────────────────────────

export interface AiChat {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface AiChatMessage {
  id: string
  chat_id: string
  role: 'user' | 'assistant'
  content: string
  attachments?: any[]
  created_at: string
}

export type CreateAiChatInput = Pick<AiChat, 'title'>
export type CreateAiChatMessageInput = Pick<AiChatMessage, 'chat_id' | 'role' | 'content' | 'attachments'>

// ─── Community Chat ────────────────────────────────────────────────────────────

export interface ChatChannel {
  id: string
  name: string
  description: string | null
  category?: string | null
  logo_url: string | null
  creator_id: string | null
  is_archived: boolean
  invite_code: string | null
  is_global: boolean
  created_at: string
  role?: 'owner' | 'admin' | 'member'
  chat_members?: { user_id: string, profile?: { id: string, full_name: string | null, avatar_url: string | null } }[]
}

export interface ChatMember {
  id: string
  channel_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
  profile?: { id: string, full_name: string | null, avatar_url: string | null, rank_tier: string | null, level: number }
}

export interface Friendship {
  id: string
  user_id_1: string
  user_id_2: string
  status: 'pending' | 'accepted' | 'blocked'
  created_at: string
  profile?: Profile // for display
}

export interface CommunityMessage {
  id: string
  channel_id: string
  user_id: string
  content: string
  attachments: { type: 'image' | 'voice' | 'file', url: string }[] | null
  is_pinned: boolean
  reply_to: string | null
  is_edited?: boolean
  is_deleted?: boolean
  deleted_for_users?: string[]
  reactions?: Record<string, string[]> | null
  created_at: string
  profile?: { id?: string, full_name?: string | null, avatar_url?: string | null, rank_tier?: string | null, level?: number } // Joined
}

export interface Report {
  id: string
  reporter_id: string
  reported_user_id: string | null
  message_id: string | null
  reason: string
  status: 'pending' | 'resolved' | 'dismissed'
  created_at: string
}

// ─── Flashcard ────────────────────────────────────────────────────────────────

export interface Flashcard {
  id: string
  user_id: string
  subject_id: string | null
  question: string
  answer: string
  is_memorized: boolean
  created_at: string
  last_reviewed: string | null
  interval: number
  repetition: number
  ease_factor: number
  next_review_date: string | null
  image_url: string | null
  subjects?: { title: string; color: string } | null
}

export type CreateFlashcardInput = Pick<Flashcard, 'question' | 'answer'> & { subject_id?: string | null; image_url?: string | null }
export type UpdateFlashcardInput = Partial<CreateFlashcardInput> & { 
  is_memorized?: boolean; 
  last_reviewed?: string | null;
  interval?: number;
  repetition?: number;
  ease_factor?: number;
  next_review_date?: string | null;
}

// ─── Weekly chart data ────────────────────────────────────────────────────────

export interface WeeklyData {
  day: string
  hours: number
}

import { backendApi } from '@/services/api'
import type { Note, CreateNoteInput, UpdateNoteInput } from '@/types'

// ── Lấy danh sách notes (kèm tên subject) ────────────────────────────────────
export async function getNotes(): Promise<Note[]> {
  return await backendApi.getNotes() as Note[]
}

// ── Lấy 1 note theo id ────────────────────────────────────────────────────────
export async function getNoteById(id: string): Promise<Note | null> {
  try {
    return await backendApi.getNote(id) as Note
  } catch {
    return null
  }
}

// ── Tạo note mới ─────────────────────────────────────────────────────────────
export async function createNote(input: CreateNoteInput): Promise<Note> {
  return await backendApi.createNote(input) as Note
}

// ── Cập nhật nội dung note ───────────────────────────────────────────────────
export async function updateNote(id: string, input: UpdateNoteInput): Promise<Note> {
  return await backendApi.updateNote(id, input) as Note
}

// ── Xóa note ─────────────────────────────────────────────────────────────────
export async function deleteNote(id: string): Promise<void> {
  await backendApi.deleteNote(id)
}

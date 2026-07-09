import { supabase } from '@/lib/supabase'
import { backendApi } from '@/services/api'
import type { Subject, CreateSubjectInput, UpdateSubjectInput } from '@/types'

// ── Lấy danh sách subjects của user hiện tại ─────────────────────────────────
export async function getSubjects(): Promise<Subject[]> {
  return await backendApi.getSubjects() as Subject[]
}

// ── Tạo subject mới ──────────────────────────────────────────────────────────
export async function createSubject(input: CreateSubjectInput): Promise<Subject> {
  return await backendApi.createSubject(input) as Subject
}

// ── Cập nhật subject ─────────────────────────────────────────────────────────
export async function updateSubject(id: string, input: UpdateSubjectInput): Promise<Subject> {
  return await backendApi.updateSubject(id, input) as Subject
}

// ── Xóa subject ──────────────────────────────────────────────────────────────
export async function deleteSubject(id: string) {
  await backendApi.deleteSubject(id)
}

export async function getPublicSubject(id: string): Promise<Subject> {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('id', id)
    .eq('is_public', true)
    .single()

  if (error) throw error
  return data as Subject
}

export async function getPublicFlashcards(subjectId: string) {
  const { data, error } = await supabase
    .from('flashcards')
    .select('*')
    .eq('subject_id', subjectId)

  if (error) throw error
  return data
}

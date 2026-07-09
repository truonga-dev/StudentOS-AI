import { supabase } from '@/lib/supabase'
import type { Flashcard, CreateFlashcardInput, UpdateFlashcardInput } from '@/types'

export async function getFlashcards() {
  const { data, error } = await supabase
    .from('flashcards')
    .select('*, subjects(title, color)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Flashcard[]
}

export async function createFlashcard(input: CreateFlashcardInput) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('flashcards')
    .insert({ ...input, user_id: user.id })
    .select('*, subjects(title, color)')
    .single()

  if (error) throw error
  return data as Flashcard
}

export async function updateFlashcard(id: string, input: UpdateFlashcardInput) {
  const { data, error } = await supabase
    .from('flashcards')
    .update(input)
    .eq('id', id)
    .select('*, subjects(title, color)')
    .single()

  if (error) throw error
  return data as Flashcard
}

export async function deleteFlashcard(id: string) {
  const { error } = await supabase
    .from('flashcards')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function bulkCreateFlashcards(inputs: CreateFlashcardInput[]) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const items = inputs.map(input => ({ ...input, user_id: user.id }))

  const { data, error } = await supabase
    .from('flashcards')
    .insert(items)
    .select('*, subjects(title, color)')

  if (error) throw error
  return data as Flashcard[]
}

export async function uploadFlashcardImage(file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const BUCKET = import.meta.env.VITE_STORAGE_BUCKET ?? 'student-files'
  const ext = file.name.split('.').pop() ?? 'png'
  const storagePath = `${user.id}/flashcards/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { upsert: true })

  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  return urlData.publicUrl
}

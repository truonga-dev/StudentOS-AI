import { useState, useEffect, useCallback } from 'react'
import * as noteService from '@/services/notes'
import type { Note, CreateNoteInput, UpdateNoteInput } from '@/types'

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await noteService.getNotes()
      setNotes(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lỗi tải ghi chú')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const addNote = useCallback(async (input: CreateNoteInput) => {
    const created = await noteService.createNote(input)
    setNotes(prev => [created, ...prev])
    return created
  }, [])

  const saveNote = useCallback(async (id: string, input: UpdateNoteInput) => {
    const updated = await noteService.updateNote(id, input)
    setNotes(prev => prev.map(n => n.id === id ? updated : n))
    return updated
  }, [])

  const removeNote = useCallback(async (id: string) => {
    await noteService.deleteNote(id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }, [])

  return { notes, loading, error, addNote, saveNote, removeNote, refresh: load }
}

import { useState, useEffect, useCallback } from 'react'
import * as subjectService from '@/services/subjects'
import type { Subject, CreateSubjectInput, UpdateSubjectInput } from '@/types'

export function useSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await subjectService.getSubjects()
      setSubjects(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lỗi tải môn học')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const addSubject = useCallback(async (input: CreateSubjectInput) => {
    const created = await subjectService.createSubject(input)
    setSubjects(prev => [...prev, created])
    return created
  }, [])

  const editSubject = useCallback(async (id: string, input: UpdateSubjectInput) => {
    const updated = await subjectService.updateSubject(id, input)
    setSubjects(prev => prev.map(s => s.id === id ? updated : s))
    return updated
  }, [])

  const removeSubject = useCallback(async (id: string) => {
    await subjectService.deleteSubject(id)
    setSubjects(prev => prev.filter(s => s.id !== id))
  }, [])

  return { subjects, loading, error, addSubject, editSubject, removeSubject, refresh: load }
}

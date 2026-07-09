import { useState, useEffect, useCallback } from 'react'
import * as gpaService from '@/services/gpa'
import type { Grade, GPASummary } from '@/services/gpa'

export function useGPA() {
  const [summary, setSummary] = useState<GPASummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await gpaService.getGPASummary()
      setSummary(data)
    } catch (err: any) {
      setError(err.message || 'Lỗi tải dữ liệu GPA')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { summary, loading, error, refresh: load }
}

export function useGrades(subjectId?: string) {
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await gpaService.getGrades(subjectId)
      setGrades(data)
    } catch (e) {
      console.error('Failed to load grades', e)
    } finally {
      setLoading(false)
    }
  }, [subjectId])

  useEffect(() => {
    load()
  }, [load])

  const addGrade = async (data: any) => {
    const created = await gpaService.createGrade(data)
    setGrades(prev => [created, ...prev])
    return created
  }

  const removeGrade = async (id: string) => {
    await gpaService.deleteGrade(id)
    setGrades(prev => prev.filter(g => g.id !== id))
  }

  return { grades, loading, addGrade, removeGrade, refresh: load }
}

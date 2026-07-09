import { supabase } from '@/lib/supabase'

export interface Grade {
  id: string
  subject_id: string
  title: string
  score: number
  weight: number
  date: string
  created_at: string
}

export interface GPASummary {
  gpa_10: number
  gpa_4: number
  total_credits: number
  subjects: {
    subject_id: string
    title: string
    semester: string
    credits: number
    average_10: number
    gpa_4: number
    status: 'pass' | 'fail' | 'none'
    has_grades?: boolean
  }[]
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Chưa đăng nhập')

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      ...options.headers,
    }
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Lỗi server')
  }

  if (res.status === 204) return null
  return res.json()
}

export async function getGrades(subjectId?: string): Promise<Grade[]> {
  const query = subjectId ? `?subject_id=${subjectId}` : ''
  return fetchWithAuth(`/gpa/grades${query}`)
}

export async function createGrade(data: Omit<Grade, 'id' | 'created_at' | 'date'> & { date?: string }): Promise<Grade> {
  return fetchWithAuth('/gpa/grades', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export async function deleteGrade(id: string): Promise<void> {
  await fetchWithAuth(`/gpa/grades/${id}`, {
    method: 'DELETE'
  })
}

export async function getGPASummary(): Promise<GPASummary> {
  return fetchWithAuth('/gpa/summary')
}

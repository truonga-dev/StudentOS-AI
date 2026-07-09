/**
 * HTTP client cho FastAPI backend.
 * Tự động đính kèm Supabase JWT token vào mỗi request.
 *
 * Dùng khi cần:
 *  - AI features (summarize, generate, recommend)
 *  - Business logic phức tạp không phù hợp cho client-side
 *  - File processing
 *
 * Cho CRUD cơ bản (subjects/tasks/notes) → dùng src/services/*.ts trực tiếp.
 */
import { supabase } from '@/lib/supabase'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Chưa đăng nhập')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? `HTTP ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

// ── Convenience methods ──────────────────────────────────────────────────────
export const api = {
  get:    <T>(path: string)                  => request<T>('GET', path),
  post:   <T>(path: string, body: unknown)   => request<T>('POST', path, body),
  patch:  <T>(path: string, body: unknown)   => request<T>('PATCH', path, body),
  delete: <T>(path: string)                  => request<T>('DELETE', path),
}

// ── Typed API calls (cho FastAPI routes) ────────────────────────────────────
export const backendApi = {
  // Subjects
  getSubjects:    () => api.get('/subjects/'),
  createSubject:  (b: unknown) => api.post('/subjects/', b),
  updateSubject:  (id: string, b: unknown) => api.patch(`/subjects/${id}`, b),
  deleteSubject:  (id: string) => api.delete(`/subjects/${id}`),

  // Tasks
  getTasks:       (completed?: boolean) =>
    api.get(`/tasks/${completed !== undefined ? `?completed=${completed}` : ''}`),
  getUpcoming:    (limit = 5) => api.get(`/tasks/upcoming?limit=${limit}`),
  createTask:     (b: unknown) => api.post('/tasks/', b),
  updateTask:     (id: string, b: unknown) => api.patch(`/tasks/${id}`, b),
  deleteTask:     (id: string) => api.delete(`/tasks/${id}`),

  // Notes
  getNotes:       () => api.get('/notes/'),
  getNote:        (id: string) => api.get(`/notes/${id}`),
  createNote:     (b: unknown) => api.post('/notes/', b),
  updateNote:     (id: string, b: unknown) => api.patch(`/notes/${id}`, b),
  deleteNote:     (id: string) => api.delete(`/notes/${id}`),
}

import { supabase } from '@/lib/supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

async function fetchWithAuth(endpoint: string, body: any) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Chưa đăng nhập')

  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'Lỗi server')
  }

  return res.json()
}

export async function summarizeText(text: string): Promise<string> {
  const data = await fetchWithAuth('/ai/summarize', { text })
  return data.summary
}

export async function suggestTasks(text: string): Promise<string> {
  const data = await fetchWithAuth('/ai/suggest-tasks', { text })
  return data.tasks
}

export async function breakdownTask(text: string): Promise<string> {
  const data = await fetchWithAuth('/ai/breakdown-task', { text })
  return data.subtasks
}

export async function chatWithAIStream(
  messages: { role: string, content: string, attachments?: any[] }[],
  modelProvider: 'gemini' | 'groq' | 'groq-deepseek' = 'gemini'
): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession()
  
  const response = await fetch(`${API_URL}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {})
    },
    body: JSON.stringify({ messages, model_provider: modelProvider })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(errorData?.detail || 'API request failed')
  }

  return response
}

export async function generateFlashcardsFromImage(base64: string, mimeType: string = 'image/jpeg'): Promise<{ question: string, answer: string }[]> {
  const data = await fetchWithAuth('/ai/generate-flashcards', { 
    image_base64: base64,
    mime_type: mimeType
  })
  return data.flashcards
}

export async function generateFlashcardsFromText(text: string): Promise<{ question: string, answer: string }[]> {
  const data = await fetchWithAuth('/ai/generate-flashcards-from-text', { text })
  return data.flashcards
}

export async function generateFlashcardsFromDocument(fileNames: string[]): Promise<{ question: string, answer: string }[]> {
  const data = await fetchWithAuth('/ai/generate-flashcards-from-document', { file_names: fileNames })
  return data.flashcards
}

export async function generateQuiz(text: string): Promise<{ question: string, options: string[], correct_index: number, explanation: string }[]> {
  const data = await fetchWithAuth('/ai/generate-quiz', { text })
  return data.quiz
}

export async function generateMindmap(text: string): Promise<string> {
  const data = await fetchWithAuth('/ai/generate-mindmap', { text })
  return data.mindmap
}

export async function chatWithDocumentsStream(messages: { role: string, content: string }[], fileNames?: string[]): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession()
  
  const response = await fetch(`${API_URL}/files/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {})
    },
    body: JSON.stringify({ messages, file_names: fileNames })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(errorData?.detail || 'API request failed')
  }

  return response
}

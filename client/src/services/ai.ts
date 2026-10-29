import { supabase } from '@/lib/supabase'
import promptsConfig from '@/config/prompts.json'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || ''
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions'

export const AI_PROMPTS_CONFIG = promptsConfig
const CHAT_SYSTEM_PROMPT = promptsConfig.prompts.chat_assistant.system_prompt
const FAST_MODEL = promptsConfig.metadata.models.fast_stream
const REASONING_MODEL = promptsConfig.metadata.models.deep_reasoning

function renderPromptTemplate(
  template: string,
  vars: Record<string, string | number>
): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.split(`{${key}}`).join(String(value))
  }
  return result
}

// ─── Direct Groq Fallback Helpers (khi Backend Server đang sleep hoặc lỗi) ────

async function callGroqDirectText(
  prompt: string,
  systemPrompt = CHAT_SYSTEM_PROMPT,
  model = FAST_MODEL
): Promise<string> {
  const res = await fetch(GROQ_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => null)
    throw new Error(err?.error?.message || 'Lỗi kết nối AI')
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

function extractJsonString(text: string): string {
  const trimmed = text.trim()
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (match) return match[1].trim()
  const firstBracket = trimmed.indexOf('[')
  const lastBracket = trimmed.lastIndexOf(']')
  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    return trimmed.slice(firstBracket, lastBracket + 1)
  }
  if (firstBrace !== -1) {
    return trimmed.slice(firstBrace, lastBrace + 1)
  }
  return trimmed
}

async function createDirectGroqStreamResponse(
  messages: { role: string; content: string }[],
  modelProvider: 'gemini' | 'groq' | 'groq-deepseek',
  customSystemPrompt = CHAT_SYSTEM_PROMPT
): Promise<Response> {
  const groqModel = modelProvider === 'groq-deepseek' ? REASONING_MODEL : FAST_MODEL
  const defaultVisionPrompt =
    promptsConfig.prompts.chat_assistant.vision_default_user_prompt

  const groqRes = await fetch(GROQ_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: groqModel,
      messages: [
        {
          role: 'system',
          content: customSystemPrompt,
        },
        ...messages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content || defaultVisionPrompt,
        })),
      ],
      stream: true,
    }),
  })

  if (!groqRes.ok || !groqRes.body) {
    const err = await groqRes.json().catch(() => null)
    throw new Error(err?.error?.message || 'Không thể kết nối AI')
  }

  const reader = groqRes.body.getReader()
  const decoder = new TextDecoder('utf-8')
  const encoder = new TextEncoder()

  const plainStream = new ReadableStream({
    async start(controller) {
      let buffer = ''
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const dataStr = trimmed.slice(5).trim()
            if (dataStr === '[DONE]') continue
            try {
              const parsed = JSON.parse(dataStr)
              const delta = parsed.choices?.[0]?.delta?.content
              if (delta) {
                controller.enqueue(encoder.encode(delta))
              }
            } catch {
              // ignore partial JSON chunk
            }
          }
        }
      } catch (e) {
        console.error('Stream parse error:', e)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(plainStream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

// ─── Backend Fetch Helper (có Timeout để không bị treo) ───────────────────────

async function fetchWithAuth(endpoint: string, body: any, timeoutMs = 6000) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Chưa đăng nhập')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Lỗi server')
    }

    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

// ─── Public AI Functions (Sử dụng bộ Prompt JSON của dự án) ──────────────────

export async function summarizeText(text: string): Promise<string> {
  try {
    const data = await fetchWithAuth('/ai/summarize', { text })
    return data.summary
  } catch {
    const section = promptsConfig.prompts.summarize_note
    return await callGroqDirectText(
      renderPromptTemplate(section.user_template, { text }),
      section.system_prompt
    )
  }
}

export async function suggestTasks(text: string): Promise<string> {
  try {
    const data = await fetchWithAuth('/ai/suggest-tasks', { text })
    return data.tasks
  } catch {
    const section = promptsConfig.prompts.suggest_tasks
    return await callGroqDirectText(
      renderPromptTemplate(section.user_template, { text }),
      section.system_prompt
    )
  }
}

export async function breakdownTask(text: string): Promise<string> {
  try {
    const data = await fetchWithAuth('/ai/breakdown-task', { text })
    return data.subtasks
  } catch {
    const section = promptsConfig.prompts.breakdown_task
    return await callGroqDirectText(
      renderPromptTemplate(section.user_template, { text }),
      section.system_prompt
    )
  }
}

export async function chatWithAIStream(
  messages: { role: string; content: string; attachments?: any[] }[],
  modelProvider: 'gemini' | 'groq' | 'groq-deepseek' = 'gemini'
): Promise<Response> {
  const hasImage = messages.some(m => m.attachments && m.attachments.length > 0)
  if (!hasImage && GROQ_API_KEY) {
    try {
      return await createDirectGroqStreamResponse(messages, modelProvider)
    } catch (directErr) {
      console.warn('Direct Groq stream failed, trying backend...', directErr)
    }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()
  const response = await fetch(`${API_URL}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ messages, model_provider: modelProvider }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(errorData?.detail || 'API request failed')
  }

  return response
}

export async function generateFlashcardsFromImage(
  base64: string,
  mimeType: string = 'image/jpeg'
): Promise<{ question: string; answer: string }[]> {
  const data = await fetchWithAuth(
    '/ai/generate-flashcards',
    {
      image_base64: base64,
      mime_type: mimeType,
    },
    20000
  )
  return data.flashcards
}

export async function generateFlashcardsFromText(
  text: string
): Promise<{ question: string; answer: string }[]> {
  try {
    const data = await fetchWithAuth('/ai/generate-flashcards-from-text', { text })
    return data.flashcards
  } catch {
    const section = promptsConfig.prompts.generate_flashcards_text
    const raw = await callGroqDirectText(
      renderPromptTemplate(section.user_template, { text }),
      section.system_prompt
    )
    const parsed = JSON.parse(extractJsonString(raw))
    return Array.isArray(parsed) ? parsed : parsed.flashcards || []
  }
}

export async function generateFlashcardsFromDocument(
  fileNames: string[]
): Promise<{ question: string; answer: string }[]> {
  const data = await fetchWithAuth(
    '/ai/generate-flashcards-from-document',
    { file_names: fileNames },
    15000
  )
  return data.flashcards
}

export async function generateQuiz(
  text: string
): Promise<
  { question: string; options: string[]; correct_index: number; explanation: string }[]
> {
  try {
    const data = await fetchWithAuth('/ai/generate-quiz', { text })
    return data.quiz
  } catch {
    const section = promptsConfig.prompts.generate_quiz
    const raw = await callGroqDirectText(
      renderPromptTemplate(section.user_template, { text }),
      section.system_prompt
    )
    const parsed = JSON.parse(extractJsonString(raw))
    return Array.isArray(parsed) ? parsed : parsed.quiz || []
  }
}

export async function generateMindmap(text: string): Promise<string> {
  try {
    const data = await fetchWithAuth('/ai/generate-mindmap', { text })
    return data.mindmap
  } catch {
    const section = promptsConfig.prompts.generate_mindmap
    const raw = await callGroqDirectText(
      renderPromptTemplate(section.user_template, { text }),
      section.system_prompt
    )
    return raw.replace(/```mermaid/g, '').replace(/```/g, '').trim()
  }
}

export async function chatWithDocumentsStream(
  messages: { role: string; content: string }[],
  fileNames?: string[]
): Promise<Response> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const response = await fetch(`${API_URL}/files/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ messages, file_names: fileNames }),
    })

    if (!response.ok) {
      throw new Error('Backend RAG error')
    }
    return response
  } catch {
    return await createDirectGroqStreamResponse(messages, 'groq')
  }
}

export async function generateMockTest(
  topic: string,
  numMultipleChoice = 5,
  numEssay = 1
): Promise<{
  multiple_choice: { question: string; options: string[]; correct_answer: number }[]
  essay: string[]
}> {
  try {
    return await fetchWithAuth(
      '/ai/generate-mock-test',
      {
        topic,
        num_multiple_choice: numMultipleChoice,
        num_essay: numEssay,
      },
      10000
    )
  } catch {
    const section = promptsConfig.prompts.generate_mock_test
    const raw = await callGroqDirectText(
      renderPromptTemplate(section.user_template, {
        topic,
        num_multiple_choice: numMultipleChoice,
        num_essay: numEssay,
      }),
      section.system_prompt
    )
    const parsed = JSON.parse(extractJsonString(raw))
    return {
      multiple_choice: Array.isArray(parsed.multiple_choice)
        ? parsed.multiple_choice
        : [],
      essay: Array.isArray(parsed.essay) ? parsed.essay : [],
    }
  }
}

export async function gradeEssay(
  question: string,
  studentAnswer: string
): Promise<{ score: number; feedback: string }> {
  try {
    return await fetchWithAuth(
      '/ai/grade-essay',
      {
        question,
        student_answer: studentAnswer,
      },
      10000
    )
  } catch {
    const section = promptsConfig.prompts.grade_essay
    const raw = await callGroqDirectText(
      renderPromptTemplate(section.user_template, {
        question,
        student_answer: studentAnswer,
      }),
      section.system_prompt
    )
    const parsed = JSON.parse(extractJsonString(raw))
    return {
      score: typeof parsed.score === 'number' ? parsed.score : 0,
      feedback: parsed.feedback || 'Đã chấm điểm.',
    }
  }
}

export async function generateWeeklyReport(
  weekStart: string,
  weekEnd: string,
  userPrompt?: string
): Promise<string> {
  try {
    const data = await fetchWithAuth(
      '/ai/generate-weekly-report',
      {
        week_start: weekStart,
        week_end: weekEnd,
      },
      8000
    )
    return data.content
  } catch {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    let completedTasks = 0
    let pendingTasks = 0
    let totalPomodoroMins = 0

    if (user) {
      const [{ data: tasks }, { data: pomodoros }] = await Promise.all([
        supabase
          .from('tasks')
          .select('title, status, priority')
          .eq('user_id', user.id)
          .limit(20),
        supabase
          .from('pomodoro_sessions')
          .select('duration, completed')
          .eq('user_id', user.id)
          .eq('completed', true)
          .gte('started_at', weekStart),
      ])
      completedTasks = (tasks || []).filter(t => t.status === 'done').length
      pendingTasks = (tasks || []).filter(t => t.status !== 'done').length
      totalPomodoroMins = (pomodoros || []).reduce(
        (acc, s) => acc + (s.duration || 0),
        0
      )
    }

    const section = promptsConfig.prompts.weekly_advisor_report
    const html = await callGroqDirectText(
      renderPromptTemplate(section.user_template, {
        total_study_minutes: totalPomodoroMins,
        completed_tasks_count: completedTasks,
        pending_tasks_count: pendingTasks,
        user_prompt:
          userPrompt ||
          'Phân tích kết quả học tập tuần này và đưa ra lời khuyên ưu tiên.',
      }),
      section.system_prompt
    )

    const cleanHtml = html.replace(/```html/g, '').replace(/```/g, '').trim()
    if (user) {
      await supabase
        .from('ai_reports')
        .insert({
          user_id: user.id,
          week_start: weekStart,
          week_end: weekEnd,
          content: cleanHtml,
        })
        .then(() => {})
    }
    return cleanHtml
  }
}

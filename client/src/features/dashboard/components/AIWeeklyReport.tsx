import { useState, useEffect, useRef } from 'react'
import { Sparkles, Loader2, Bot, Send, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { clsx } from 'clsx'
import DOMPurify from 'dompurify'

export function AIWeeklyReport() {
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([])
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Fetch report only once on mount to act as initial AI greeting
  useEffect(() => {
    const fetchLatest = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data } = await supabase
        .from('ai_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
        
      if (data) {
        setMessages([{ role: 'ai', text: data.content }])
      } else {
        setMessages([{ role: 'ai', text: 'Chào bạn! Mình là AI Cố vấn học tập. Bạn muốn mình phân tích kết quả tuần này hay lên kế hoạch học tập?' }])
      }
    }
    fetchLatest()
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const generateReport = async (prompt?: string) => {
    const userPrompt = prompt || input.trim()
    if (!userPrompt) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userPrompt }])
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("Chưa đăng nhập")

      // This would ideally hit a chat endpoint. Using generate-weekly-report for now
      // but in a real upgrade you'd have an /ai/chat endpoint.
      const today = new Date()
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay() + 1)
      startOfWeek.setHours(0, 0, 0, 0)
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/ai/generate-weekly-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          week_start: startOfWeek.toISOString(),
          week_end: new Date().toISOString()
        })
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.detail || 'Lỗi khi gọi AI')

      setMessages(prev => [...prev, { role: 'ai', text: result.content }])
    } catch (error: any) {
      toast.error(error.message || 'Có lỗi xảy ra')
      setMessages(prev => [...prev, { role: 'ai', text: 'Xin lỗi, mình đang gặp sự cố kết nối. Bạn thử lại sau nhé!' }])
    } finally {
      setLoading(false)
    }
  }

  const QUICK_PROMPTS = [
    '📊 Phân tích tuần này',
    '🎯 Tôi nên ưu tiên gì?',
  ]

  return (
    <div className="card flex flex-col h-[400px]">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-surface-100 dark:border-surface-800 shrink-0">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-500 to-accent-500 flex items-center justify-center text-white shadow-glow-sm">
          <Bot className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-surface-900 dark:text-white leading-tight">AI Cố vấn</h3>
          <p className="text-[10px] text-primary-500 font-medium">Trực tuyến</p>
        </div>
      </div>
      
      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {messages.map((msg, i) => (
          <div key={i} className={clsx('flex gap-2 max-w-[90%]', msg.role === 'user' ? 'ml-auto flex-row-reverse' : '')}>
            {msg.role === 'ai' && (
              <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center shrink-0 mt-1">
                <Sparkles className="w-3 h-3 text-primary-500" />
              </div>
            )}
            <div className={clsx(
              'p-3 rounded-2xl text-sm',
              msg.role === 'user' 
                ? 'bg-primary-500 text-white rounded-tr-sm' 
                : 'bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200 rounded-tl-sm prose prose-sm dark:prose-invert max-w-none'
            )}>
              {msg.role === 'ai' ? (
                <div 
                  className="[&_div]:!bg-transparent [&_div]:!shadow-none [&_div]:!p-0 [&_div]:!m-0 [&_div]:!border-none [&_*]:!text-inherit"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.text) }} 
                />
              ) : (
                msg.text
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center shrink-0">
              <Loader2 className="w-3 h-3 text-primary-500 animate-spin" />
            </div>
            <div className="bg-surface-100 dark:bg-surface-800 p-3 rounded-2xl rounded-tl-sm">
              <div className="flex gap-1.5 items-center h-4">
                <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
          {QUICK_PROMPTS.map(p => (
            <button key={p} onClick={() => generateReport(p)} disabled={loading}
              className="shrink-0 px-3 py-1.5 rounded-full border border-surface-200 dark:border-surface-700 text-xs text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors whitespace-nowrap">
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 border-t border-surface-100 dark:border-surface-800 shrink-0 bg-surface-50/50 dark:bg-surface-900/50 rounded-b-2xl">
        <form onSubmit={e => { e.preventDefault(); generateReport() }} className="relative flex items-center">
          <MessageSquare className="w-4 h-4 text-surface-400 absolute left-3" />
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Hỏi AI tư vấn..."
            className="w-full bg-white dark:bg-surface-800 border-none rounded-xl pl-9 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/50"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 w-7 h-7 flex items-center justify-center rounded-lg bg-primary-500 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-600 transition-colors"
          >
            <Send className="w-3 h-3" />
          </button>
        </form>
      </div>
    </div>
  )
}

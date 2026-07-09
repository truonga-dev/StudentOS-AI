import { useState, useRef, useEffect } from 'react'
import { Send, X, Loader2, Bot, User, FileText } from 'lucide-react'
import { clsx } from 'clsx'
import { chatWithDocumentsStream } from '@/services/ai'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function DocumentChat({ onClose, files = [] }: { onClose: () => void, files?: Array<{id?: string, name: string}> }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Chào bạn! Mình có thể giải đáp các câu hỏi dựa trên nội dung các tài liệu PDF bạn đã tải lên. Bạn muốn hỏi gì nào?'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    // Add temporary assistant message
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const response = await chatWithDocumentsStream(
        [...messages, userMessage], 
        selectedFileNames.length > 0 ? selectedFileNames : undefined
      )
      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let done = false

      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        if (value) {
          const chunkValue = decoder.decode(value, { stream: true })
          setMessages(prev => {
            const last = prev[prev.length - 1]
            return [
              ...prev.slice(0, -1),
              { ...last, content: last.content + chunkValue }
            ]
          })
        }
      }
    } catch (error: any) {
      console.error(error)
      const errorMsg = error.message || 'Xin lỗi, đã có lỗi xảy ra. Hãy thử lại.'
      setMessages(prev => {
        const last = prev[prev.length - 1]
        return [
          ...prev.slice(0, -1),
          { ...last, content: last.content || errorMsg }
        ]
      })
    } finally {
      setLoading(false)
    }
  }

  // Loại bỏ các file trùng tên để filter gọn hơn (tùy chọn)
  const uniqueFiles = Array.from(new Map(files.map(f => [f.name, f])).values())

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-white dark:bg-surface-900 border-l border-surface-200 dark:border-surface-800 shadow-2xl flex flex-col z-50 animate-slide-up sm:animate-slide-left">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-800 bg-surface-50/80 dark:bg-surface-900/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-500 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-surface-900 dark:text-white">Chat với Tài liệu</h3>
            <p className="text-xs text-surface-500">AI sẽ trả lời dựa trên các PDF của bạn</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* File Selector */}
      {uniqueFiles.length > 0 && (
        <div className="px-4 py-3 bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-800">
          <div className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">
            Lọc tài liệu để chat (mặc định chat với tất cả)
          </div>
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto custom-scrollbar">
            {uniqueFiles.map(f => (
              <button
                key={f.id || f.name}
                onClick={() => {
                  if (selectedFileNames.includes(f.name)) {
                    setSelectedFileNames(prev => prev.filter(name => name !== f.name))
                  } else {
                    setSelectedFileNames(prev => [...prev, f.name])
                  }
                }}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-xs transition-colors border max-w-full truncate',
                  selectedFileNames.includes(f.name)
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800'
                )}
                title={f.name}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={clsx(
              'flex gap-3 max-w-[85%]',
              msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
            )}
          >
            <div
              className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                msg.role === 'user'
                  ? 'bg-primary-500 text-white'
                  : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
              )}
            >
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div
              className={clsx(
                'rounded-2xl px-4 py-2.5 text-sm prose prose-sm dark:prose-invert max-w-none',
                msg.role === 'user'
                  ? 'bg-primary-500 text-white prose-p:text-white prose-a:text-white'
                  : 'bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-surface-100'
              )}
            >
              {msg.content ? (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              ) : (
                <div className="flex items-center gap-1 h-5">
                  <div className="w-1.5 h-1.5 bg-surface-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-surface-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-surface-400 rounded-full animate-bounce" />
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900">
        <div className="flex items-end gap-2 bg-surface-50 dark:bg-surface-800 p-2 rounded-2xl border border-surface-200 dark:border-surface-700 focus-within:border-primary-500 dark:focus-within:border-primary-500 transition-colors">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Hỏi về tài liệu của bạn..."
            className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[40px] text-sm py-2 px-2 text-surface-900 dark:text-white placeholder:text-surface-400"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-xl bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 disabled:hover:bg-primary-500 transition-colors shrink-0 mb-0.5"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}

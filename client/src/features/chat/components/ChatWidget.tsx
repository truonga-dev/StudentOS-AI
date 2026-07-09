import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, Maximize2, Sparkles, ChevronDown, EyeOff } from 'lucide-react'
import { clsx } from 'clsx'
import { useAiChat } from '@/hooks/useAiChat'
import { getChatMessages, createChatMessage } from '@/services/aiChat'
import { chatWithAIStream } from '@/services/ai'
import type { AiChat, AiChatMessage } from '@/types'
import toast from 'react-hot-toast'
import { MarkdownMessage } from '@/components/ui/MarkdownMessage'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isHidden, setIsHidden] = useState(false)
  const { chats, addChat } = useAiChat()
  const [activeChat, setActiveChat] = useState<AiChat | null>(null)
  const [messages, setMessages] = useState<AiChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Chọn chat gần nhất hoặc tạo mới khi mở widget
  useEffect(() => {
    if (isOpen && !activeChat) {
      if (chats.length > 0) {
        setActiveChat(chats[0])
        loadMessages(chats[0].id)
      } else {
        // Tự tạo chat mới
        addChat('Trợ lý AI nhanh').then(newChat => setActiveChat(newChat))
      }
    }
  }, [isOpen, chats, activeChat])

  // Tự động cuộn xuống khi có tin nhắn
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  const loadMessages = async (chatId: string) => {
    try {
      const data = await getChatMessages(chatId)
      setMessages(data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!inputValue.trim() || isSending || !activeChat) return

    const userText = inputValue.trim()
    setInputValue('')
    setIsSending(true)

    try {
      const userMsg = await createChatMessage({
        chat_id: activeChat.id,
        role: 'user',
        content: userText,
      })
      setMessages(prev => [...prev, userMsg])

      const historyForAi = messages.map(m => ({ role: m.role, content: m.content }))
      historyForAi.push({ role: 'user', content: userText })

      const response = await chatWithAIStream(historyForAi, 'gemini')
      const reader = response.body?.getReader()
      if (!reader) throw new Error('Không thể đọc dữ liệu')
      
      const decoder = new TextDecoder('utf-8')
      let aiResponseText = ''
      const tempAiMsgId = 'temp-' + Date.now()
      
      setStreamingMessageId(tempAiMsgId)
      setMessages(prev => [...prev, {
        id: tempAiMsgId,
        chat_id: activeChat.id,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString()
      }])
      
      setIsSending(false)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        aiResponseText += chunk
        
        setMessages(prev => prev.map(m => 
          m.id === tempAiMsgId ? { ...m, content: aiResponseText } : m
        ))
      }

      const savedAiMsg = await createChatMessage({
        chat_id: activeChat.id,
        role: 'assistant',
        content: aiResponseText
      })
      
      setStreamingMessageId(null)
      setMessages(prev => prev.map(m => m.id === tempAiMsgId ? savedAiMsg : m))

    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi gửi tin nhắn')
      setIsSending(false)
      setStreamingMessageId(null)
    }
  }

  if (isHidden) return null

  return (
    <motion.div 
      drag 
      dragConstraints={{ left: -window.innerWidth + 100, right: 0, top: -window.innerHeight + 100, bottom: 0 }}
      dragMomentum={false}
      className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-4"
      style={{ touchAction: 'none' }}
    >
      {/* Panel Chat Widget */}
      <div 
        className={clsx(
          "w-[380px] h-[550px] bg-white dark:bg-surface-900 rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-700 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right",
          isOpen ? "scale-100 opacity-100" : "scale-50 opacity-0 pointer-events-none hidden"
        )}
      >
        {/* Header */}
        <div className="bg-gradient-brand p-4 text-white flex items-center justify-between shrink-0 cursor-move">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center pointer-events-none">
              <Bot className="w-5 h-5" />
            </div>
            <div className="pointer-events-none">
              <h3 className="font-bold text-sm leading-tight">Student OS AI</h3>
              <p className="text-xs text-white/70">Sẵn sàng hỗ trợ học tập</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsHidden(true)}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              title="Ẩn hoàn toàn chatbot"
            >
              <EyeOff className="w-4 h-4" />
            </button>
            <button 
              onClick={() => {
                setIsOpen(false)
                navigate('/chat')
              }}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              title="Mở toàn màn hình"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-surface-50 dark:bg-surface-950/50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-surface-400 gap-2">
              <Sparkles className="w-10 h-10 text-primary-500/50" />
              <p className="font-medium text-sm">Hôm nay bạn muốn hỏi gì?</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={clsx("flex gap-2 max-w-[85%]", msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto')}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-gradient-brand text-white flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-3 h-3" />
                  </div>
                )}
                <div className={clsx(
                  "p-3 rounded-2xl text-[13px] leading-relaxed shadow-sm overflow-hidden",
                  msg.role === 'user'
                    ? 'bg-primary-500 text-white rounded-tr-sm'
                    : 'bg-white dark:bg-surface-800 text-surface-800 dark:text-surface-200 border border-surface-200 dark:border-surface-700 rounded-tl-sm'
                )}>
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <>
                      <MarkdownMessage content={msg.content} />
                      {streamingMessageId === msg.id && (
                        <span className="inline-block w-1.5 h-3 bg-primary-500 animate-pulse ml-1 align-middle" />
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
          {isSending && (
            <div className="flex gap-2 max-w-[85%] mr-auto">
              <div className="w-6 h-6 rounded-full bg-gradient-brand text-white flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-3 h-3" />
              </div>
              <div className="p-3 rounded-2xl bg-white dark:bg-surface-800 text-surface-800 dark:text-surface-200 border border-surface-200 dark:border-surface-700 rounded-tl-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 bg-white dark:bg-surface-900 border-t border-surface-200 dark:border-surface-700 shrink-0">
          <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
            <input
              type="text"
              placeholder="Nhập tin nhắn..."
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              className="flex-1 bg-surface-100 dark:bg-surface-800 border-none rounded-xl py-2.5 pl-3 pr-10 text-sm focus:ring-2 focus:ring-primary-500/20 outline-none"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isSending}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-primary-500 hover:text-primary-600 disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Nút bấm nổi */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "w-14 h-14 rounded-full flex items-center justify-center text-white shadow-glow hover:scale-105 transition-all duration-300",
          isOpen ? "bg-surface-800 rotate-90 scale-90 cursor-move" : "bg-gradient-brand animate-pulse-glow cursor-move"
        )}
      >
        {isOpen ? <ChevronDown className="w-6 h-6 -rotate-90 pointer-events-none" /> : <Bot className="w-7 h-7 pointer-events-none" />}
      </button>
    </motion.div>
  )
}

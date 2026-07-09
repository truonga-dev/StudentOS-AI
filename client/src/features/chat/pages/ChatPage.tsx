import { useState, useEffect, useRef } from 'react'
import { Sparkles, MessageSquare, Send, Plus, Trash2, Loader2, Bot, Paperclip, X, Image as ImageIcon, Mic, MicOff, Copy, Edit2, RotateCw, ThumbsUp, ThumbsDown, Check } from 'lucide-react'
import { clsx } from 'clsx'
import { useAiChat } from '@/hooks/useAiChat'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { getChatMessages, createChatMessage } from '@/services/aiChat'
import { chatWithAIStream } from '@/services/ai'
import type { AiChat, AiChatMessage } from '@/types'
import toast from 'react-hot-toast'
import { MarkdownMessage } from '@/components/ui/MarkdownMessage'

export function ChatPage() {
  const { chats, loadingChats, addChat, removeChat, renameChat } = useAiChat()
  const { user } = useAuth()
  const { profile } = useProfile()
  
  const [selectedChat, setSelectedChat] = useState<AiChat | null>(null)
  const [messages, setMessages] = useState<AiChatMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<{ type: string, data: string, url: string }[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [editingChatId, setEditingChatId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [selectedModelProvider, setSelectedModelProvider] = useState<'gemini' | 'groq' | 'groq-deepseek'>('gemini')
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'User'
  const initials = displayName.slice(0, 1).toUpperCase()

  // Tự động cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  // Tự động điều chỉnh chiều cao của textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 128) + 'px' // max 128px (h-32)
    }
  }, [inputValue])

  // Lấy danh sách tin nhắn khi chọn chat
  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.id)
    } else {
      setMessages([])
    }
  }, [selectedChat])

  // Nếu chưa có chat nào được chọn mà danh sách chats có sẵn, tự động chọn cái đầu tiên
  useEffect(() => {
    if (chats.length > 0 && !selectedChat) {
      setSelectedChat(chats[0])
    }
  }, [chats, selectedChat])

  const loadMessages = async (chatId: string) => {
    setLoadingMessages(true)
    try {
      const data = await getChatMessages(chatId)
      setMessages(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleNewChat = async () => {
    try {
      const chat = await addChat('Đoạn chat mới')
      setSelectedChat(chat)
    } catch (err) {
      console.error(err)
    }
  }

  // Khởi tạo SpeechRecognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = 'vi-VN' // Default to Vietnamese

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          }
        }
        if (finalTranscript) {
          setInputValue(prev => prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + finalTranscript)
        }
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error)
        setIsRecording(false)
        if (event.error === 'not-allowed') {
          toast.error('Vui lòng cấp quyền sử dụng microphone')
        }
      }

      recognitionRef.current.onend = () => {
        setIsRecording(false)
      }
    }
  }, [])

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.error('Trình duyệt của bạn không hỗ trợ nhận diện giọng nói')
      return
    }

    if (isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
    } else {
      recognitionRef.current.start()
      setIsRecording(true)
      toast.success('Đang lắng nghe...')
    }
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if ((!inputValue.trim() && attachments.length === 0) || isSending) return

    // 1. Nếu chưa có phiên chat nào, tạo mới
    let currentChat = selectedChat
    if (!currentChat) {
      currentChat = await addChat(inputValue.slice(0, 30) + (inputValue.length > 30 ? '...' : ''))
      setSelectedChat(currentChat)
    }

    const userText = inputValue.trim()
    const currentAttachments = [...attachments]
    setInputValue('')
    setAttachments([])
    setIsSending(true)

    try {
      // 2. Lưu tin nhắn User vào DB
      const userMsg = await createChatMessage({
        chat_id: currentChat.id,
        role: 'user',
        content: userText,
        attachments: currentAttachments.length > 0 ? currentAttachments : undefined
      })
      setMessages(prev => [...prev, userMsg])

      // 3. Gọi Gemini AI (Streaming)
      const historyForAi = messages.map(m => ({
        role: m.role,
        content: m.content,
        attachments: m.attachments
      }))
      historyForAi.push({ role: 'user', content: userText, attachments: currentAttachments })

      const response = await chatWithAIStream(historyForAi, selectedModelProvider)
      const reader = response.body?.getReader()
      if (!reader) throw new Error('Không thể đọc dữ liệu trả về')
      
      const decoder = new TextDecoder('utf-8')
      let aiResponseText = ''
      
      // Tạo một tin nhắn tạm thời cho AI
      const tempAiMsgId = 'temp-' + Date.now()
      setStreamingMessageId(tempAiMsgId)
      setMessages(prev => [...prev, {
        id: tempAiMsgId,
        chat_id: currentChat.id,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString()
      }])
      setIsSending(false) // Tắt isSending vì đang stream rồi

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        aiResponseText += chunk
        
        // Cập nhật tin nhắn tạm
        setMessages(prev => prev.map(m => 
          m.id === tempAiMsgId ? { ...m, content: aiResponseText } : m
        ))
      }

      // 4. Lưu tin nhắn AI vào DB sau khi stream xong
      const savedAiMsg = await createChatMessage({
        chat_id: currentChat.id,
        role: 'assistant',
        content: aiResponseText
      })
      
      setStreamingMessageId(null)
      // Thay thế tin nhắn tạm bằng tin nhắn thực từ DB
      setMessages(prev => prev.map(m => 
        m.id === tempAiMsgId ? savedAiMsg : m
      ))

    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi gửi tin nhắn')
      setIsSending(false)
      setStreamingMessageId(null)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        toast.error('Chỉ hỗ trợ file hình ảnh')
        return
      }
      
      // Limit size to 5MB
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Kích thước ảnh tối đa là 5MB')
        return
      }

      const reader = new FileReader()
      reader.onload = (event) => {
        const base64Data = event.target?.result as string
        setAttachments(prev => [...prev, {
          type: 'image',
          data: base64Data, // Base64 full string (e.g. data:image/jpeg;base64,...)
          url: URL.createObjectURL(file) // For preview
        }])
      }
      reader.readAsDataURL(file)
    })
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Đã sao chép vào khay nhớ tạm')
  }

  const handleEditMessage = (text: string) => {
    setInputValue(text)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  const startEditingChat = (chat: AiChat, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingChatId(chat.id)
    setEditingTitle(chat.title)
  }

  const handleRenameSubmit = async (chatId: string) => {
    if (!editingTitle.trim()) {
      setEditingChatId(null)
      return
    }
    try {
      const updatedChat = await renameChat(chatId, editingTitle.trim())
      setEditingChatId(null)
      if (selectedChat?.id === chatId) {
        setSelectedChat(updatedChat)
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-112px)] flex gap-6 animate-slide-up">
      {/* Sidebar - Danh sách cuộc hội thoại */}
      <div className="w-72 shrink-0 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="section-title text-xl">AI Chat</h2>
          <button
            onClick={handleNewChat}
            className="w-9 h-9 rounded-xl bg-gradient-brand text-white flex items-center justify-center shadow-glow-sm hover:shadow-glow transition-all"
            title="Chat mới"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
          {loadingChats ? (
            <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-surface-400" /></div>
          ) : chats.length === 0 ? (
            <div className="text-center py-8 text-surface-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Chưa có cuộc hội thoại nào</p>
            </div>
          ) : (
            chats.map(chat => (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={clsx(
                  'p-3 rounded-xl cursor-pointer transition-all duration-150 group flex items-center gap-3',
                  selectedChat?.id === chat.id
                    ? 'bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/30'
                    : 'bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:border-surface-300'
                )}
              >
                <MessageSquare className={clsx(
                  "w-4 h-4 shrink-0",
                  selectedChat?.id === chat.id ? "text-primary-500" : "text-surface-400"
                )} />
                
                {editingChatId === chat.id ? (
                  <div className="flex-1 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <input
                      autoFocus
                      type="text"
                      value={editingTitle}
                      onChange={e => setEditingTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRenameSubmit(chat.id)
                        if (e.key === 'Escape') setEditingChatId(null)
                      }}
                      onBlur={() => handleRenameSubmit(chat.id)}
                      className="w-full bg-transparent border-b border-primary-500 text-sm font-medium text-surface-900 dark:text-white focus:outline-none"
                    />
                    <button onClick={() => handleRenameSubmit(chat.id)} className="p-1 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium text-surface-900 dark:text-white truncate">
                      {chat.title}
                    </span>
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
                      <button
                        onClick={(e) => startEditingChat(chat, e)}
                        className="p-1.5 rounded-md text-surface-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-all"
                        title="Đổi tên"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          if (confirm('Xóa đoạn chat này?')) removeChat(chat.id)
                        }}
                        className="p-1.5 rounded-md text-surface-400 hover:text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-500/10 transition-all"
                        title="Xóa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Cửa sổ Chat */}
      <div className="flex-1 card flex flex-col min-w-0 overflow-hidden">
        {selectedChat ? (
          <>
            <div className="p-4 border-b border-surface-200 dark:border-surface-700 flex items-center gap-3 shrink-0">
              <Bot className="w-6 h-6 text-primary-500" />
              <h3 className="font-bold text-surface-900 dark:text-white truncate">{selectedChat.title}</h3>
            </div>

            {/* Khu vực tin nhắn */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-surface-50/50 dark:bg-surface-900/20">
              {loadingMessages ? (
                <div className="flex justify-center p-4"><Loader2 className="w-8 h-8 animate-spin text-surface-400" /></div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-surface-400 gap-3">
                  <Sparkles className="w-12 h-12 text-primary-500/50" />
                  <p className="font-medium text-surface-600 dark:text-surface-300">Bắt đầu trò chuyện với Trợ lý AI</p>
                  <p className="text-sm max-w-sm text-center">Bạn có thể hỏi về bài học, nhờ giải thích khái niệm, hoặc tóm tắt tài liệu.</p>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div key={msg.id} className={clsx("flex gap-4 max-w-[85%] group", msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto')}>
                    <div className={clsx(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden",
                      msg.role === 'user' ? 'bg-primary-100 text-primary-600' : 'bg-gradient-brand text-white shadow-glow-sm'
                    )}>
                      {msg.role === 'user' ? (
                        profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-bold text-xs">{initials}</span>
                        )
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-1 min-w-0 w-full">
                      <div className={clsx(
                        "p-4 rounded-2xl text-sm leading-relaxed shadow-sm overflow-hidden",
                        msg.role === 'user'
                          ? 'bg-primary-500 text-white rounded-tr-sm whitespace-pre-wrap'
                          : 'bg-white dark:bg-surface-800 text-surface-800 dark:text-surface-200 border border-surface-200 dark:border-surface-700 rounded-tl-sm w-full min-w-0'
                      )}>
                        {msg.role === 'user' ? (
                          <div className="flex flex-col gap-2">
                            {msg.content && <div>{msg.content}</div>}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-1">
                                {msg.attachments.map((att: any, idx: number) => (
                                  att.type === 'image' && (
                                    <img 
                                      key={idx} 
                                      src={att.data || att.url} 
                                      alt="attachment" 
                                      className="max-w-[200px] max-h-[200px] object-cover rounded-xl border border-primary-400/30"
                                    />
                                  )
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <MarkdownMessage content={msg.content} />
                            {streamingMessageId === msg.id && (
                              <span className="inline-block w-2 h-4 bg-primary-500 dark:bg-primary-400 animate-pulse ml-1 align-middle" />
                            )}
                          </>
                        )}
                      </div>

                      {/* Action Bar */}
                      <div className={clsx(
                        "flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                        msg.role === 'user' ? "justify-end mr-1" : "justify-start ml-1"
                      )}>
                        {msg.role === 'user' ? (
                          <>
                            <button onClick={() => copyToClipboard(msg.content)} className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-200/50 dark:hover:bg-surface-700/50 transition-colors" title="Sao chép">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleEditMessage(msg.content)} className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-200/50 dark:hover:bg-surface-700/50 transition-colors" title="Chỉnh sửa">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => copyToClipboard(msg.content)} className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-200/50 dark:hover:bg-surface-700/50 transition-colors" title="Sao chép">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {index === messages.length - 1 && (
                              <button onClick={() => toast.success('Đang phát triển...')} className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-200/50 dark:hover:bg-surface-700/50 transition-colors" title="Tạo lại phản hồi">
                                <RotateCw className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={() => toast.success('Cảm ơn bạn đã đánh giá!')} className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-200/50 dark:hover:bg-surface-700/50 transition-colors" title="Hữu ích">
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => toast.success('Cảm ơn bạn đã đánh giá!')} className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-200/50 dark:hover:bg-surface-700/50 transition-colors" title="Không hữu ích">
                              <ThumbsDown className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isSending && (
                <div className="flex gap-4 max-w-[85%] mr-auto">
                  <div className="w-8 h-8 rounded-full bg-gradient-brand text-white flex items-center justify-center shrink-0 shadow-glow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-4 rounded-2xl bg-white dark:bg-surface-800 text-surface-800 dark:text-surface-200 border border-surface-200 dark:border-surface-700 rounded-tl-sm flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="p-4 bg-white dark:bg-surface-800 border-t border-surface-200 dark:border-surface-700 shrink-0">
              <div className="max-w-4xl mx-auto flex flex-col gap-2">
                {/* Attachments Preview */}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-3 pb-2">
                    {attachments.map((att, idx) => (
                      <div key={idx} className="relative group">
                        <img src={att.url} alt="preview" className="w-16 h-16 object-cover rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm" />
                        <button 
                          onClick={() => removeAttachment(idx)}
                          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-danger-500 text-white flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Model Selector */}
                <div className="flex justify-end mb-2">
                  <div className="relative group">
                    <select 
                      value={selectedModelProvider}
                      onChange={(e) => setSelectedModelProvider(e.target.value as 'gemini' | 'groq' | 'groq-deepseek')}
                      className="appearance-none text-xs font-medium bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-800 dark:text-surface-200 rounded-lg pl-3 pr-8 py-1.5 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 cursor-pointer shadow-sm transition-all hover:bg-surface-50 dark:hover:bg-surface-700/50"
                    >
                      <option value="gemini" className="bg-white dark:bg-surface-800 text-surface-800 dark:text-surface-200">Google Gemini 3.5 Flash</option>
                      <option value="groq" className="bg-white dark:bg-surface-800 text-surface-800 dark:text-surface-200">Groq Llama 3 (Fast)</option>
                      <option value="groq-deepseek" className="bg-white dark:bg-surface-800 text-surface-800 dark:text-surface-200">Groq DeepSeek R1 (Reasoning)</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-surface-400 group-hover:text-surface-500 transition-colors">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                </div>
                
                <form onSubmit={handleSendMessage} className="relative flex items-end gap-2">
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                  
                  <div className="relative flex-1 flex items-end bg-surface-50 dark:bg-surface-900/50 rounded-2xl border border-surface-200 dark:border-surface-700 focus-within:border-primary-500 dark:focus-within:border-primary-500 transition-colors">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 text-surface-400 hover:text-primary-500 transition-colors shrink-0"
                      title="Đính kèm hình ảnh"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={toggleRecording}
                      className={clsx(
                        "p-3 transition-colors shrink-0",
                        isRecording 
                          ? "text-danger-500 hover:text-danger-600 animate-pulse" 
                          : "text-surface-400 hover:text-primary-500"
                      )}
                      title={isRecording ? "Dừng ghi âm" : "Nhập bằng giọng nói"}
                    >
                      {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                    
                    <textarea
                      ref={textareaRef}
                      className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 resize-none py-3.5 pr-4 min-h-[52px] max-h-32 custom-scrollbar overflow-y-auto text-sm"
                      placeholder="Nhập tin nhắn hoặc đính kèm ảnh..."
                      value={inputValue}
                      onChange={e => setInputValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      rows={1}
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={(!inputValue.trim() && attachments.length === 0) || isSending}
                    className="shrink-0 w-[52px] h-[52px] rounded-2xl bg-gradient-brand text-white flex items-center justify-center hover:opacity-90 disabled:opacity-50 transition-all shadow-glow-sm"
                  >
                    <Send className="w-5 h-5 -ml-0.5" />
                  </button>
                </form>
              </div>
              <div className="text-center mt-2">
                <span className="text-[10px] text-surface-400">AI có thể mắc lỗi. Vui lòng kiểm tra lại thông tin quan trọng. Nhấn Shift + Enter để xuống dòng.</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-surface-400 gap-4">
            <Bot className="w-16 h-16 opacity-20" />
            <p className="font-medium">Chào mừng đến với Trợ lý AI</p>
            <button
              onClick={handleNewChat}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-brand text-white font-semibold hover:opacity-90 transition-all shadow-glow-sm"
            >
              <Plus className="w-4 h-4" /> Bắt đầu cuộc trò chuyện
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

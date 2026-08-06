import { Dispatch, SetStateAction, RefObject, useState, useEffect, useRef } from 'react'
import { Send, Smile, Paperclip, Mic, X, Loader2, Sparkles, Hash, Vote } from 'lucide-react'
import EmojiPicker from 'emoji-picker-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { clsx } from 'clsx'

interface MessageInputProps {
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  handleSend: (e: React.FormEvent) => void;
  attachments: any[];
  setAttachments: Dispatch<SetStateAction<any[]>>;
  showEmojiPicker: boolean;
  setShowEmojiPicker: Dispatch<SetStateAction<boolean>>;
  fileInputRef: RefObject<HTMLInputElement>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  sending: boolean;
  activeChannelId: string | null;
  activeChannel: any;
}

interface MemberOption {
  id: string
  full_name: string
  avatar_url: string | null
}

const COMMANDS = [
  { key: '/poll', name: 'Tạo cuộc bình chọn', desc: '/poll Câu hỏi? | Lựa chọn 1 | Lựa chọn 2', icon: Vote },
  { key: '/gif', name: 'Tìm kiếm ảnh động', desc: 'Mở popup tìm kiếm ảnh GIF', icon: Sparkles },
  { key: '/clear', name: 'Xóa toàn bộ ô nhập', desc: 'Làm trống nhanh văn bản', icon: X },
]

export function MessageInput({
  input, setInput, handleSend, attachments, setAttachments,
  showEmojiPicker, setShowEmojiPicker, fileInputRef, handleFileSelect,
  sending, activeChannelId, activeChannel
}: MessageInputProps) {
  const [members, setMembers] = useState<MemberOption[]>([])
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [commandQuery, setCommandQuery] = useState<string | null>(null)
  const [dropdownIndex, setDropdownIndex] = useState(0)
  const [isDragOver, setIsDragOver] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Fetch members of current channel for mentions
  useEffect(() => {
    if (!activeChannelId) {
      setMembers([])
      return
    }
    supabase
      .from('chat_members')
      .select('profile:profiles(id, full_name, avatar_url)')
      .eq('channel_id', activeChannelId)
      .then(({ data, error }) => {
        if (!error && data) {
          const formatted = data
            .map((d: any) => d.profile)
            .filter(Boolean)
            .map((p: any) => ({
              id: p.id,
              full_name: p.full_name || 'Người dùng ẩn danh',
              avatar_url: p.avatar_url
            }))
          setMembers(formatted)
        }
      })
  }, [activeChannelId])

  // Handle changes in input for @mentions or /commands
  const handleInputChange = (text: string) => {
    setInput(text)

    // Check slash commands (only active if slash is at the very beginning)
    if (text.startsWith('/')) {
      const match = text.match(/^\/(\w*)$/)
      if (match) {
        setCommandQuery(match[1].toLowerCase())
        setMentionQuery(null)
        setDropdownIndex(0)
        return
      }
    }
    setCommandQuery(null)

    // Check mentions (@Name)
    const cursor = textareaRef.current?.selectionStart || 0
    const textBeforeCursor = text.slice(0, cursor)
    const words = textBeforeCursor.split(/\s/)
    const lastWord = words[words.length - 1]

    if (lastWord.startsWith('@')) {
      setMentionQuery(lastWord.slice(1).toLowerCase())
      setDropdownIndex(0)
    } else {
      setMentionQuery(null)
    }
  }

  // Filter items
  const filteredMembers = mentionQuery !== null
    ? members.filter(m => m.full_name.toLowerCase().includes(mentionQuery))
    : []

  const filteredCommands = commandQuery !== null
    ? COMMANDS.filter(c => c.key.toLowerCase().includes('/' + commandQuery))
    : []

  // Select item from autocomplete
  const selectMember = (member: MemberOption) => {
    const cursor = textareaRef.current?.selectionStart || 0
    const textBeforeCursor = input.slice(0, cursor)
    const textAfterCursor = input.slice(cursor)

    const words = textBeforeCursor.split(/\s/)
    words[words.length - 1] = `@${member.full_name} ` // Replace last word starting with @

    const newText = words.join(' ') + textAfterCursor
    setInput(newText)
    setMentionQuery(null)
    textareaRef.current?.focus()
  }

  const selectCommand = (cmdKey: string) => {
    if (cmdKey === '/clear') {
      setInput('')
    } else {
      setInput(cmdKey + ' ')
    }
    setCommandQuery(null)
    textareaRef.current?.focus()
  }

  // Handle keyboard navigation in autocomplete
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const hasItems = filteredMembers.length > 0 || filteredCommands.length > 0
    const totalCount = filteredMembers.length || filteredCommands.length

    if (hasItems) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setDropdownIndex(prev => (prev + 1) % totalCount)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setDropdownIndex(prev => (prev - 1 + totalCount) % totalCount)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredMembers.length > 0) {
          selectMember(filteredMembers[dropdownIndex])
        } else if (filteredCommands.length > 0) {
          selectCommand(filteredCommands[dropdownIndex].key)
        }
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setMentionQuery(null)
        setCommandQuery(null)
        return
      }
    }

    // Default submit key
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      // Execute command or send
      if (input.startsWith('/poll')) {
        // Just trigger standard send which will parse `/poll` in Phase 3
        handleSend(e)
      } else {
        handleSend(e)
      }
    }
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file)
        setAttachments(prev => [...prev, { type: 'image', url, file }])
        toast.success('Đã đính kèm ảnh kéo thả')
      } else {
        toast.error('Chỉ hỗ trợ kéo thả file hình ảnh')
      }
    }
  }

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={clsx(
        "p-4 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md border-t border-surface-200 dark:border-surface-700 relative transition-colors duration-250",
        isDragOver && "bg-primary-500/5 border-dashed border-t-2 border-primary-500"
      )}
    >
      {/* Drag & Drop Overlay backdrop */}
      {isDragOver && (
        <div className="absolute inset-0 bg-primary-500/10 dark:bg-primary-500/5 flex items-center justify-center pointer-events-none z-10">
          <p className="text-sm font-semibold text-primary-500 flex items-center gap-2">
            <Paperclip className="w-4 h-4 animate-bounce" /> Thả hình ảnh vào đây để upload
          </p>
        </div>
      )}

      {/* Autocomplete Dropdown Panel (@mention / /command) */}
      {(filteredMembers.length > 0 || filteredCommands.length > 0) && (
        <div className="absolute bottom-full left-4 mb-2 w-72 bg-white dark:bg-surface-800 rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-700 max-h-60 overflow-y-auto z-40 py-2 animate-scale-up">
          {filteredMembers.length > 0 && (
            <>
              <p className="text-[10px] font-bold text-surface-400 dark:text-surface-500 uppercase px-4 py-1.5 tracking-wider">
                Nhắc tên thành viên
              </p>
              {filteredMembers.map((m, idx) => (
                <button
                  key={m.id}
                  onClick={() => selectMember(m)}
                  className={clsx(
                    "w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors",
                    idx === dropdownIndex 
                      ? "bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400" 
                      : "text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700"
                  )}
                >
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                    {m.avatar_url 
                      ? <img src={m.avatar_url} className="w-full h-full object-cover" />
                      : <span className="text-xs font-bold">{m.full_name[0]}</span>
                    }
                  </div>
                  <span className="truncate font-medium">{m.full_name}</span>
                </button>
              ))}
            </>
          )}

          {filteredCommands.length > 0 && (
            <>
              <p className="text-[10px] font-bold text-surface-400 dark:text-surface-500 uppercase px-4 py-1.5 tracking-wider">
                Lệnh nhanh
              </p>
              {filteredCommands.map((cmd, idx) => {
                const CmdIcon = cmd.icon
                return (
                  <button
                    key={cmd.key}
                    onClick={() => selectCommand(cmd.key)}
                    className={clsx(
                      "w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors",
                      idx === dropdownIndex 
                        ? "bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400" 
                        : "text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700"
                    )}
                  >
                    <CmdIcon className="w-4 h-4 mt-0.5 text-primary-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold">{cmd.key}</p>
                      <p className="text-2xs text-surface-400 dark:text-surface-500 mt-0.5 truncate">{cmd.desc}</p>
                    </div>
                  </button>
                )
              })}
            </>
          )}
        </div>
      )}

      {showEmojiPicker && (
        <div className="absolute bottom-24 z-20">
          <EmojiPicker onEmojiClick={(e) => setInput(prev => prev + e.emoji)} />
        </div>
      )}

      {attachments.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto">
          {attachments.map((att, idx) => (
            <div key={idx} className="relative w-16 h-16 rounded-xl border border-surface-200 dark:border-surface-700 shrink-0">
              {att.type === 'image' && <img src={att.url} className="w-full h-full object-cover rounded-xl" />}
              <button 
                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-danger-500 text-white flex items-center justify-center hover:bg-danger-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSend} className="relative flex items-end gap-2">
        <button 
          type="button" 
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-3 text-surface-400 hover:text-primary-500 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-xl transition-colors shrink-0"
        >
          <Smile className="w-5 h-5" />
        </button>
        <button 
          type="button" 
          onClick={() => fileInputRef.current?.click()}
          className="p-3 text-surface-400 hover:text-primary-500 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-xl transition-colors shrink-0"
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleFileSelect} 
        />
        
        <button
          type="button"
          onClick={() => toast('Tính năng thu âm đang được phát triển', { icon: '🎤' })}
          className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-surface-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
        >
          <Mic className="w-5 h-5" />
        </button>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Chat trong #${activeChannel?.name || 'phòng'}...`}
          className="input flex-1 min-h-[44px] max-h-32 resize-none py-3 pr-12 rounded-xl"
          rows={1}
          disabled={!activeChannelId || sending}
        />
        <button
          type="submit"
          disabled={(!input.trim() && attachments.length === 0) || !activeChannelId || sending}
          className="absolute right-2 bottom-1.5 w-9 h-9 rounded-lg bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 disabled:opacity-50 disabled:hover:bg-primary-500 transition-colors"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
        </button>
      </form>
      <p className="text-2xs text-surface-400 text-center mt-2">Nhấn Enter để gửi, Shift + Enter để xuống dòng. Hãy giữ môi trường văn minh!</p>
    </div>
  )
}

import { Dispatch, SetStateAction, RefObject } from 'react'
import { Send, Smile, Paperclip, Mic, X, Loader2 } from 'lucide-react'
import EmojiPicker from 'emoji-picker-react'
import toast from 'react-hot-toast'

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

export function MessageInput({
  input, setInput, handleSend, attachments, setAttachments,
  showEmojiPicker, setShowEmojiPicker, fileInputRef, handleFileSelect,
  sending, activeChannelId, activeChannel
}: MessageInputProps) {
  return (
    <div className="p-4 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md border-t border-surface-200 dark:border-surface-700">
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
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend(e)
            }
          }}
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

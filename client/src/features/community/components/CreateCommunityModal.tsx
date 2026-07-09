import { useState, useRef } from 'react'
import { X, Upload, Loader2 } from 'lucide-react'
import { createChannel } from '@/services/community'
import toast from 'react-hot-toast'

interface CreateCommunityModalProps {
  onClose: () => void
  onSuccess: (channelId: string) => void
}

export function CreateCommunityModal({ onClose, onSuccess }: CreateCommunityModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isGlobal, setIsGlobal] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.type.startsWith('image/')) {
        setLogoFile(file)
        setPreviewUrl(URL.createObjectURL(file))
      } else {
        toast.error('Vui lòng chọn file hình ảnh hợp lệ')
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setSubmitting(true)
    try {
      const newChannel = await createChannel(name, description, isGlobal, logoFile)
      toast.success('Tạo cộng đồng thành công!')
      onSuccess(newChannel.id)
    } catch (error: any) {
      toast.error(error.message || 'Lỗi tạo cộng đồng')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
          <h3 className="font-bold text-lg">Tạo Cộng Đồng Mới</h3>
          <button onClick={onClose} className="p-2 rounded-xl text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Logo Upload */}
          <div className="flex flex-col items-center gap-3">
            <div 
              className="w-24 h-24 rounded-full border-2 border-dashed border-surface-300 dark:border-surface-600 flex items-center justify-center overflow-hidden bg-surface-50 dark:bg-surface-800 relative cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <img src={previewUrl} className="w-full h-full object-cover" alt="Logo preview" />
              ) : (
                <Upload className="w-6 h-6 text-surface-400 group-hover:text-primary-500 transition-colors" />
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-white text-xs font-semibold">Tải ảnh lên</span>
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileSelect}
            />
            <p className="text-xs text-surface-500">Logo cộng đồng (Tùy chọn)</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1">Tên cộng đồng <span className="text-danger-500">*</span></label>
            <input 
              required
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ví dụ: Hội yêu Lịch sử, Góc xả stress..."
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1">Mô tả (Tùy chọn)</label>
            <textarea 
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Giới thiệu ngắn về cộng đồng này..."
              className="input w-full resize-none h-20"
            />
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="isGlobal"
              checked={isGlobal}
              onChange={e => setIsGlobal(e.target.checked)}
              className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="isGlobal" className="text-sm font-medium text-surface-700 dark:text-surface-300 cursor-pointer">
              Cộng đồng Công khai (Ai cũng có thể tìm thấy)
            </label>
          </div>

          <div className="pt-4 border-t border-surface-200 dark:border-surface-700 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              disabled={submitting}
              className="btn btn-secondary"
            >
              Hủy
            </button>
            <button 
              type="submit" 
              disabled={submitting || !name.trim()}
              className="btn btn-primary"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

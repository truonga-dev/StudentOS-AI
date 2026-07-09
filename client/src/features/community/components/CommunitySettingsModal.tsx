import { useState, useRef, useEffect } from 'react'
import { X, Upload, Loader2, Trash2 } from 'lucide-react'
import { updateChannel, deleteChannel, uploadChatAttachment } from '@/services/community'
import toast from 'react-hot-toast'

interface CommunitySettingsModalProps {
  channel: any
  onClose: () => void
  onSuccess: () => void
}

export function CommunitySettingsModal({ channel, onClose, onSuccess }: CommunitySettingsModalProps) {
  const [name, setName] = useState(channel.name || '')
  const [description, setDescription] = useState(channel.description || '')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(channel.logo_url || null)
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
      let finalLogoUrl = channel.logo_url
      if (logoFile) {
        finalLogoUrl = await uploadChatAttachment(logoFile)
      }

      await updateChannel(channel.id, name, description, finalLogoUrl)
      toast.success('Cập nhật cộng đồng thành công!')
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || 'Lỗi cập nhật cộng đồng')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa cộng đồng này vĩnh viễn? Mọi dữ liệu sẽ bị xóa và không thể khôi phục.')) return
    
    setSubmitting(true)
    try {
      await deleteChannel(channel.id)
      toast.success('Đã xóa cộng đồng')
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || 'Lỗi xóa cộng đồng')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
          <h3 className="font-bold text-lg">Cài đặt Cộng đồng</h3>
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
                <span className="text-white text-xs font-semibold">Đổi ảnh</span>
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileSelect}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1">Tên cộng đồng <span className="text-danger-500">*</span></label>
            <input 
              required
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1">Mô tả</label>
            <textarea 
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="input w-full resize-none h-20"
            />
          </div>

          <div className="pt-4 border-t border-surface-200 dark:border-surface-700 flex justify-between items-center mt-6">
            <button
              type="button"
              onClick={handleDelete}
              disabled={submitting}
              className="flex items-center gap-2 text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-500/10 px-3 py-2 rounded-xl transition-colors font-medium text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Xóa nhóm
            </button>
            <div className="flex gap-3">
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
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Lưu lại'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { X, AlertTriangle, Loader2 } from 'lucide-react'
import { submitReport } from '@/services/community'
import toast from 'react-hot-toast'

interface ReportModalProps {
  isOpen?: boolean
  reportedUserId: string | null
  messageId: string | null
  onClose: () => void
}

const REPORT_REASONS = [
  'Ngôn từ gây kích động, thù địch',
  'Quấy rối hoặc bắt nạt',
  'Spam hoặc Lừa đảo',
  'Nội dung đồi trụy, không phù hợp',
  'Giả mạo người khác',
  'Khác'
]

export function ReportModal({ reportedUserId, messageId, onClose }: ReportModalProps) {
  const [reason, setReason] = useState(REPORT_REASONS[0])
  const [customReason, setCustomReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const finalReason = reason === 'Khác' ? customReason : reason
    if (!finalReason.trim()) {
      toast.error('Vui lòng nhập lý do báo cáo')
      return
    }

    setSubmitting(true)
    try {
      await submitReport(reportedUserId, messageId, finalReason)
      toast.success('Báo cáo của bạn đã được gửi đi. Cảm ơn bạn!')
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'Lỗi gửi báo cáo')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700 bg-danger-50 dark:bg-danger-500/10">
          <div className="flex items-center gap-2 text-danger-600 dark:text-danger-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-bold text-lg">Báo cáo vi phạm</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-surface-600 dark:text-surface-400">
            Hãy chọn lý do bạn muốn báo cáo {messageId ? 'tin nhắn' : 'tài khoản'} này. Quản trị viên sẽ xem xét cẩn thận.
          </p>

          <div className="space-y-2 mt-4">
            {REPORT_REASONS.map(r => (
              <label key={r} className="flex items-center gap-3 p-3 rounded-xl border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 cursor-pointer transition-colors">
                <input 
                  type="radio" 
                  name="reportReason" 
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-surface-700 dark:text-surface-300">{r}</span>
              </label>
            ))}
          </div>

          {reason === 'Khác' && (
            <textarea 
              value={customReason}
              onChange={e => setCustomReason(e.target.value)}
              placeholder="Vui lòng mô tả rõ hơn..."
              className="input w-full h-24 resize-none mt-2"
              required
            />
          )}

          <div className="pt-4 border-t border-surface-200 dark:border-surface-700 flex justify-end gap-3 mt-6">
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
              disabled={submitting}
              className="btn btn-primary bg-danger-500 hover:bg-danger-600 dark:bg-danger-600 dark:hover:bg-danger-700 text-white border-transparent"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Gửi báo cáo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

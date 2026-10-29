import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Trash2, X, Info } from 'lucide-react'

export interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
  loading?: boolean
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận xóa',
  message = 'Bạn có chắc chắn muốn xóa không? Thao tác này không thể hoàn tác.',
  confirmText = 'Xóa',
  cancelText = 'Hủy',
  type = 'danger',
  loading = false,
}: ConfirmModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose()
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, loading])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!loading ? onClose : undefined}
            className="fixed inset-0 bg-surface-950/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-2xl p-6 text-surface-900 dark:text-white"
          >
            {/* Close Button */}
            {!loading && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-start gap-4">
              {/* Icon */}
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  type === 'danger'
                    ? 'bg-rose-500/10 text-rose-500 ring-1 ring-rose-500/20'
                    : type === 'warning'
                    ? 'bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20'
                    : 'bg-primary-500/10 text-primary-500 ring-1 ring-primary-500/20'
                }`}
              >
                {type === 'danger' ? (
                  <Trash2 className="w-6 h-6" />
                ) : type === 'warning' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <Info className="w-6 h-6" />
                )}
              </div>

              {/* Title & Message */}
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="text-lg font-bold tracking-tight text-surface-900 dark:text-white">
                  {title}
                </h3>
                <p className="mt-1.5 text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                  {message}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={onConfirm}
                className={`px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-lg transition active:scale-95 disabled:opacity-50 ${
                  type === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                    : type === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                    : 'bg-primary-600 hover:bg-primary-500 shadow-primary-600/30'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

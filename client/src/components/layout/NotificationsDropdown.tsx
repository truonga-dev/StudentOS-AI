import { Bell, Check, Trash2, Info, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react'
import { clsx } from 'clsx'
import { useNavigate } from 'react-router-dom'

// Custom time ago function
function timeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'Vừa xong'
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes} phút trước`
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours} giờ trước`
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 30) return `${diffInDays} ngày trước`
  
  return date.toLocaleDateString('vi-VN')
}

import { AppNotification } from '@/hooks/useNotifications'

interface NotificationsDropdownProps {
  isOpen: boolean
  onClose: () => void
  notifications: AppNotification[]
  loading: boolean
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearAll: () => void
}

export function NotificationsDropdown({ 
  isOpen, 
  onClose,
  notifications,
  loading,
  markAsRead,
  markAllAsRead,
  clearAll
}: NotificationsDropdownProps) {
  const navigate = useNavigate()

  if (!isOpen) return null

  const unreadCount = notifications.filter(n => !n.is_read).length


  return (
    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl shadow-xl
                    bg-white dark:bg-surface-800
                    border border-surface-200 dark:border-surface-700
                    py-2 z-50 animate-slide-up"
         onClick={e => e.stopPropagation()}>
      
      {/* Header */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-surface-100 dark:border-surface-700">
        <div>
          <h3 className="text-sm font-bold text-surface-900 dark:text-white">Thông báo</h3>
          <p className="text-xs text-surface-500">
            {unreadCount > 0 ? `Bạn có ${unreadCount} thông báo mới` : 'Bạn không có thông báo mới'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-primary-600 dark:text-primary-400"
              title="Đánh dấu tất cả đã đọc"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
          {notifications.length > 0 && (
            <button 
              onClick={clearAll}
              className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 hover:text-danger-500 transition-colors"
              title="Xóa tất cả"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
           <div className="py-8 text-center text-sm text-surface-500">Đang tải...</div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center flex flex-col items-center justify-center">
            <Bell className="w-10 h-10 text-surface-300 dark:text-surface-600 mb-2" />
            <p className="text-sm text-surface-500">Không có thông báo nào!</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100 dark:divide-surface-700/50">
            {notifications.map((notif) => {
              
              let Icon = Info
              let color = 'text-primary-500'
              let bg = 'bg-primary-50 dark:bg-primary-500/10'
              
              if (notif.type === 'success') {
                Icon = CheckCircle2
                color = 'text-success-500'
                bg = 'bg-success-50 dark:bg-success-500/10'
              } else if (notif.type === 'warning') {
                Icon = AlertTriangle
                color = 'text-warning-500'
                bg = 'bg-warning-50 dark:bg-warning-500/10'
              } else if (notif.type === 'error') {
                Icon = AlertCircle
                color = 'text-danger-500'
                bg = 'bg-danger-50 dark:bg-danger-500/10'
              }

              const timeStr = timeAgo(notif.created_at)

              return (
                <div 
                  key={notif.id}
                  onClick={() => {
                    markAsRead(notif.id)
                    if (notif.link) {
                      navigate(notif.link)
                      onClose()
                    }
                  }}
                  className={clsx(
                    "px-4 py-3 hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors cursor-pointer flex gap-3",
                    !notif.is_read ? "bg-surface-50/50 dark:bg-surface-700/20" : ""
                  )}
                >
                  <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center shrink-0", bg)}>
                    <Icon className={clsx("w-5 h-5", color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className={clsx("text-sm font-semibold truncate", !notif.is_read ? "text-surface-900 dark:text-white" : "text-surface-700 dark:text-surface-300")}>
                        {notif.title}
                      </p>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-primary-500 mt-1 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-surface-500 mt-0.5 line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-2xs text-surface-400 mt-1.5 font-medium">
                      {timeStr}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

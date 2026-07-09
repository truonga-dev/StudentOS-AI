import { useState, useRef, useEffect } from 'react'
import { Bell, Search, Sun, Moon, LogOut, Settings, User } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import toast from 'react-hot-toast'
import { CommandPalette } from './CommandPalette'
import { NotificationsDropdown } from './NotificationsDropdown'
import { useNotifications } from '@/hooks/useNotifications'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/subjects':  'Môn học',
  '/calendar':  'Lịch học',
  '/tasks':     'Công việc',
  '/notes':     'Ghi chú',
  '/files':     'Tài liệu',
  '/analytics': 'Thống kê',
  '/settings':  'Cài đặt',
}

interface TopbarProps {
  sidebarCollapsed: boolean
  darkMode: boolean
  onToggleDark: () => void
}

export function Topbar({ sidebarCollapsed, darkMode, onToggleDark }: TopbarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { profile } = useProfile()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  
  const { notifications, loading, markAsRead, markAllAsRead, clearAll } = useNotifications()
  const unreadCount = notifications.filter(n => !n.is_read).length

  const title = pageTitles[location.pathname] ?? 'Student OS AI'

  // Lấy tên hiển thị từ metadata hoặc email
  const displayName = user?.user_metadata?.full_name
    ?? user?.email?.split('@')[0]
    ?? 'User'
  const initials = displayName.slice(0, 1).toUpperCase()

  // Đóng menu khi click ra ngoài
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Phím tắt Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandPaletteOpen(o => !o)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSignOut = async () => {
    setMenuOpen(false)
    await signOut()
    toast.success('Đã đăng xuất thành công!')
    navigate('/login')
  }

  return (
    <header
      className="fixed top-0 right-0 z-20 h-16 flex items-center gap-4 px-6
                 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md
                 border-b border-surface-200 dark:border-surface-700
                 transition-all duration-300"
      style={{
        left: sidebarCollapsed ? '72px' : '256px',
      }}
    >
      {/* Page title */}
      <h1 className="font-semibold text-surface-900 dark:text-white text-base flex-1">
        {title}
      </h1>

      {/* Search bar */}
      <div 
        onClick={() => setCommandPaletteOpen(true)}
        className="hidden md:flex items-center gap-2 bg-surface-100 dark:bg-surface-800
                      border border-surface-200 dark:border-surface-700
                      rounded-xl px-3 py-2 w-64 cursor-pointer
                      hover:border-primary-400 transition-colors duration-150">
        <Search className="w-4 h-4 text-surface-400" />
        <span className="text-sm text-surface-400 select-none">Tìm kiếm... </span>
        <kbd className="ml-auto text-2xs bg-surface-200 dark:bg-surface-700 text-surface-500
                        px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Dark mode toggle */}
        <button
          onClick={onToggleDark}
          className="w-9 h-9 rounded-xl flex items-center justify-center
                     text-surface-500 hover:text-surface-700 dark:hover:text-surface-300
                     hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-150"
          title={darkMode ? 'Sáng' : 'Tối'}
        >
          {darkMode
            ? <Sun className="w-[18px] h-[18px]" />
            : <Moon className="w-[18px] h-[18px]" />
          }
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setNotificationsOpen(o => !o)}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center
                             text-surface-500 hover:text-surface-700 dark:hover:text-surface-300
                             hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-150">
            <Bell className="w-[18px] h-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full
                               ring-2 ring-white dark:ring-surface-900" />
            )}
          </button>
          <NotificationsDropdown 
            isOpen={notificationsOpen} 
            onClose={() => setNotificationsOpen(false)}
            notifications={notifications}
            loading={loading}
            markAsRead={markAsRead}
            markAllAsRead={markAllAsRead}
            clearAll={clearAll}
          />
        </div>

        {/* Avatar + Dropdown */}
        <div className="relative ml-1" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center
                       shadow-glow-sm hover:shadow-glow transition-shadow duration-200
                       text-white font-semibold text-sm overflow-hidden"
            title={displayName}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </button>

          {/* Dropdown menu */}
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl shadow-xl
                            bg-white dark:bg-surface-800
                            border border-surface-200 dark:border-surface-700
                            py-1.5 z-50 animate-slide-up">
              {/* User info */}
              <div className="px-4 py-2.5 border-b border-surface-100 dark:border-surface-700">
                <p className="text-sm font-semibold text-surface-900 dark:text-white truncate">
                  {displayName}
                </p>
                <p className="text-xs text-surface-400 truncate">{user?.email}</p>
              </div>

              {/* Menu items */}
              <button
                onClick={() => { setMenuOpen(false); navigate('/settings') }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm
                           text-surface-600 dark:text-surface-300
                           hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Cài đặt
              </button>

              <button
                onClick={() => { setMenuOpen(false); navigate('/settings') }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm
                           text-surface-600 dark:text-surface-300
                           hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
              >
                <User className="w-4 h-4" />
                Hồ sơ
              </button>

              <div className="my-1 h-px bg-surface-100 dark:bg-surface-700" />

              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm
                           text-danger-600 dark:text-danger-400
                           hover:bg-danger-50 dark:hover:bg-danger-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
      
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </header>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, LayoutDashboard, BookOpen, Calendar, CheckSquare, FileText, FolderOpen, PieChart, Settings, X } from 'lucide-react'

const PAGES = [
  { id: 'dashboard', name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { id: 'subjects', name: 'Môn học', path: '/subjects', icon: BookOpen },
  { id: 'calendar', name: 'Lịch học', path: '/calendar', icon: Calendar },
  { id: 'tasks', name: 'Công việc', path: '/tasks', icon: CheckSquare },
  { id: 'notes', name: 'Ghi chú', path: '/notes', icon: FileText },
  { id: 'files', name: 'Tài liệu', path: '/files', icon: FolderOpen },
  { id: 'analytics', name: 'Thống kê', path: '/analytics', icon: PieChart },
  { id: 'settings', name: 'Cài đặt', path: '/settings', icon: Settings },
]

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
    }
  }, [isOpen])

  // Lắng nghe phím ESC để đóng
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const filteredPages = PAGES.filter(page =>
    page.name.toLowerCase().includes(query.toLowerCase())
  )

  const handleSelect = (path: string) => {
    navigate(path)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-32 sm:pt-48 px-4 bg-surface-900/50 backdrop-blur-sm animate-fade-in"
         onClick={onClose}>
      <div 
        className="relative w-full max-w-xl bg-white dark:bg-surface-900 rounded-2xl shadow-2xl overflow-hidden border border-surface-200 dark:border-surface-700 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center px-4 py-4 border-b border-surface-200 dark:border-surface-800">
          <Search className="w-5 h-5 text-surface-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 ml-3 bg-transparent border-none outline-none text-surface-900 dark:text-white placeholder:text-surface-400"
            placeholder="Tìm kiếm trang (ví dụ: Môn học, Lịch học)..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button onClick={onClose} className="p-1 rounded-md hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filteredPages.length > 0 ? (
            <div className="space-y-1">
              <div className="px-3 py-2 text-xs font-semibold text-surface-400 uppercase tracking-wider">
                Trang
              </div>
              {filteredPages.map((page) => {
                const Icon = page.icon
                return (
                  <button
                    key={page.id}
                    onClick={() => handleSelect(page.path)}
                    className="w-full flex items-center gap-3 px-3 py-3 text-sm text-surface-700 dark:text-surface-300 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-primary-500 transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                    {page.name}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="py-10 text-center text-surface-500 text-sm">
              Không tìm thấy kết quả nào cho "{query}"
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-4 py-3 bg-surface-50 dark:bg-surface-950 border-t border-surface-200 dark:border-surface-800 flex items-center justify-between">
          <span className="text-xs text-surface-500 flex items-center gap-1">
            Nhấn <kbd className="bg-surface-200 dark:bg-surface-800 px-1.5 py-0.5 rounded border border-surface-300 dark:border-surface-700">ESC</kbd> để đóng
          </span>
          <span className="text-xs text-surface-500 flex items-center gap-1">
            Điều hướng bằng <kbd className="bg-surface-200 dark:bg-surface-800 px-1.5 py-0.5 rounded border border-surface-300 dark:border-surface-700">Click</kbd>
          </span>
        </div>
      </div>
    </div>
  )
}

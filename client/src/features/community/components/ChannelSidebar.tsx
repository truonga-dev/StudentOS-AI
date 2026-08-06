import { useState } from 'react'
import { Hash, Users, Lock, Megaphone, BookOpen, MessageCircle, Pin, Archive, ArchiveRestore, MoreVertical, Plus, Trash2, Settings } from 'lucide-react'
import { clsx } from 'clsx'
import type { ChatChannel as Channel } from '@/types'

// Cấu hình categories hiển thị
const CATEGORIES = [
  { key: 'Thông Báo',  icon: Megaphone, color: 'text-amber-500' },
  { key: 'Học Tập',   icon: BookOpen,  color: 'text-emerald-500' },
  { key: 'Phòng Chung', icon: Hash,    color: 'text-primary-500' },
  { key: 'Chat Riêng', icon: Lock,     color: 'text-surface-400' },
]

interface ChannelSidebarProps {
  channels: Channel[]
  activeChannelId: string | null
  unreadCounts: Record<string, number>
  pinnedChannels: string[]
  archivedChannels: string[]
  userId: string | undefined
  onSelectChannel: (id: string) => void
  onPin: (id: string) => void
  onArchive: (id: string) => void
  onUnarchive: (id: string) => void
  onDelete: (id: string) => void
  onSettings: (ch: Channel) => void
  onCreateChannel: () => void
  getChannelDisplayInfo: (ch: Channel | undefined) => { name: string; avatar: string | null }
}

export function ChannelSidebar({
  channels, activeChannelId, unreadCounts, pinnedChannels, archivedChannels,
  userId, onSelectChannel, onPin, onArchive, onUnarchive, onDelete, onSettings,
  onCreateChannel, getChannelDisplayInfo
}: ChannelSidebarProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([])

  const toggleCategory = (key: string) => {
    setCollapsedCategories(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  // Phân loại kênh
  const visibleChannels = channels.filter(ch => !archivedChannels.includes(ch.id))
  const archivedList = channels.filter(ch => archivedChannels.includes(ch.id))

  // Kênh riêng tư (private chat)
  const privateChannels = visibleChannels.filter(ch => ch.description === 'Private Chat')
  // Kênh chung — chia theo category
  const publicChannels = visibleChannels.filter(ch => ch.description !== 'Private Chat')

  const channelsByCategory: Record<string, Channel[]> = {}
  CATEGORIES.slice(0, 3).forEach(cat => {
    channelsByCategory[cat.key] = publicChannels.filter(ch => {
      const cat_val = ch.category || 'Phòng Chung'
      return cat_val === cat.key
    })
  })
  // Pinned hiển thị ở đầu mỗi category
  Object.keys(channelsByCategory).forEach(key => {
    channelsByCategory[key].sort((a, b) => {
      const aPin = pinnedChannels.includes(a.id)
      const bPin = pinnedChannels.includes(b.id)
      if (aPin && !bPin) return -1
      if (!aPin && bPin) return 1
      return 0
    })
  })

  const renderChannelItem = (ch: Channel) => {
    const { name, avatar } = getChannelDisplayInfo(ch)
    const isActive = activeChannelId === ch.id
    const isOwnerOrAdmin = ch.role === 'owner' || ch.role === 'admin'
    const isPinned = pinnedChannels.includes(ch.id)
    const unread = unreadCounts[ch.id] || 0

    return (
      <div key={ch.id} className="relative group/ch">
        <button
          onClick={() => { onSelectChannel(ch.id); setOpenMenuId(null) }}
          className={clsx(
            'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150',
            isActive
              ? 'bg-primary-500/15 text-primary-600 dark:text-primary-400'
              : 'text-surface-500 dark:text-surface-400 hover:bg-surface-200/60 dark:hover:bg-surface-800/60 hover:text-surface-800 dark:hover:text-surface-200'
          )}
        >
          <div className="shrink-0 w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center bg-surface-200/70 dark:bg-surface-800">
            {avatar
              ? <img src={avatar} className="w-full h-full object-cover" />
              : <Hash className="w-3.5 h-3.5 opacity-60" />
            }
          </div>
          <span className="flex-1 truncate text-left">{name}</span>
          {isPinned && <Pin className="w-3 h-3 text-primary-400 shrink-0" />}
          {unread > 0 && (
            <span className="shrink-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>

        {/* Context menu button */}
        <button
          onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === ch.id ? null : ch.id) }}
          className={clsx(
            'absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-all',
            openMenuId === ch.id
              ? 'opacity-100 bg-surface-200 dark:bg-surface-700'
              : 'opacity-0 group-hover/ch:opacity-100 hover:bg-surface-200 dark:hover:bg-surface-700'
          )}
        >
          <MoreVertical className="w-3.5 h-3.5 text-surface-400" />
        </button>

        {openMenuId === ch.id && (
          <div className="absolute left-2 top-full mt-1 z-[100] w-48 bg-white dark:bg-surface-800 rounded-xl shadow-2xl border border-surface-200 dark:border-surface-700 py-1.5 overflow-hidden animate-scale-up">
            <button onClick={() => { onPin(ch.id); setOpenMenuId(null) }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
              <Pin className="w-4 h-4 text-primary-500" /> {isPinned ? 'Bỏ ghim' : 'Ghim kênh'}
            </button>
            <button onClick={() => { onArchive(ch.id); setOpenMenuId(null) }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
              <Archive className="w-4 h-4 text-amber-500" /> Lưu trữ
            </button>
            {isOwnerOrAdmin && (
              <>
                <button onClick={() => { onSettings(ch); setOpenMenuId(null) }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
                  <Settings className="w-4 h-4 text-surface-400" /> Cài đặt kênh
                </button>
                <div className="h-px bg-surface-100 dark:bg-surface-700 my-1" />
                <button onClick={() => { onDelete(ch.id); setOpenMenuId(null) }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-500/10 transition-colors">
                  <Trash2 className="w-4 h-4" /> Xóa kênh
                </button>
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-surface-50 dark:bg-surface-950/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 border-b border-surface-200/80 dark:border-surface-800">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center shadow-md shadow-primary-500/20">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-surface-900 dark:text-white text-sm leading-tight">Cộng đồng</h2>
            <p className="text-[10px] text-surface-400 leading-tight">Student OS AI</p>
          </div>
        </div>
      </div>

      {/* Scrollable channel list */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-surface-300 dark:scrollbar-thumb-surface-700">
        {/* Public channels by category */}
        {CATEGORIES.slice(0, 3).map(cat => {
          const catChannels = channelsByCategory[cat.key] || []
          if (catChannels.length === 0) return null
          const isCollapsed = collapsedCategories.includes(cat.key)
          const CatIcon = cat.icon

          return (
            <div key={cat.key}>
              <div className="w-full flex items-center gap-1.5 px-2 mb-1 group/cat">
                <button
                  onClick={() => toggleCategory(cat.key)}
                  className="flex items-center gap-1.5 flex-1 min-w-0"
                >
                  <CatIcon className={clsx('w-3 h-3 shrink-0', cat.color)} />
                  <span className="text-[10px] font-bold text-surface-400 dark:text-surface-500 uppercase tracking-widest flex-1 text-left truncate">
                    {cat.key}
                  </span>
                  <span className={clsx('text-surface-300 dark:text-surface-600 transition-transform text-[8px]', isCollapsed ? 'rotate-0' : 'rotate-90')}>▶</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onCreateChannel() }}
                  className="opacity-0 group-hover/cat:opacity-100 p-0.5 rounded text-surface-400 hover:text-primary-500 transition-all shrink-0"
                  title="Tạo kênh mới"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              {!isCollapsed && (
                <div className="space-y-0.5">
                  {catChannels.map(renderChannelItem)}
                </div>
              )}
            </div>
          )
        })}

        {/* Private chats */}
        {privateChannels.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 px-2 mb-1">
              <Lock className="w-3 h-3 text-surface-400 shrink-0" />
              <span className="text-[10px] font-bold text-surface-400 dark:text-surface-500 uppercase tracking-widest flex-1">
                Tin Nhắn Riêng
              </span>
            </div>
            <div className="space-y-0.5">
              {privateChannels.map(renderChannelItem)}
            </div>
          </div>
        )}

        {/* Archived section */}
        {archivedList.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 px-2 mb-1">
              <Archive className="w-3 h-3 text-surface-400 shrink-0" />
              <span className="text-[10px] font-bold text-surface-400 dark:text-surface-500 uppercase tracking-widest flex-1">
                Đã Lưu Trữ
              </span>
            </div>
            <div className="space-y-0.5">
              {archivedList.map(ch => {
                const { name, avatar } = getChannelDisplayInfo(ch)
                return (
                  <div key={ch.id} className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl group/archived">
                    <div className="shrink-0 w-6 h-6 rounded-md overflow-hidden flex items-center justify-center bg-surface-200/50 dark:bg-surface-800/50">
                      {avatar
                        ? <img src={avatar} className="w-full h-full object-cover opacity-50" />
                        : <Hash className="w-3 h-3 opacity-30" />
                      }
                    </div>
                    <span className="flex-1 text-xs text-surface-400 truncate">{name}</span>
                    <button
                      onClick={() => onUnarchive(ch.id)}
                      title="Bỏ lưu trữ"
                      className="opacity-0 group-hover/archived:opacity-100 p-1 rounded hover:bg-primary-50 dark:hover:bg-primary-500/10 text-surface-400 hover:text-primary-500 transition-all"
                    >
                      <ArchiveRestore className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {visibleChannels.length === 0 && archivedList.length === 0 && (
          <div className="text-center px-4 py-8 text-surface-400">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">Chưa có kênh nào</p>
            <button onClick={onCreateChannel} className="mt-2 text-xs text-primary-500 hover:underline">
              Tạo kênh đầu tiên
            </button>
          </div>
        )}
      </div>

      {/* Create channel button */}
      <div className="p-3 border-t border-surface-200/80 dark:border-surface-800">
        <button
          onClick={onCreateChannel}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors border-2 border-dashed border-primary-200 dark:border-primary-800/50 hover:border-primary-400 dark:hover:border-primary-600"
        >
          <Plus className="w-4 h-4" />
          Tạo phòng chat mới
        </button>
      </div>
    </div>
  )
}

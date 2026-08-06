import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Hash, Send, Users, ShieldAlert, Shield, Award, Star, Trophy, Loader2, Image as ImageIcon, Mic, Paperclip, Pin, X, Settings, MoreVertical, Smile, SmilePlus, User, Archive, ArchiveRestore, Trash2, Plus, ArrowLeft, Search, Vote } from 'lucide-react'
import { clsx } from 'clsx'
import { useCommunity } from '@/hooks/useCommunity'
import { useAuth } from '@/hooks/useAuth'
import { uploadChatAttachment, updateMessage, unsendMessage, deleteMessageForMe, toggleMessageReaction, deleteChannel } from '@/services/community'
import { createChannel } from '@/services/community'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import toast from 'react-hot-toast'
import EmojiPicker from 'emoji-picker-react'
import { ChatMembersModal } from '../components/ChatMembersModal'
import { CreateCommunityModal } from '../components/CreateCommunityModal'
import { UserProfileModal } from '../components/UserProfileModal'
import { CommunitySettingsModal } from '../components/CommunitySettingsModal'
import { ReportModal } from '../components/ReportModal'
import { MessageInput } from '../components/MessageInput'
import { getFriends } from '@/services/social'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'
import { ChannelSidebar } from '../components/ChannelSidebar'
import { MembersPanel } from '../components/MembersPanel'
import { MarkdownMessage } from '@/components/ui/MarkdownMessage'

const RANK_ICONS: Record<string, React.ElementType> = {
  Bronze: ShieldAlert,
  Silver: Shield,
  Gold: Award,
  Platinum: Star,
  Diamond: Trophy,
}

const RANK_COLORS: Record<string, string> = {
  Bronze: 'text-amber-600',
  Silver: 'text-slate-400',
  Gold: 'text-yellow-500',
  Platinum: 'text-teal-400',
  Diamond: 'text-cyan-400',
}

export function CommunityChatPage() {
  const { user } = useAuth()
  const isMobile = useMediaQuery('(max-width: 1023px)')
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  const { channels, setChannels, messages, loading, loadingMore, hasMore, loadMore, sendMessage, pinMessage } = useCommunity(activeChannelId)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [attachments, setAttachments] = useState<{type: 'image' | 'voice', url: string, file?: File}[]>([])
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showMembersPanel, setShowMembersPanel] = useState(true)
  const [replyMessage, setReplyMessage] = useState<any | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showPinnedOnly, setShowPinnedOnly] = useState(false)
  const [reportData, setReportData] = useState<{ userId: string | null, messageId: string | null } | null>(null)
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [reactionMessageId, setReactionMessageId] = useState<string | null>(null)
  const [fullEmojiMessageId, setFullEmojiMessageId] = useState<string | null>(null)
  const [channelMenuId, setChannelMenuId] = useState<string | null>(null)
  const [friends, setFriends] = useState<Profile[]>([])
  const [searchParams, setSearchParams] = useSearchParams()
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const activeChannelIdRef = useRef<string | null>(null)
  // Lưu thông tin người đang chat (fallback khi channel chưa load trong channels state)
  const [privateChatPartner, setPrivateChatPartner] = useState<{ name: string; avatar: string | null } | null>(null)

  const [pinnedChannels, setPinnedChannels] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('student_os_pinned_channels') || '[]') } catch { return [] }
  })
  const [archivedChannels, setArchivedChannels] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('student_os_archived_channels') || '[]') } catch { return [] }
  })
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const friendRequestId = searchParams.get('friend_request')
    if (friendRequestId) {
      setSelectedProfileId(friendRequestId)
      // Clear search param so it doesn't open on refresh
      setSearchParams({})
    }
  }, [searchParams, setSearchParams])

  // Sync activeChannelId vào ref + thông báo cho global hook biết kênh nào đang active
  useEffect(() => {
    activeChannelIdRef.current = activeChannelId
    // Cập nhật global ref để GlobalChatNotifications không show toast cho kênh đang xem
    if (typeof (window as any).__setActiveCommunityChannel === 'function') {
      ;(window as any).__setActiveCommunityChannel(activeChannelId)
    }
    return () => {
      // Khi unmount, xóa active channel để global hook biết không có kênh nào đang xem
      if (typeof (window as any).__setActiveCommunityChannel === 'function') {
        ;(window as any).__setActiveCommunityChannel(null)
      }
    }
  }, [activeChannelId])

  // Lắng nghe realtime để cập nhật badge unread — toast đã được xử lý bởi useGlobalChatNotifications ở AppLayout
  useEffect(() => {
    if (!channels.length || !user) return

    const subscriptions = channels.map(ch => {
      return supabase
        .channel(`unread:${ch.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'community_messages', filter: `channel_id=eq.${ch.id}` },
          (payload: any) => {
            // Bỏ qua nếu là tin nhắn của chính mình
            if (payload.new.user_id === user.id) return
            // Bỏ qua nếu đang ở kênh đó rồi
            if (activeChannelIdRef.current === ch.id) return
            // Chỉ tăng unread count, không hiện toast (toast do GlobalChatNotifications xử lý)
            setUnreadCounts(prev => ({ ...prev, [ch.id]: (prev[ch.id] || 0) + 1 }))
          }
        )
        .subscribe()
    })

    return () => {
      subscriptions.forEach((sub: any) => {
        supabase.removeChannel(sub)
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels.length, user?.id])

  useEffect(() => {
    if (user) {
      getFriends().then(setFriends).catch(console.error)
    }
  }, [user, selectedProfileId]) // re-fetch when modal closes just in case friend accepted

  useEffect(() => {
    if (channels.length > 0 && !activeChannelId) {
      const savedArchived = (() => {
        try { return JSON.parse(localStorage.getItem('student_os_archived_channels') || '[]') } catch { return [] }
      })()
      const visible = channels.filter(c => !savedArchived.includes(c.id))
      if (visible.length > 0) {
        setActiveChannelId(visible[0].id)
      }
    }
  }, [channels, activeChannelId])

  // Nếu activeChannelId được set nhưng chưa có trong channels (race condition) → fetch riêng channel đó
  useEffect(() => {
    if (!activeChannelId || !channels.length) return
    const alreadyInList = channels.find(c => c.id === activeChannelId)
    if (alreadyInList) return

    // Fetch trực tiếp channel theo ID để tránh RLS filter bỏ sót
    supabase
      .from('chat_channels')
      .select('*, chat_members(user_id, profile:profiles(id, full_name, avatar_url))')
      .eq('id', activeChannelId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error(error)
          return
        }
        if (data) {
          setChannels(prev => {
            if (prev.find(c => c.id === data.id)) return prev
            return [...prev, data as any]
          })
        }
      })
  }, [activeChannelId, channels])

  const lastMessageIdRef = useRef<string | null>(null)

  useEffect(() => {
    // Chỉ cuộn xuống nếu có tin nhắn MỚI ở dưới cùng (tránh nhảy lung tung khi load tin nhắn cũ ở trên)
    const lastMsg = messages[messages.length - 1]
    if (!loadingMore && lastMsg && lastMsg.id !== lastMessageIdRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      lastMessageIdRef.current = lastMsg.id
    }
  }, [messages, loadingMore])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget
    if (scrollTop === 0 && hasMore && !loadingMore) {
      loadMore()
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!input.trim() && attachments.length === 0) || !activeChannelId) return
    if (editingMessageId && !input.trim()) {
      toast.error('Tin nhắn không được để trống khi chỉnh sửa')
      return
    }
    setSending(true)
    try {
      if (input.startsWith('/poll')) {
        const parts = input.replace('/poll', '').split('|').map(p => p.trim())
        const question = parts[0]
        const options = parts.slice(1).filter(Boolean)
        if (!question || options.length === 0) {
          toast.error('Cú pháp poll: /poll Câu hỏi | Lựa chọn 1 | Lựa chọn 2')
          setSending(false)
          return
        }
        
        const emojiNumbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
        let formattedContent = `📊 POLL: ${question}`
        options.forEach((opt, idx) => {
          if (idx < 10) {
            formattedContent += `\n${emojiNumbers[idx]} ${opt}`
          }
        })

        await sendMessage(formattedContent, null, replyMessage?.id || null)
        setReplyMessage(null)
        setInput('')
        setAttachments([])
        setShowEmojiPicker(false)
        return
      }

      const finalAttachments = await Promise.all(
        attachments.map(async (att) => {
          if (att.file) {
            const url = await uploadChatAttachment(att.file)
            return { type: att.type, url }
          }
          return { type: att.type, url: att.url }
        })
      )

      const newMessage = { content: input, attachments: finalAttachments.length > 0 ? finalAttachments : null }
      if (editingMessageId) {
        await updateMessage(editingMessageId, newMessage.content)
        setEditingMessageId(null)
      } else {
        await sendMessage(input, finalAttachments.length > 0 ? finalAttachments : null, replyMessage?.id || null)
        setReplyMessage(null)
      }
      setInput('')
      setAttachments([])
      setShowEmojiPicker(false)
    } catch (err: any) {
      toast.error(err.message || 'Lỗi gửi tin nhắn')
    } finally {
      setSending(false)
    }
  }

  const handleUnsend = async (id: string) => {
    try {
      await unsendMessage(id)
      setActiveMenuId(null)
    } catch(err:any) { toast.error(err.message) }
  }

  const handleDeleteForMe = async (msg: any) => {
    if (!user) return
    try {
      await deleteMessageForMe(msg.id, msg.deleted_for_users || [], user.id)
      setActiveMenuId(null)
    } catch(err:any) { toast.error(err.message) }
  }

  const handleReact = async (messageId: string, emoji: string) => {
    try {
      await toggleMessageReaction(messageId, emoji)
    } catch(err:any) { toast.error(err.message) }
  }

  const handlePin = (channelId: string) => {
    const newPinned = pinnedChannels.includes(channelId) 
      ? pinnedChannels.filter(id => id !== channelId) 
      : [...pinnedChannels, channelId]
    setPinnedChannels(newPinned)
    localStorage.setItem('student_os_pinned_channels', JSON.stringify(newPinned))
    setChannelMenuId(null)
  }

  const handleArchive = (channelId: string) => {
    const newArchived = [...archivedChannels, channelId]
    setArchivedChannels(newArchived)
    localStorage.setItem('student_os_archived_channels', JSON.stringify(newArchived))
    if (activeChannelId === channelId) setActiveChannelId(null)
    setChannelMenuId(null)
    toast.success('Đã lưu trữ phòng chat')
  }

  const handleUnarchive = (channelId: string) => {
    const newArchived = archivedChannels.filter(id => id !== channelId)
    setArchivedChannels(newArchived)
    localStorage.setItem('student_os_archived_channels', JSON.stringify(newArchived))
    toast.success('Đã hiện lại phòng chat')
  }

  const handleDeleteChannelClick = (channelId: string) => {
    setShowDeleteModal(channelId)
    setChannelMenuId(null)
  }

  const confirmDelete = async (channelId: string) => {
    try {
      await deleteChannel(channelId)
      setChannels(prev => prev.filter(c => c.id !== channelId))
      if (activeChannelId === channelId) setActiveChannelId(null)
      toast.success('Đã xóa phòng chat')
    } catch(err:any) { 
      toast.error(err.message || 'Bạn không có quyền xóa phòng chat này') 
    }
    setShowDeleteModal(null)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file)
        setAttachments(prev => [...prev, { type: 'image', url, file }])
      } else {
        toast.error('Chỉ hỗ trợ file hình ảnh hiện tại')
      }
    }
  }

  const activeChannel = channels.find(c => c.id === activeChannelId)

  const filteredMessages = messages.filter(msg => {
    if (showPinnedOnly && !msg.is_pinned) return false
    if (searchQuery.trim() && !msg.content?.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const parsePoll = (content: string) => {
    if (!content || !content.startsWith('📊 POLL:')) return null
    const lines = content.split('\n')
    const question = lines[0].replace('📊 POLL:', '').trim()
    const options = lines.slice(1).map(line => {
      const match = line.match(/^([1-9]️⃣|🔟)\s*(.*)$/)
      if (match) {
        return { emoji: match[1], text: match[2].trim() }
      }
      return null
    }).filter(Boolean) as { emoji: string, text: string }[]

    return { question, options }
  }

  const visibleChannels = channels
    .filter(ch => !archivedChannels.includes(ch.id))
    .sort((a, b) => {
      const aPin = pinnedChannels.includes(a.id)
      const bPin = pinnedChannels.includes(b.id)
      if (aPin && !bPin) return -1
      if (!aPin && bPin) return 1
      return 0
    })

  const getChannelDisplayInfo = (ch: typeof activeChannel) => {
    if (!ch) {
      // Sử dụng thông tin người chat được lưu khi mở private chat
      if (privateChatPartner) return privateChatPartner
      return { name: 'Chat riêng', avatar: null }
    }
    if (ch.description === 'Private Chat' && ch.chat_members) {
      const otherMember = ch.chat_members.find(m => m.user_id !== user?.id)
      if (otherMember?.profile) {
        return {
          name: otherMember.profile.full_name || 'Người dùng ẩn danh',
          avatar: otherMember.profile.avatar_url
        }
      }
      // profile chưa load nhưng channel đã có
      return { name: ch.name.replace('Chat với ', ''), avatar: null }
    }
    return {
      name: ch.name.replace('Chat với ', ''),
      avatar: ch.logo_url
    }
  }

  const { name: activeName, avatar: activeAvatar } = getChannelDisplayInfo(activeChannel)

  return (
    <div className={clsx(
      "flex bg-white dark:bg-surface-900 rounded-2xl shadow-sm border border-surface-200 dark:border-surface-700 overflow-hidden animate-fade-in",
      isMobile ? "h-[calc(100vh-10rem)]" : "h-[calc(100vh-8rem)]"
    )}>
      {/* Sidebar (Channel list) */}
      {(!isMobile || mobileView === 'list') && (
        <div className={clsx(
          "shrink-0",
          isMobile ? "w-full" : "w-64 border-r border-surface-200 dark:border-surface-700"
        )}>
          <ChannelSidebar
            channels={channels}
            activeChannelId={activeChannelId}
            unreadCounts={unreadCounts}
            pinnedChannels={pinnedChannels}
            archivedChannels={archivedChannels}
            userId={user?.id}
            onSelectChannel={(id) => {
              setActiveChannelId(id)
              setUnreadCounts(prev => { const n = {...prev}; delete n[id]; return n })
              setInput('')
              setAttachments([])
              setEditingMessageId(null)
              setReactionMessageId(null)
              setActiveMenuId(null)
              if (isMobile) {
                setMobileView('chat')
              }
            }}
            onPin={handlePin}
            onArchive={handleArchive}
            onUnarchive={handleUnarchive}
            onDelete={handleDeleteChannelClick}
            onSettings={(ch) => {
              setShowSettingsModal(true)
            }}
            onCreateChannel={() => setShowCreateModal(true)}
            getChannelDisplayInfo={getChannelDisplayInfo}
          />
        </div>
      )}

      {(!isMobile || mobileView === 'chat') && (
        <>
          <div className="flex-1 flex flex-col min-w-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] dark:bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] bg-repeat bg-center">
          <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {isMobile && (
                <button 
                  onClick={() => setMobileView('list')}
                  className="p-2 -ml-2 rounded-xl text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors shrink-0"
                  title="Quay lại"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0 overflow-hidden">
                {activeAvatar ? (
                  <img src={activeAvatar} className="w-full h-full object-cover" />
                ) : (
                  <Hash className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-surface-900 dark:text-white">{activeName}</h3>
                <p className="text-xs text-surface-500">{activeChannel?.description || 'Nơi kết nối cộng đồng học tập'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Search Toggle */}
              <button 
                onClick={() => {
                  setShowSearch(prev => !prev)
                  if (showSearch) setSearchQuery('')
                }}
                className={clsx(
                  "p-2 rounded-xl transition-colors",
                  showSearch
                    ? "text-primary-600 bg-primary-50 dark:bg-primary-500/10"
                    : "text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800"
                )}
                title="Tìm kiếm tin nhắn"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Pin Filter */}
              <button 
                onClick={() => setShowPinnedOnly(prev => !prev)}
                className={clsx(
                  "p-2 rounded-xl transition-colors",
                  showPinnedOnly
                    ? "text-primary-600 bg-primary-50 dark:bg-primary-500/10"
                    : "text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800"
                )}
                title="Tin nhắn đã ghim"
              >
                <Pin className="w-5 h-5" />
              </button>

              <button 
                onClick={() => {
                  if (isMobile) {
                    setShowMembersModal(true)
                  } else {
                    setShowMembersPanel(prev => !prev)
                  }
                }}
                className={clsx(
                  "p-2 rounded-xl transition-colors",
                  (!isMobile && showMembersPanel)
                    ? "text-primary-600 bg-primary-50 dark:bg-primary-500/10"
                    : "text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800"
                )}
                title="Thành viên"
              >
                <Users className="w-5 h-5" />
              </button>
              {(activeChannel?.role === 'owner' || activeChannel?.role === 'admin') && (
                <button 
                  onClick={() => setShowSettingsModal(true)}
                  className="p-2 rounded-xl text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                  title="Cài đặt cộng đồng"
                >
                  <Settings className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Search bar drop-down */}
          {showSearch && (
            <div className="px-6 py-2 bg-surface-50 dark:bg-surface-950/20 border-b border-surface-200 dark:border-surface-800 flex items-center gap-2 select-none animate-slide-down">
              <Search className="w-4 h-4 text-surface-450 shrink-0" />
              <input 
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm nội dung tin nhắn..."
                className="w-full bg-transparent border-none outline-none text-xs text-surface-700 dark:text-surface-200 placeholder-surface-400 py-1"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="p-1 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6 space-y-6" onScroll={handleScroll}>
            {loadingMore && (
              <div className="flex justify-center p-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
              </div>
            )}
            {loading && !loadingMore ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-surface-400">
                <div className="w-16 h-16 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-surface-400" />
                </div>
                <p className="font-medium text-surface-900 dark:text-white text-lg">Chưa có tin nhắn nào</p>
                <p className="mt-1 max-w-xs text-center text-sm text-surface-500">Hãy là người đầu tiên gửi tin nhắn để bắt đầu cuộc trò chuyện trong phòng này nhé!</p>
              </div>
            ) : (
              filteredMessages.map((msg, idx) => {
                const isMe = msg.user_id === user?.id
                const isFriend = friends.some(f => f.id === msg.user_id)
                const isAnonymous = !isMe && !isFriend

                const showAvatar = idx === 0 || messages[idx - 1].user_id !== msg.user_id
                const RankIcon = RANK_ICONS[msg.profile?.rank_tier || 'Bronze'] || ShieldAlert
                const rankColor = RANK_COLORS[msg.profile?.rank_tier || 'Bronze'] || RANK_COLORS.Bronze

                if (msg.deleted_for_users?.includes(user?.id || '')) return null

              const repliedMsg = msg.reply_to ? messages.find(m => m.id === msg.reply_to) : null

              return (
                <div key={msg.id} className="flex flex-col">
                  {/* Replied message header */}
                  {repliedMsg && (
                    <div className={clsx(
                      "flex items-center gap-1.5 text-2xs text-surface-400 mb-1 dark:text-surface-500",
                      isMe ? "justify-end pr-11" : "justify-start pl-11"
                    )}>
                      <span className="opacity-60">đang trả lời</span>
                      <span className="font-semibold text-primary-500">
                        @{repliedMsg.user_id === user?.id ? 'Bạn' : repliedMsg.profile?.full_name || 'Người dùng'}
                      </span>
                      <span className="truncate max-w-[200px] italic opacity-85">
                        {repliedMsg.content}
                      </span>
                    </div>
                  )}

                  <div className={clsx('flex gap-3', isMe ? 'flex-row-reverse' : 'flex-row')}>
                    <div className="w-8 shrink-0 flex flex-col items-center">
                      {showAvatar ? (
                        <div 
                          className="relative w-8 h-8 cursor-pointer shrink-0"
                          onClick={() => setSelectedProfileId(msg.user_id)}
                        >
                          <div className="w-full h-full rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center overflow-hidden">
                            {isAnonymous ? (
                              <User className="w-4 h-4 text-primary-400" />
                            ) : msg.profile?.avatar_url ? (
                              <img src={msg.profile.avatar_url} className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-bold text-sm text-primary-600 dark:text-primary-400">
                                {msg.profile?.full_name?.charAt(0) || 'U'}
                              </span>
                            )}
                          </div>
                          <div className={clsx('absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white dark:bg-surface-900 flex items-center justify-center border border-white dark:border-surface-900 z-10', rankColor)}>
                            <RankIcon className="w-2.5 h-2.5" strokeWidth={3} />
                          </div>
                        </div>
                      ) : <div className="w-8" />}
                    </div>
                    
                    <div className={clsx('flex flex-col relative group/msg max-w-[70%]', isMe ? 'items-end' : 'items-start')}>
                      {showAvatar && (
                        <div className="flex items-center gap-2 mb-1 px-1">
                          <span className="text-xs font-semibold text-surface-700 dark:text-surface-300">
                            {isMe ? 'Bạn' : (isAnonymous ? 'Người dùng ẩn danh' : msg.profile?.full_name)}
                          </span>
                          <span className="text-2xs text-surface-400">
                            {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                      
                      <div className={clsx('flex items-center gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}>
                        <div className={clsx(
                          'p-3 rounded-2xl relative transition-opacity',
                          (msg as any).is_optimistic && 'opacity-50',
                          isMe ? 'bg-primary-500 text-white rounded-tr-sm' : 'bg-white dark:bg-surface-800 text-surface-900 dark:text-white rounded-tl-sm shadow-sm border border-surface-200 dark:border-surface-700'
                        )}>
                          {msg.is_deleted ? (
                            <span className="italic opacity-60 text-sm">Tin nhắn đã bị thu hồi</span>
                          ) : (
                            <>
                              {msg.content && (() => {
                                const poll = parsePoll(msg.content)
                                if (poll) {
                                  const totalVotes = poll.options.reduce((sum, opt) => sum + (msg.reactions?.[opt.emoji]?.length || 0), 0)
                                  return (
                                    <div className="w-64 sm:w-80 p-1.5 text-left text-surface-900 dark:text-white">
                                      <p className="font-bold text-sm mb-3 flex items-center gap-1.5 text-primary-500">
                                        <Vote className="w-4 h-4 shrink-0" />
                                        {poll.question}
                                      </p>
                                      <div className="space-y-2">
                                        {poll.options.map(opt => {
                                          const votes = msg.reactions?.[opt.emoji]?.length || 0
                                          const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0
                                          const hasVoted = user && (msg.reactions?.[opt.emoji] || []).includes(user.id)
                                          return (
                                            <button 
                                              key={opt.emoji}
                                              onClick={() => handleReact(msg.id, opt.emoji)}
                                              className={clsx(
                                                "w-full block relative p-2.5 rounded-xl border text-left overflow-hidden transition-all",
                                                hasVoted 
                                                  ? "border-primary-500 dark:border-primary-400 bg-primary-50/20 dark:bg-primary-500/10" 
                                                  : "border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/40 hover:bg-surface-100/50 dark:hover:bg-surface-700/40"
                                              )}
                                            >
                                              {/* Background progress bar fill */}
                                              <div 
                                                className="absolute left-0 top-0 bottom-0 bg-primary-500/10 dark:bg-primary-500/15 transition-all duration-300"
                                                style={{ width: `${percent}%` }}
                                              />
                                              {/* Content */}
                                              <div className="relative flex items-center justify-between gap-2 text-xs">
                                                <span className="font-medium truncate flex-1 flex items-center gap-1.5">
                                                  <span>{opt.emoji}</span>
                                                  <span className={clsx(hasVoted ? "font-bold text-primary-500 dark:text-primary-400" : "text-surface-700 dark:text-surface-200")}>
                                                    {opt.text}
                                                  </span>
                                                </span>
                                                <span className="font-semibold text-surface-500 dark:text-surface-400 shrink-0">
                                                  {votes} ({percent}%)
                                                </span>
                                              </div>
                                            </button>
                                          )
                                        })}
                                      </div>
                                      <p className="text-[10px] text-surface-400 dark:text-surface-500 mt-3 text-right">
                                        Tổng số vote: {totalVotes}
                                      </p>
                                    </div>
                                  )
                                }
                                return (
                                  <div className={clsx(isMe && "prose-p:text-white prose-strong:text-white prose-code:text-white dark:prose-code:text-white dark:prose-p:text-white prose-a:text-white hover:prose-a:text-white/80")}>
                                    <MarkdownMessage content={msg.content} />
                                  </div>
                                )
                              })()}
                              {msg.is_edited && <span className="text-2xs opacity-60 italic mt-1 block">(Đã chỉnh sửa)</span>}
                              {msg.attachments?.map((att: any, i: number) => (
                                <div key={i} className="mt-2 rounded-lg overflow-hidden border border-black/10">
                                  {att.type === 'image' && <img src={att.url} alt="attachment" className="max-w-full h-auto max-h-48 object-cover" />}
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                        
                        <div className="relative flex items-center gap-1">
                          <button 
                            onClick={() => setReactionMessageId(reactionMessageId === msg.id ? null : msg.id)}
                            className={clsx(
                              "p-1.5 rounded-full text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-opacity",
                              reactionMessageId === msg.id ? "opacity-100" : "opacity-0 group-hover/msg:opacity-100"
                            )}
                          >
                            <SmilePlus className="w-4 h-4" />
                          </button>

                          <button 
                            onClick={() => setActiveMenuId(activeMenuId === msg.id ? null : msg.id)}
                            className={clsx(
                              "p-1.5 rounded-full text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-opacity",
                              activeMenuId === msg.id ? "opacity-100" : "opacity-0 group-hover/msg:opacity-100"
                            )}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {reactionMessageId === msg.id && (
                            <div className={clsx("absolute top-8 z-20 shadow-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-full py-1.5 px-2 flex items-center gap-1", isMe ? "right-0" : "left-0")}>
                              {['👍', '❤️', '😂', '😮', '😢', '🙏', '🚀', '🔥', '💯', '✨'].map(emoji => (
                                 <button 
                                   key={emoji} 
                                   onClick={() => { handleReact(msg.id, emoji); setReactionMessageId(null); }}
                                   className="text-xl hover:scale-125 transition-transform px-1"
                                 >
                                   {emoji}
                                 </button>
                              ))}
                              <button 
                                onClick={() => { setFullEmojiMessageId(msg.id); setReactionMessageId(null); }}
                                className="w-7 h-7 rounded-full bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 flex items-center justify-center ml-1 text-surface-500"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          {fullEmojiMessageId === msg.id && (
                            <div className={clsx("absolute top-8 z-30 shadow-2xl rounded-2xl overflow-hidden", isMe ? "right-0" : "left-0")}>
                              <div className="relative">
                                <EmojiPicker 
                                  onEmojiClick={(e) => { 
                                    handleReact(msg.id, e.emoji); 
                                    setFullEmojiMessageId(null); 
                                  }} 
                                  width={300} 
                                  height={350} 
                                />
                                <button 
                                  onClick={() => setFullEmojiMessageId(null)}
                                  className="absolute top-2 right-12 p-1.5 bg-surface-100/80 hover:bg-surface-200 rounded-full z-10 text-surface-600"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}

                          {activeMenuId === msg.id && (
                            <div className={clsx("absolute top-8 z-10 w-40 bg-white dark:bg-surface-800 rounded-xl shadow-lg border border-surface-200 dark:border-surface-700 py-1", isMe ? "right-0" : "left-0")}>
                               {!msg.is_deleted && (
                                  <>
                                    <button onClick={() => { setReplyMessage(msg); setActiveMenuId(null) }} className="w-full text-left px-4 py-2 text-sm hover:bg-surface-100 dark:hover:bg-surface-700">Trả lời</button>
                                    <button onClick={() => { pinMessage(msg.id, !msg.is_pinned); setActiveMenuId(null) }} className="w-full text-left px-4 py-2 text-sm hover:bg-surface-100 dark:hover:bg-surface-700">
                                      {msg.is_pinned ? 'Bỏ ghim' : 'Ghim tin nhắn'}
                                    </button>
                                  </>
                                )}
                              {isMe && !msg.is_deleted && (
                                <>
                                  <button onClick={() => { setEditingMessageId(msg.id); setInput(msg.content); setAttachments([]); setActiveMenuId(null) }} className="w-full text-left px-4 py-2 text-sm hover:bg-surface-100 dark:hover:bg-surface-700">Sửa tin nhắn</button>
                                  <button onClick={() => handleUnsend(msg.id)} className="w-full text-left px-4 py-2 text-sm hover:bg-surface-100 dark:hover:bg-surface-700">Thu hồi</button>
                                </>
                              )}
                              <button onClick={() => handleDeleteForMe(msg)} className="w-full text-left px-4 py-2 text-sm hover:bg-surface-100 dark:hover:bg-surface-700 text-danger-500">Xóa phía tôi</button>
                              {!isMe && (
                                <button onClick={() => { setReportData({ userId: msg.user_id, messageId: msg.id }); setActiveMenuId(null) }} className="w-full text-left px-4 py-2 text-sm hover:bg-surface-100 dark:hover:bg-surface-700 text-danger-500 border-t border-surface-200 dark:border-surface-700">Báo cáo</button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className={clsx("flex flex-wrap gap-1 mt-1", isMe ? 'justify-end' : 'justify-start')}>
                          {Object.entries(msg.reactions).map(([emoji, users]) => {
                             const hasReacted = user && (users as string[]).includes(user.id);
                             return (
                               <button
                                 key={emoji}
                                 onClick={() => handleReact(msg.id, emoji)}
                                 className={clsx(
                                   "flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-xs border transition-colors",
                                   hasReacted 
                                    ? "bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-800 text-primary-600 dark:text-primary-400" 
                                    : "bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700"
                                 )}
                               >
                                 <span>{emoji}</span>
                                 <span className="font-medium">{users.length}</span>
                               </button>
                             )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
            <div ref={messagesEndRef} />
          </div>

          {replyMessage && (
            <div className="px-6 py-2 bg-surface-100/90 dark:bg-surface-900/90 border-t border-surface-200 dark:border-surface-800 flex items-center justify-between gap-3 text-xs text-surface-500 select-none animate-slide-up">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-medium opacity-65">Đang trả lời</span>
                <span className="font-bold text-primary-500">@{replyMessage.profile?.full_name || 'Người dùng'}</span>
                <span className="truncate italic opacity-75">"{replyMessage.content}"</span>
              </div>
              <button 
                onClick={() => setReplyMessage(null)}
                className="p-1 rounded-full hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <MessageInput 
            input={input}
            setInput={setInput}
            handleSend={handleSend}
            attachments={attachments}
            setAttachments={setAttachments}
            showEmojiPicker={showEmojiPicker}
            setShowEmojiPicker={setShowEmojiPicker}
            fileInputRef={fileInputRef}
            handleFileSelect={handleFileSelect}
            sending={sending}
            activeChannelId={activeChannelId}
            activeChannel={activeChannel}
          />
        </div>

        {/* Right side Members Panel (Discord style) */}
        {!isMobile && showMembersPanel && activeChannelId && (
          <div className="w-60 border-l border-surface-200 dark:border-surface-700 shrink-0">
            <MembersPanel 
              channelId={activeChannelId}
              userId={user?.id}
              onMemberClick={(uid) => setSelectedProfileId(uid)}
            />
          </div>
        )}
      </>
    )}

      {showMembersModal && activeChannelId && (
        <ChatMembersModal 
          channelId={activeChannelId} 
          onClose={() => setShowMembersModal(false)} 
          onMemberClick={id => {
            setShowMembersModal(false)
            setSelectedProfileId(id)
          }}
        />
      )}

      {showCreateModal && (
        <CreateCommunityModal 
          onClose={() => setShowCreateModal(false)}
          onSuccess={(newId) => {
            setShowCreateModal(false)
            window.location.reload()
          }}
        />
      )}

      {selectedProfileId && (
        <UserProfileModal 
          userId={selectedProfileId}
          onClose={() => setSelectedProfileId(null)}
          onDirectMessage={async (targetId, targetName) => {
            if (!user) return
            try {
              // Lấy thông tin người chat để hiển thị ngưền (trước khi channel load xong)
              const { data: partnerProfile } = await supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('id', targetId)
                .single()

              setPrivateChatPartner({
                name: partnerProfile?.full_name || targetName || 'Người dùng',
                avatar: partnerProfile?.avatar_url || null
              })

              // Dùng RPC để tìm hoặc tạo phòng chat — đảm bảo chỉ có 1 phòng duy nhất giữa 2 người
              const { data: channelId, error } = await supabase.rpc('get_or_create_private_chat', {
                other_user_id: targetId
              })

              if (error) throw error

              // Tải lại danh sách kênh để có đầy đủ thông tin chat_members
              const { getChannels } = await import('@/services/community')
              const freshChannels = await getChannels()

              // Batch 2 state update cùng lúc để tránh render trạng thái trung gian
              const { flushSync } = await import('react-dom')
              flushSync(() => {
                setChannels(freshChannels)
                setActiveChannelId(channelId as string)
              })

              setSelectedProfileId(null)
            } catch (error: any) {
              console.error('Lỗi tạo phòng chat riêng:', error)
              toast.error('Lỗi tạo phòng chat: ' + (error.message || 'Vui lòng thử lại'))
              setPrivateChatPartner(null)
            }
          }}
        />
      )}

      {showSettingsModal && activeChannel && (
        <CommunitySettingsModal
          channel={activeChannel}
          onClose={() => setShowSettingsModal(false)}
          onSuccess={() => {
            setShowSettingsModal(false)
            window.location.reload()
          }}
        />
      )}

      {reportData && (
        <ReportModal 
          isOpen={true} 
          onClose={() => setReportData(null)}
          reportedUserId={reportData.userId}
          messageId={reportData.messageId}
        />
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-danger-100 dark:bg-danger-500/20 text-danger-500 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-surface-900 dark:text-white mb-2">Xóa phòng chat?</h3>
              <p className="text-surface-500 dark:text-surface-400 text-sm">
                Bạn có chắc chắn muốn xóa phòng chat này không?
              </p>
            </div>
            <div className="flex border-t border-surface-200 dark:border-surface-700">
              <button 
                onClick={() => setShowDeleteModal(null)}
                className="flex-1 py-3 text-surface-600 dark:text-surface-300 font-medium hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={() => confirmDelete(showDeleteModal)}
                className="flex-1 py-3 text-danger-600 dark:text-danger-400 font-semibold hover:bg-danger-50 dark:hover:bg-danger-500/10 transition-colors border-l border-surface-200 dark:border-surface-700"
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

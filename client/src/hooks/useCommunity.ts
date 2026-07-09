import { useState, useEffect, useCallback } from 'react'
import * as communityService from '@/services/community'
import type { ChatChannel, CommunityMessage } from '@/types'
import { supabase } from '@/lib/supabase'

export function useCommunity(activeChannelId: string | null) {
  const [channels, setChannels] = useState<ChatChannel[]>([])
  const [messages, setMessages] = useState<CommunityMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user))
  }, [])

  // Tải danh sách channel ban đầu + polling fallback mỗi 10s
  useEffect(() => {
    const fetchChannels = () => {
      communityService.getChannels()
        .then(data => {
          setChannels(data)
          if (data.length === 0) setError('Không tìm thấy kênh nào')
        })
        .catch(e => setError(e.message))
    }

    fetchChannels()

    // Polling fallback mỗi 10 giây để đảm bảo Private Chat mới từ người kia luôn xuất hiện
    const pollInterval = setInterval(fetchChannels, 10000)

    // Lắng nghe kênh mới được thêm vào qua Realtime (nhanh hơn polling)
    const channelsSub = supabase
      .channel(`public:chat_members:new:${currentUser?.id || 'all'}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_members',
          filter: currentUser ? `user_id=eq.${currentUser.id}` : undefined
        },
        async () => {
          const freshChannels = await communityService.getChannels()
          setChannels(freshChannels)
        }
      )
      .subscribe()

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(channelsSub)
    }
  }, [currentUser?.id])

  // Tải tin nhắn khi đổi channel
  useEffect(() => {
    if (!activeChannelId) return
    
    setLoading(true)
    setHasMore(true)
    communityService.getMessages(activeChannelId, 50)
      .then(data => {
        setMessages(data.reverse())
        if (data.length < 50) setHasMore(false)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))

    // Đăng ký realtime
    const channel = supabase.channel(`public:community_messages:channel_id=eq.${activeChannelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'community_messages', filter: `channel_id=eq.${activeChannelId}` },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Lấy tin nhắn mới cùng với profile
            const { data } = await supabase
              .from('community_messages')
              .select('*, profile:profiles(id, full_name, avatar_url, rank_tier, level)')
              .eq('id', payload.new.id)
              .single()
              
            if (data) {
              setMessages(prev => {
                // Tránh duplicate do optimistic UI
                if (prev.find(m => m.id === payload.new.id || (m as any).tempId === payload.new.content)) return prev
                return [...prev, data as CommunityMessage]
              })
            }
          } else if (payload.eventType === 'UPDATE') {
            // Cập nhật tin nhắn (reactions, content, deleted status)
            setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m))
          } else if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(m => m.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeChannelId])

  const sendMessage = useCallback(async (content: string, attachments: any[] | null = null, replyTo: string | null = null) => {
    if (!activeChannelId) return
    
    const tempId = `temp-${Date.now()}`
    const optimisticMessage: any = {
      id: tempId,
      tempId: content, // Dùng content làm mỏ neo tránh duplicate
      channel_id: activeChannelId,
      user_id: currentUser?.id || '',
      content,
      attachments,
      is_pinned: false,
      reply_to: replyTo,
      created_at: new Date().toISOString(),
      profile: { full_name: 'Đang gửi...', avatar_url: null },
      is_optimistic: true
    }

    setMessages(prev => [...prev, optimisticMessage])

    try {
      const realMsg = await communityService.sendMessage(activeChannelId, content, attachments, replyTo)
      setMessages(prev => prev.map(m => m.id === tempId ? realMsg : m))
    } catch (e: any) {
      setError(e.message)
      setMessages(prev => prev.filter(m => m.id !== tempId))
    }
  }, [activeChannelId, currentUser])

  const loadMore = useCallback(async () => {
    if (!activeChannelId || loadingMore || !hasMore || messages.length === 0) return
    
    setLoadingMore(true)
    try {
      const oldestMessage = messages[0]
      const olderMessages = await communityService.getMessages(activeChannelId, 50, oldestMessage.created_at)
      
      if (olderMessages.length < 50) {
        setHasMore(false)
      }
      
      setMessages(prev => [...olderMessages.reverse(), ...prev])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoadingMore(false)
    }
  }, [activeChannelId, messages, loadingMore, hasMore])

  const pinMessage = useCallback(async (messageId: string, isPinned: boolean) => {
    try {
      await communityService.pinMessage(messageId, isPinned)
      // Update local state optimistic
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_pinned: isPinned } : m))
    } catch (e: any) {
      setError(e.message)
    }
  }, [])

  return { channels, setChannels, messages, loading, loadingMore, hasMore, loadMore, error, sendMessage, pinMessage }
}

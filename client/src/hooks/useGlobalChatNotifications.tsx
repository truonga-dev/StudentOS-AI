import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { getChannels } from '@/services/community'
import { useAuth } from '@/hooks/useAuth'

/**
 * Hook này chạy GLOBAL — gắn ở AppLayout để luôn lắng nghe tin nhắn mới
 * dù người dùng đang ở bất kỳ trang nào trong app.
 */
export function useGlobalChatNotifications() {
  const { user } = useAuth()
  const navigate = useNavigate()
  // Lưu ref đến channelId người dùng đang mở để bỏ qua thông báo kênh đó
  const activeChannelIdRef = useRef<string | null>(null)
  // Lưu ref danh sách subscription để dọn dẹp đúng cách
  const subscriptionsRef = useRef<ReturnType<typeof supabase.channel>[]>([])

  // Expose setter để CommunityChatPage có thể cập nhật kênh đang active
  useEffect(() => {
    // Ghi vào window object để CommunityChatPage có thể set
    ;(window as any).__setActiveCommunityChannel = (id: string | null) => {
      activeChannelIdRef.current = id
    }
    return () => {
      delete (window as any).__setActiveCommunityChannel
    }
  }, [])

  useEffect(() => {
    if (!user) return

    let isMounted = true

    const setupSubscriptions = async () => {
      try {
        const channels = await getChannels()
        if (!isMounted) return

        // Dọn subscriptions cũ trước
        subscriptionsRef.current.forEach(sub => supabase.removeChannel(sub))
        subscriptionsRef.current = []

        const subs = channels.map(ch => {
          return supabase
            .channel(`global_notify:${ch.id}`)
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'community_messages',
                filter: `channel_id=eq.${ch.id}`,
              },
              async (payload: any) => {
                // Bỏ qua tin nhắn của chính mình
                if (payload.new.user_id === user.id) return
                // Bỏ qua nếu người dùng đang ở kênh đó
                if (activeChannelIdRef.current === ch.id) return

                // Lấy thông tin người gửi
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('full_name, avatar_url')
                  .eq('id', payload.new.user_id)
                  .single()

                const senderName = profile?.full_name || 'Ai đó'
                const roomName = ch.name || 'Phòng chat'
                const content = payload.new.content || '📎 Đã gửi file'
                const shortContent =
                  content.length > 45 ? content.slice(0, 45) + '...' : content

                toast(
                  (t) => (
                    <div
                      className="flex items-start gap-3 cursor-pointer"
                      onClick={() => {
                        navigate(`/community?channel=${ch.id}`)
                        toast.dismiss(t.id)
                      }}
                    >
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          className="w-10 h-10 rounded-full object-cover shrink-0 mt-0.5"
                          alt={senderName}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center shrink-0">
                          <span className="text-primary-400 font-bold text-sm">
                            {senderName[0]}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white leading-tight">
                          {senderName}{' '}
                          <span className="text-xs text-surface-400 font-normal">
                            · #{roomName}
                          </span>
                        </p>
                        <p className="text-xs text-surface-300 mt-0.5 leading-snug">
                          {shortContent}
                        </p>
                      </div>
                    </div>
                  ),
                  {
                    duration: 5000,
                    style: {
                      background: '#1e1e2e',
                      border: '1px solid #7c3aed40',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      minWidth: '280px',
                    },
                  }
                )
              }
            )
            .subscribe()
        })

        subscriptionsRef.current = subs
      } catch (err) {
        console.error('[GlobalChatNotifications] setup error:', err)
      }
    }

    setupSubscriptions()

    return () => {
      isMounted = false
      subscriptionsRef.current.forEach(sub => supabase.removeChannel(sub))
      subscriptionsRef.current = []
    }
  }, [user?.id, navigate])
}

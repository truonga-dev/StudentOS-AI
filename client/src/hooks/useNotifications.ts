import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface AppNotification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  is_read: boolean
  link?: string
  created_at: string
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setNotifications(data || [])
    } catch (err) {
      console.error('Error loading notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNotifications()

    // Setup realtime subscription (sync, không async để tránh lỗi subscribe order)
    let channel: ReturnType<typeof supabase.channel> | null = null

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return

      const channelName = `notifications-${session.user.id}-${Date.now()}`
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${session.user.id}`
          },
          (payload) => {
            const newNotif = payload.new as AppNotification
            setNotifications(prev => [newNotif, ...prev])
          }
        )
        .subscribe()
    })

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [loadNotifications])

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  }

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', session.user.id).eq('is_read', false)
  }

  const clearAll = async () => {
    setNotifications([])
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('notifications').delete().eq('user_id', session.user.id)
  }

  return {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    clearAll
  }
}

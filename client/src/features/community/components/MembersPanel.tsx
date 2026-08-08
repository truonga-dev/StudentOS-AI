import { useEffect, useState, useRef } from 'react'
import { Users, Circle } from 'lucide-react'
import { clsx } from 'clsx'
import { supabase } from '@/lib/supabase'

interface MemberProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
  rank_tier?: string
  level?: number
}

interface MembersPanelProps {
  channelId: string | null
  userId: string | undefined
  onMemberClick: (userId: string) => void
}

import { RANK_CONFIG } from '@/lib/ranks'

export function MembersPanel({ channelId, userId, onMemberClick }: MembersPanelProps) {
  const [members, setMembers] = useState<MemberProfile[]>([])
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Load channel members from DB
  useEffect(() => {
    if (!channelId) {
      setMembers([])
      return
    }
    setLoading(true)
    supabase
      .from('chat_members')
      .select('profile:profiles(id, full_name, avatar_url, rank_tier, level)')
      .eq('channel_id', channelId)
      .then(({ data, error }) => {
        if (!error && data) {
          const profiles = data
            .map((d: any) => d.profile)
            .filter(Boolean) as MemberProfile[]
          setMembers(profiles)
        }
        setLoading(false)
      })
  }, [channelId])

  // Supabase Presence để track trạng thái online realtime
  useEffect(() => {
    if (!userId) return

    // Remove old channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const presenceChannel = supabase.channel('community:presence', {
      config: { presence: { key: userId } },
    })

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const ids = new Set(Object.keys(state))
        setOnlineIds(ids)
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineIds(prev => new Set([...prev, key]))
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineIds(prev => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ user_id: userId, online_at: new Date().toISOString() })
        }
      })

    channelRef.current = presenceChannel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userId])

  const onlineMembers = members.filter(m => onlineIds.has(m.id))
  const offlineMembers = members.filter(m => !onlineIds.has(m.id))

  const renderMember = (m: MemberProfile, isOnline: boolean) => {
    const isMe = m.id === userId
    let dotStyle = {}
    let dotClass = ''

    if (isOnline) {
      dotClass = 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
    } else {
      dotStyle = { backgroundColor: RANK_CONFIG[m.rank_tier || 'Bronze']?.color || '#cd7f32' }
    }

    return (
      <button
        key={m.id}
        onClick={() => onMemberClick(m.id)}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800/70 transition-colors group"
      >
        {/* Avatar + online dot */}
        <div className="relative shrink-0">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            {m.avatar_url
              ? <img src={m.avatar_url} alt={m.full_name || ''} className={clsx('w-full h-full object-cover', !isOnline && 'opacity-50 grayscale')} />
              : <span className={clsx('text-sm font-bold text-primary-600 dark:text-primary-400', !isOnline && 'opacity-40')}>
                {m.full_name?.charAt(0) || '?'}
              </span>
            }
          </div>
          {/* Online / offline dot */}
          <span className={clsx(
            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-surface-950',
            isOnline ? 'bg-emerald-500' : 'bg-surface-400'
          )} />
        </div>

        {/* Name + rank */}
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={clsx(
              'text-xs font-semibold truncate',
              isOnline
                ? 'text-surface-800 dark:text-surface-100'
                : 'text-surface-400 dark:text-surface-500'
            )}>
              {m.full_name || 'Người dùng'}
              {isMe && <span className="ml-1 text-[9px] font-normal opacity-60">(Bạn)</span>}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dotClass)} style={dotStyle} />
            <span className="text-[10px] text-surface-400">
              {RANK_CONFIG[m.rank_tier || 'Bronze']?.label || 'Đồng'} · Lv.{m.level || 1}
            </span>
          </div>
        </div>
      </button>
    )
  }

  if (!channelId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-surface-400 px-4">
        <Users className="w-8 h-8 mb-2 opacity-30" />
        <p className="text-xs text-center">Chọn một kênh để xem thành viên</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-surface-50/80 dark:bg-surface-950/40 overflow-hidden">
      {/* Panel header */}
      <div className="px-4 py-3.5 border-b border-surface-200/80 dark:border-surface-800">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-surface-400" />
          <h3 className="text-xs font-bold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
            Thành viên
          </h3>
          <span className="ml-auto text-xs font-semibold text-surface-400 bg-surface-200 dark:bg-surface-800 px-1.5 py-0.5 rounded-full">
            {members.length}
          </span>
        </div>
      </div>

      {/* Members list */}
      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-surface-300 dark:scrollbar-thumb-surface-700">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Online members */}
            {onlineMembers.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-1.5 px-4 mb-2">
                  <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />
                  <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">
                    Đang online — {onlineMembers.length}
                  </span>
                </div>
                <div className="space-y-0.5 px-1">
                  {onlineMembers.map(m => renderMember(m, true))}
                </div>
              </div>
            )}

            {/* Offline members */}
            {offlineMembers.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-4 mb-2">
                  <Circle className="w-2 h-2 fill-surface-400 text-surface-400" />
                  <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">
                    Ngoại tuyến — {offlineMembers.length}
                  </span>
                </div>
                <div className="space-y-0.5 px-1">
                  {offlineMembers.map(m => renderMember(m, false))}
                </div>
              </div>
            )}

            {/* No members */}
            {members.length === 0 && (
              <div className="text-center py-8 px-4">
                <Users className="w-7 h-7 mx-auto mb-2 text-surface-300 dark:text-surface-600" />
                <p className="text-xs text-surface-400">Chưa có thành viên</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

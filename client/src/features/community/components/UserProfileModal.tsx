import { useState, useEffect } from 'react'
import { X, ShieldAlert, Shield, Award, Star, Trophy, Loader2, UserPlus, UserCheck, UserMinus, MessageCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { getProfile, sendFriendRequest, getFriendshipStatus, deleteFriendship, acceptFriendRequest } from '@/services/social'
import { useAuth } from '@/hooks/useAuth'
import type { Profile, Friendship } from '@/types'
import toast from 'react-hot-toast'

interface UserProfileModalProps {
  userId: string
  onClose: () => void
  onDirectMessage?: (userId: string, userName: string) => void
}

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

export function UserProfileModal({ userId, onClose, onDirectMessage }: UserProfileModalProps) {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [friendship, setFriendship] = useState<Friendship | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const isMe = user?.id === userId

  useEffect(() => {
    loadData()
  }, [userId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [profData, friendData] = await Promise.all([
        getProfile(userId),
        isMe ? Promise.resolve(null) : getFriendshipStatus(userId)
      ])
      setProfile(profData)
      setFriendship(friendData)
    } catch (error: any) {
      toast.error('Lỗi tải thông tin người dùng')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleAddFriend = async () => {
    setActionLoading(true)
    try {
      const data = await sendFriendRequest(userId)
      setFriendship(data)
      toast.success('Đã gửi lời mời kết bạn')
    } catch (error: any) {
      toast.error(error.message || 'Lỗi gửi kết bạn')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAcceptFriend = async () => {
    if (!friendship) return
    setActionLoading(true)
    try {
      await acceptFriendRequest(friendship.id)
      setFriendship({ ...friendship, status: 'accepted' })
      toast.success('Đã chấp nhận kết bạn')
    } catch (error: any) {
      toast.error(error.message || 'Lỗi thực hiện')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnfriendOrCancel = async () => {
    if (!friendship) return
    setActionLoading(true)
    try {
      await deleteFriendship(friendship.id)
      setFriendship(null)
      toast.success('Đã hủy')
    } catch (error: any) {
      toast.error(error.message || 'Lỗi thực hiện')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading || !profile) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-surface-900/50 backdrop-blur-sm">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    )
  }

  const RankIcon = RANK_ICONS[profile.rank_tier || 'Bronze'] || ShieldAlert
  const rankColor = RANK_COLORS[profile.rank_tier || 'Bronze'] || RANK_COLORS.Bronze

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Cover */}
        <div className="h-32 bg-primary-100 dark:bg-primary-900/30 relative">
          {profile.cover_url && (
            <img src={profile.cover_url} className="w-full h-full object-cover" alt="Cover" />
          )}
          <button onClick={onClose} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors backdrop-blur-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info */}
        <div className="px-6 pb-6 relative">
          <div className="flex justify-between items-end mb-4">
            <div className="w-20 h-20 rounded-full border-4 border-white dark:border-surface-900 bg-surface-200 dark:bg-surface-800 -mt-10 overflow-hidden relative shadow-sm">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold bg-primary-500 text-white">
                  {profile.full_name?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            {!isMe && (
              <div className="flex gap-2">
                {friendship?.status === 'accepted' ? (
                  <button 
                    onClick={handleUnfriendOrCancel}
                    disabled={actionLoading}
                    className="btn btn-secondary px-3 py-1.5 text-xs"
                    title="Hủy kết bạn"
                  >
                    <UserCheck className="w-4 h-4 mr-1" /> Bạn bè
                  </button>
                ) : friendship?.status === 'pending' ? (
                  friendship.user_id_2 === user?.id ? (
                    <>
                      <button 
                        onClick={handleAcceptFriend}
                        disabled={actionLoading}
                        className="btn btn-primary px-3 py-1.5 text-xs"
                        title="Chấp nhận"
                      >
                        Chấp nhận
                      </button>
                      <button 
                        onClick={handleUnfriendOrCancel}
                        disabled={actionLoading}
                        className="btn btn-secondary px-3 py-1.5 text-xs"
                        title="Từ chối"
                      >
                        Từ chối
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={handleUnfriendOrCancel}
                      disabled={actionLoading}
                      className="btn btn-secondary px-3 py-1.5 text-xs"
                      title="Hủy yêu cầu"
                    >
                      Đang chờ...
                    </button>
                  )
                ) : (
                  <button 
                    onClick={handleAddFriend}
                    disabled={actionLoading}
                    className="btn btn-primary px-3 py-1.5 text-xs"
                  >
                    <UserPlus className="w-4 h-4 mr-1" /> Kết bạn
                  </button>
                )}

                <button 
                  onClick={() => {
                    onClose()
                    onDirectMessage?.(userId, profile.full_name || 'Người dùng ẩn danh')
                  }}
                  className="btn btn-secondary px-2 py-1.5"
                  title="Nhắn tin riêng"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div>
            <h3 className="font-bold text-xl text-surface-900 dark:text-white flex items-center gap-2">
              {profile.full_name || 'Người dùng ẩn danh'}
            </h3>
            
            <div className="flex items-center gap-3 mt-2">
              <div className={clsx("flex items-center gap-1 text-sm font-semibold", rankColor)}>
                <RankIcon className="w-4 h-4" />
                {profile.rank_tier}
              </div>
              <div className="text-sm font-medium text-surface-500">
                Level {profile.level}
              </div>
              <div className="text-sm font-medium text-surface-500">
                {profile.xp} XP
              </div>
            </div>

            {profile.bio && (
              <p className="mt-4 text-sm text-surface-600 dark:text-surface-300 bg-surface-50 dark:bg-surface-800/50 p-3 rounded-xl">
                {profile.bio}
              </p>
            )}
            
            {!profile.bio && (
              <p className="mt-4 text-sm text-surface-400 italic">
                Chưa có phần giới thiệu.
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

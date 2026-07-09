import { useState, useEffect } from 'react'
import { X, ShieldAlert, Shield, Award, Star, Trophy, Loader2, UserMinus, UserPlus, ArrowLeft } from 'lucide-react'
import { clsx } from 'clsx'
import { getMembers, kickMember, addMember } from '@/services/community'
import { getFriends } from '@/services/social'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

interface ChatMembersModalProps {
  channelId: string
  onClose: () => void
  onMemberClick?: (userId: string) => void
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

export function ChatMembersModal({ channelId, onClose, onMemberClick }: ChatMembersModalProps) {
  const { user } = useAuth()
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [myRole, setMyRole] = useState<'owner' | 'admin' | 'member'>('member')
  
  const [isInviting, setIsInviting] = useState(false)
  const [friends, setFriends] = useState<any[]>([])
  const [loadingFriends, setLoadingFriends] = useState(false)

  useEffect(() => {
    loadMembers()
  }, [channelId])

  const loadMembers = async () => {
    try {
      const data = await getMembers(channelId)
      setMembers(data)
      const me = data.find((m: any) => m.user_id === user?.id)
      if (me) setMyRole(me.role)
    } catch (error: any) {
      toast.error(error.message || 'Lỗi tải danh sách thành viên')
    } finally {
      setLoading(false)
    }
  }

  const loadFriends = async () => {
    setLoadingFriends(true)
    try {
      const data = await getFriends()
      setFriends(data)
    } catch (error: any) {
      toast.error(error.message || 'Lỗi tải danh sách bạn bè')
    } finally {
      setLoadingFriends(false)
    }
  }

  const handleKick = async (userId: string) => {
    if (!confirm('Bạn có chắc chắn muốn kick thành viên này khỏi nhóm?')) return
    try {
      await kickMember(channelId, userId)
      toast.success('Đã kick thành viên')
      setMembers(prev => prev.filter(m => m.user_id !== userId))
    } catch (error: any) {
      toast.error(error.message || 'Lỗi kick thành viên')
    }
  }

  const handleAddMember = async (userId: string) => {
    try {
      await addMember(channelId, userId)
      toast.success('Đã thêm thành viên')
      // reload members
      loadMembers()
      setIsInviting(false)
    } catch (error: any) {
      toast.error(error.message || 'Lỗi thêm thành viên')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
          <div className="flex items-center gap-2">
            {isInviting && (
              <button 
                onClick={() => setIsInviting(false)}
                className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors mr-1"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h3 className="font-bold text-lg">{isInviting ? 'Thêm thành viên' : `Thành viên (${members.length})`}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isInviting ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingFriends ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
              </div>
            ) : friends.length === 0 ? (
              <p className="text-center text-surface-500 py-8">Bạn chưa có bạn bè nào để mời.</p>
            ) : (
              friends.map(friend => {
                const isAlreadyMember = members.some(m => m.user_id === friend.id)
                return (
                  <div key={friend.id} className="flex items-center justify-between p-2 rounded-xl border border-surface-200 dark:border-surface-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface-200 dark:bg-surface-700 shrink-0 overflow-hidden">
                        {friend.avatar_url ? (
                          <img src={friend.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold bg-primary-500 text-white">
                            {friend.full_name?.charAt(0) || 'U'}
                          </div>
                        )}
                      </div>
                      <span className="font-semibold text-sm">{friend.full_name || 'Người dùng ẩn danh'}</span>
                    </div>
                    {isAlreadyMember ? (
                      <span className="text-xs text-surface-400 font-medium px-2">Đã tham gia</span>
                    ) : (
                      <button 
                        onClick={() => handleAddMember(friend.id)}
                        className="btn btn-primary px-3 py-1.5 text-xs"
                      >
                        Thêm
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {(myRole === 'owner' || myRole === 'admin') && (
              <button 
                onClick={() => { setIsInviting(true); loadFriends() }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-primary-200 dark:border-primary-900 text-primary-600 dark:text-primary-400 font-semibold hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors mb-4"
              >
                <UserPlus className="w-5 h-5" /> Mời bạn bè tham gia
              </button>
            )}

            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-center text-surface-500 py-8">Chưa có thành viên nào</p>
            ) : (
              members.map(member => {
                const RankIcon = RANK_ICONS[member.profile?.rank_tier || 'Bronze'] || ShieldAlert
                const rankColor = RANK_COLORS[member.profile?.rank_tier || 'Bronze'] || RANK_COLORS.Bronze

                return (
                  <div key={member.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full bg-surface-200 dark:bg-surface-700 shrink-0 overflow-hidden relative cursor-pointer"
                        onClick={() => onMemberClick?.(member.user_id)}
                      >
                        {member.profile?.avatar_url ? (
                          <img src={member.profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold bg-primary-500 text-white">
                            {member.profile?.full_name?.charAt(0) || 'U'}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span 
                            className="font-semibold text-sm cursor-pointer hover:underline"
                            onClick={() => onMemberClick?.(member.user_id)}
                          >
                            {member.profile?.full_name || 'Người dùng ẩn danh'}
                          </span>
                          {member.role === 'owner' && <span className="text-2xs font-bold text-white bg-warning-500 px-1.5 rounded">Owner</span>}
                          {member.role === 'admin' && <span className="text-2xs font-bold text-white bg-primary-500 px-1.5 rounded">Admin</span>}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-surface-500 mt-0.5">
                          <RankIcon className={clsx("w-3.5 h-3.5", rankColor)} />
                          <span>Lv.{member.profile?.level || 1} • {member.profile?.rank_tier || 'Bronze'}</span>
                        </div>
                      </div>
                    </div>
                    
                    {(myRole === 'owner' || (myRole === 'admin' && member.role === 'member')) && member.user_id !== user?.id && (
                      <button 
                        onClick={() => handleKick(member.user_id)}
                        className="p-2 text-surface-400 hover:text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-500/10 rounded-lg transition-colors"
                        title="Kick thành viên"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}

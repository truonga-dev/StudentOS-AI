import { useState, useEffect, useCallback } from 'react'
import {
  Shield,
  Users,
  AlertTriangle,
  MessageSquare,
  Megaphone,
  BarChart3,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Ban,
  Unlock,
  Trash2,
  Crown,
  BookOpen,
  CheckSquare,
  FileText,
  BrainCircuit,
  Clock,
  Send,
  Plus,
  Loader2,
  ShieldAlert,
  Globe,
  Archive,
  Sparkles,
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { useProfile } from '@/hooks/useProfile'
import {
  getAdminStats,
  getAdminUsers,
  updateAdminUser,
  deleteAdminUser,
  getAdminReports,
  resolveAdminReport,
  deleteAdminReport,
  getAdminChannels,
  updateAdminChannel,
  deleteAdminChannel,
  sendAdminBroadcast,
  type SystemStats,
  type AdminChannel,
} from '@/services/admin'
import { createChannel } from '@/services/community'
import { calculateLevelAndRank } from '@/services/profiles'
import type { Profile, Report } from '@/types'

type AdminTab = 'overview' | 'users' | 'reports' | 'channels' | 'broadcast'

export function AdminPage() {
  const { profile, refreshProfile } = useProfile()
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')

  // States cho các tab
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  const [users, setUsers] = useState<Profile[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all')
  const [editingXpUser, setEditingXpUser] = useState<Profile | null>(null)
  const [xpInput, setXpInput] = useState<number>(0)
  const [pointsInput, setPointsInput] = useState<number>(0)

  const [reports, setReports] = useState<Report[]>([])
  const [loadingReports, setLoadingReports] = useState(false)
  const [reportFilter, setReportFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('all')

  const [channels, setChannels] = useState<AdminChannel[]>([])
  const [loadingChannels, setLoadingChannels] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [newChannelDesc, setNewChannelDesc] = useState('')
  const [creatingChannel, setCreatingChannel] = useState(false)

  // Broadcast form
  const [bcTitle, setBcTitle] = useState('')
  const [bcMessage, setBcMessage] = useState('')
  const [bcType, setBcType] = useState<'info' | 'success' | 'warning' | 'error'>('info')
  const [bcLink, setBcLink] = useState('')
  const [sendingBroadcast, setSendingBroadcast] = useState(false)

  // Load dữ liệu theo tab
  const fetchStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const data = await getAdminStats()
      setStats(data)
    } catch (err: any) {
      toast.error(err.message || 'Không thể tải thống kê hệ thống')
    } finally {
      setLoadingStats(false)
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true)
    try {
      const data = await getAdminUsers(userSearch, roleFilter)
      setUsers(data)
    } catch (err: any) {
      toast.error(err.message || 'Không thể tải danh sách người dùng')
    } finally {
      setLoadingUsers(false)
    }
  }, [userSearch, roleFilter])

  const fetchReports = useCallback(async () => {
    setLoadingReports(true)
    try {
      const data = await getAdminReports(reportFilter)
      setReports(data)
    } catch (err: any) {
      toast.error(err.message || 'Không thể tải danh sách báo cáo')
    } finally {
      setLoadingReports(false)
    }
  }, [reportFilter])

  const fetchChannels = useCallback(async () => {
    setLoadingChannels(true)
    try {
      const data = await getAdminChannels()
      setChannels(data)
    } catch (err: any) {
      toast.error(err.message || 'Không thể tải danh sách kênh cộng đồng')
    } finally {
      setLoadingChannels(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    if (activeTab === 'users') fetchUsers()
    if (activeTab === 'reports') fetchReports()
    if (activeTab === 'channels') fetchChannels()
  }, [activeTab, fetchUsers, fetchReports, fetchChannels])

  // ── Hành động Quản trị viên ──────────────────────────────────────────────────

  const handleSelfPromoteDemo = async () => {
    if (!profile) return
    try {
      await updateAdminUser(profile.id, { role: 'admin' })
      await refreshProfile()
      toast.success('Đã kích hoạt quyền Quản trị viên (Admin) cho tài khoản của bạn!')
      fetchStats()
    } catch (err: any) {
      toast.error(err.message || 'Cần chạy file migration_v28_admin.sql trong Supabase trước!')
    }
  }

  const handleToggleRole = async (u: Profile) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin'
    if (u.id === profile?.id && newRole === 'user') {
      toast.error('Bạn không thể tự hạ quyền Admin của chính mình!')
      return
    }
    try {
      await updateAdminUser(u.id, { role: newRole })
      toast.success(`Đã chuyển quyền của ${u.full_name || u.email} thành ${newRole.toUpperCase()}`)
      fetchUsers()
      fetchStats()
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật quyền')
    }
  }

  const handleToggleBan = async (u: Profile) => {
    if (u.id === profile?.id) {
      toast.error('Bạn không thể tự khóa tài khoản của chính mình!')
      return
    }
    const nextBanned = !u.is_banned
    try {
      await updateAdminUser(u.id, { is_banned: nextBanned })
      toast.success(nextBanned ? `Đã khóa tài khoản ${u.email}` : `Đã mở khóa tài khoản ${u.email}`)
      fetchUsers()
      fetchStats()
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật trạng thái tài khoản')
    }
  }

  const handleSaveXp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingXpUser) return
    try {
      const { level, rank_tier } = calculateLevelAndRank(xpInput)
      await updateAdminUser(editingXpUser.id, {
        xp: xpInput,
        points: pointsInput,
        level,
        rank_tier,
      })
      toast.success(`Đã cập nhật XP & Điểm cho ${editingXpUser.full_name || editingXpUser.email}`)
      setEditingXpUser(null)
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật điểm')
    }
  }

  const handleDeleteUser = async (u: Profile) => {
    if (u.id === profile?.id) {
      toast.error('Không thể tự xóa tài khoản của chính mình!')
      return
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn người dùng "${u.full_name || u.email}"?`)) return
    try {
      await deleteAdminUser(u.id)
      toast.success('Đã xóa người dùng khỏi hệ thống')
      fetchUsers()
      fetchStats()
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xóa người dùng')
    }
  }

  const handleResolveReport = async (
    report: Report,
    status: 'resolved' | 'dismissed',
    options?: { delete_message?: boolean; ban_reported_user?: boolean }
  ) => {
    try {
      await resolveAdminReport(report.id, {
        status,
        delete_message: options?.delete_message,
        ban_reported_user: options?.ban_reported_user,
      })
      toast.success(status === 'resolved' ? 'Đã xử lý báo cáo vi phạm!' : 'Đã bỏ qua báo cáo!')
      fetchReports()
      fetchStats()
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xử lý báo cáo')
    }
  }

  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm('Xóa báo cáo này khỏi danh sách?')) return
    try {
      await deleteAdminReport(reportId)
      toast.success('Đã xóa bản ghi báo cáo')
      fetchReports()
      fetchStats()
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xóa báo cáo')
    }
  }

  const handleCreateGlobalChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChannelName.trim()) return
    setCreatingChannel(true)
    try {
      await createChannel(newChannelName.trim(), newChannelDesc.trim(), true, null)
      toast.success('Đã tạo kênh cộng đồng chung!')
      setNewChannelName('')
      setNewChannelDesc('')
      fetchChannels()
      fetchStats()
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tạo kênh')
    } finally {
      setCreatingChannel(false)
    }
  }

  const handleToggleChannelGlobal = async (ch: AdminChannel) => {
    try {
      await updateAdminChannel(ch.id, { is_global: !ch.is_global })
      toast.success(`Đã cập nhật trạng thái kênh #${ch.name}`)
      fetchChannels()
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật kênh')
    }
  }

  const handleToggleChannelArchive = async (ch: AdminChannel) => {
    try {
      await updateAdminChannel(ch.id, { is_archived: !ch.is_archived })
      toast.success(ch.is_archived ? `Đã mở lại kênh #${ch.name}` : `Đã lưu trữ kênh #${ch.name}`)
      fetchChannels()
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật kênh')
    }
  }

  const handleDeleteChannel = async (ch: AdminChannel) => {
    if (!window.confirm(`Xóa vĩnh viễn kênh "${ch.name}" và toàn bộ tin nhắn bên trong?`)) return
    try {
      await deleteAdminChannel(ch.id)
      toast.success(`Đã xóa kênh #${ch.name}`)
      fetchChannels()
      fetchStats()
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xóa kênh')
    }
  }

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bcTitle.trim() || !bcMessage.trim()) {
      toast.error('Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo')
      return
    }
    setSendingBroadcast(true)
    try {
      const res = await sendAdminBroadcast({
        title: bcTitle.trim(),
        message: bcMessage.trim(),
        type: bcType,
        link: bcLink.trim() || undefined,
      })
      toast.success(`Đã phát thông báo tới ${res.sent_count} sinh viên trên toàn hệ thống!`)
      setBcTitle('')
      setBcMessage('')
      setBcLink('')
    } catch (err: any) {
      toast.error(err.message || 'Lỗi gửi thông báo hệ thống')
    } finally {
      setSendingBroadcast(false)
    }
  }

  const TABS: { id: AdminTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'overview', label: 'Tổng quan hệ thống', icon: BarChart3 },
    { id: 'users', label: 'Người dùng', icon: Users, badge: stats?.users.total },
    { id: 'reports', label: 'Báo cáo vi phạm', icon: AlertTriangle, badge: stats?.community.pending_reports },
    { id: 'channels', label: 'Kênh Cộng đồng', icon: MessageSquare, badge: stats?.community.channels },
    { id: 'broadcast', label: 'Thông báo hệ thống', icon: Megaphone },
  ]

  const totalStudyHours = stats ? Math.round((stats.academic.study_minutes / 60) * 10) / 10 : 0

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-slide-up">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-primary-900 to-indigo-950 p-6 text-white shadow-xl border border-white/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <Shield className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">System Admin Portal</h1>
                <span className="px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wider rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Quản trị viên
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1">
                Trung tâm điều hành, kiểm duyệt cộng đồng và thống kê toàn hệ thống Student OS AI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {profile?.role !== 'admin' && (
              <button
                onClick={handleSelfPromoteDemo}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-colors shadow-lg"
                title="Kích hoạt quyền Admin cho tài khoản đang đăng nhập"
              >
                <Crown className="w-4 h-4" />
                Kích hoạt quyền Admin
              </button>
            )}
            <button
              onClick={() => {
                fetchStats()
                if (activeTab === 'users') fetchUsers()
                if (activeTab === 'reports') fetchReports()
                if (activeTab === 'channels') fetchChannels()
                toast.success('Đã làm mới dữ liệu!')
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium backdrop-blur-sm border border-white/15 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {TABS.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all duration-200',
                active
                  ? 'bg-primary-600 text-white shadow-glow-sm'
                  : 'bg-white dark:bg-surface-900 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 border border-surface-200 dark:border-surface-800'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={clsx(
                    'px-2 py-0.5 text-xs rounded-full font-bold',
                    active
                      ? 'bg-white/20 text-white'
                      : tab.id === 'reports'
                      ? 'bg-danger-100 dark:bg-danger-500/20 text-danger-600 dark:text-danger-400'
                      : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ─── TAB 1: OVERVIEW ───────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {loadingStats ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : (
            <>
              {/* Row 1: Primary KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card p-5 border-l-4 border-l-primary-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Tổng sinh viên</p>
                      <p className="text-3xl font-bold text-surface-900 dark:text-white mt-1">
                        {stats?.users.total ?? 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center text-primary-600 dark:text-primary-400">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs text-surface-500">
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {stats?.users.admins ?? 0} Admin
                    </span>
                    <span>•</span>
                    <span className="text-danger-600 dark:text-danger-400 font-medium">
                      {stats?.users.banned ?? 0} Đã khóa
                    </span>
                  </div>
                </div>

                <div className="card p-5 border-l-4 border-l-emerald-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Tổng giờ tập trung</p>
                      <p className="text-3xl font-bold text-surface-900 dark:text-white mt-1">
                        {totalStudyHours}h
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <Clock className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-surface-500">
                    Từ <strong className="text-surface-700 dark:text-surface-200">{stats?.academic.study_sessions ?? 0}</strong> phiên Pomodoro hoàn thành
                  </p>
                </div>

                <div className="card p-5 border-l-4 border-l-blue-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Hoạt động Cộng đồng</p>
                      <p className="text-3xl font-bold text-surface-900 dark:text-white mt-1">
                        {stats?.community.messages ?? 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-surface-500">
                    Tin nhắn trên <strong className="text-surface-700 dark:text-surface-200">{stats?.community.channels ?? 0}</strong> kênh học tập
                  </p>
                </div>

                <div className="card p-5 border-l-4 border-l-danger-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Báo cáo chờ xử lý</p>
                      <p className="text-3xl font-bold text-danger-600 dark:text-danger-400 mt-1">
                        {stats?.community.pending_reports ?? 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-danger-50 dark:bg-danger-500/10 flex items-center justify-center text-danger-600 dark:text-danger-400">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-surface-500">
                    Tổng cộng <strong className="text-surface-700 dark:text-surface-200">{stats?.community.total_reports ?? 0}</strong> báo cáo vi phạm
                  </p>
                </div>
              </div>

              {/* Row 2: Academic Data Breakdown & Recent Users */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Tài nguyên học tập */}
                <div className="card p-6 space-y-4">
                  <h3 className="font-bold text-surface-900 dark:text-white text-base flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary-500" />
                    Thống kê dữ liệu Học thuật
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Môn học đã tạo', value: stats?.academic.subjects ?? 0, icon: BookOpen, color: 'text-indigo-500' },
                      {
                        label: 'Công việc (Tasks)',
                        value: `${stats?.academic.completed_tasks ?? 0} / ${stats?.academic.tasks ?? 0} hoàn thành`,
                        icon: CheckSquare,
                        color: 'text-emerald-500',
                      },
                      { label: 'Ghi chú (Notes)', value: stats?.academic.notes ?? 0, icon: FileText, color: 'text-amber-500' },
                      { label: 'Thẻ ghi nhớ (Flashcards)', value: stats?.academic.flashcards ?? 0, icon: BrainCircuit, color: 'text-purple-500' },
                      { label: 'Tài liệu tải lên (Files)', value: stats?.academic.files ?? 0, icon: Archive, color: 'text-blue-500' },
                    ].map(item => {
                      const Icon = item.icon
                      return (
                        <div
                          key={item.label}
                          className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800/60"
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={clsx('w-5 h-5', item.color)} />
                            <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
                              {item.label}
                            </span>
                          </div>
                          <span className="text-sm font-bold text-surface-900 dark:text-white">
                            {item.value}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Người dùng mới đăng ký */}
                <div className="card p-6 lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-surface-900 dark:text-white text-base flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary-500" />
                      Thành viên mới gia nhập gần đây
                    </h3>
                    <button
                      onClick={() => setActiveTab('users')}
                      className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      Xem tất cả →
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-surface-200 dark:border-surface-800 text-xs text-surface-400 uppercase">
                          <th className="py-2.5 px-3">Sinh viên</th>
                          <th className="py-2.5 px-3">Vai trò</th>
                          <th className="py-2.5 px-3">Cấp độ / Rank</th>
                          <th className="py-2.5 px-3">Ngày tham gia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-100 dark:divide-surface-800 text-sm">
                        {(stats?.recent_users || []).map(u => (
                          <tr key={u.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/40">
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-white font-bold text-xs overflow-hidden shrink-0">
                                  {u.avatar_url ? (
                                    <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    (u.full_name || u.email || 'U').slice(0, 1).toUpperCase()
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-surface-900 dark:text-white truncate">
                                    {u.full_name || 'Chưa đặt tên'}
                                  </p>
                                  <p className="text-xs text-surface-400 truncate">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={clsx(
                                  'px-2.5 py-0.5 rounded-full text-xs font-semibold',
                                  u.role === 'admin'
                                    ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                    : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
                                )}
                              >
                                {u.role === 'admin' ? 'Admin' : 'Sinh viên'}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-medium text-surface-700 dark:text-surface-300">
                                Lv.{u.level || 1} ({u.rank_tier || 'Bronze'})
                              </span>
                            </td>
                            <td className="py-3 px-3 text-xs text-surface-500">
                              {new Date(u.created_at).toLocaleDateString('vi-VN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── TAB 2: USERS MANAGEMENT ───────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg text-surface-900 dark:text-white">Quản lý Tài khoản Sinh viên</h3>
              <p className="text-xs text-surface-500">
                Phân quyền Quản trị viên, điều chỉnh điểm Gamification (XP) hoặc khóa tài khoản vi phạm
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Tìm tên hoặc email..."
                  className="input pl-9 py-2 text-sm w-60"
                />
              </div>

              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value as any)}
                className="input py-2 text-sm w-36"
              >
                <option value="all">Tất cả vai trò</option>
                <option value="admin">Quản trị viên</option>
                <option value="user">Sinh viên</option>
              </select>
            </div>
          </div>

          {loadingUsers ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-7 h-7 animate-spin text-primary-500" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-800 text-xs text-surface-400 uppercase">
                    <th className="py-3 px-3">Người dùng</th>
                    <th className="py-3 px-3">Vai trò</th>
                    <th className="py-3 px-3">Trạng thái</th>
                    <th className="py-3 px-3">XP / Streak</th>
                    <th className="py-3 px-3">Ngày tạo</th>
                    <th className="py-3 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800 text-sm">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/40">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-brand flex items-center justify-center text-white font-bold text-xs overflow-hidden shrink-0">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              (u.full_name || u.email || 'U').slice(0, 1).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-surface-900 dark:text-white">
                              {u.full_name || 'Chưa đặt tên'}
                            </p>
                            <p className="text-xs text-surface-400">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={clsx(
                            'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold',
                            u.role === 'admin'
                              ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                              : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
                          )}
                        >
                          {u.role === 'admin' && <Crown className="w-3 h-3" />}
                          {u.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {u.is_banned ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-danger-100 dark:bg-danger-500/20 text-danger-600 dark:text-danger-400">
                            <Ban className="w-3 h-3" /> Đã khóa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" /> Hoạt động
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-xs">
                          <p className="font-bold text-surface-900 dark:text-white">
                            {u.xp ?? 0} XP • {u.points ?? 0} Điểm
                          </p>
                          <p className="text-surface-400">
                            Lv.{u.level ?? 1} ({u.rank_tier ?? 'Bronze'}) • 🔥 {u.current_streak ?? 0}
                          </p>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-xs text-surface-500">
                        {new Date(u.created_at).toLocaleDateString('vi-VN')}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingXpUser(u)
                              setXpInput(u.xp ?? 0)
                              setPointsInput(u.points ?? 0)
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-surface-100 dark:bg-surface-800 hover:bg-primary-50 dark:hover:bg-primary-500/20 text-surface-700 dark:text-surface-300 transition-colors"
                            title="Chỉnh sửa XP & Điểm"
                          >
                            Sửa XP
                          </button>

                          <button
                            onClick={() => handleToggleRole(u)}
                            className="p-1.5 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 transition-colors"
                            title={u.role === 'admin' ? 'Hạ xuống User' : 'Nâng lên Admin'}
                          >
                            <Crown className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleToggleBan(u)}
                            className={clsx(
                              'p-1.5 rounded-lg transition-colors',
                              u.is_banned
                                ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                                : 'bg-surface-100 dark:bg-surface-800 text-warning-600 hover:bg-warning-500/20'
                            )}
                            title={u.is_banned ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                          >
                            {u.is_banned ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-danger-500/20 text-danger-600 dark:text-danger-400 transition-colors"
                            title="Xóa người dùng"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-surface-400">
                        Không tìm thấy người dùng nào phù hợp.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal chỉnh sửa XP / Điểm */}
      {editingXpUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm"
          onClick={() => setEditingXpUser(null)}
        >
          <div
            className="bg-white dark:bg-surface-900 rounded-2xl shadow-xl w-full max-w-md p-6 border border-surface-200 dark:border-surface-700 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <h4 className="font-bold text-lg text-surface-900 dark:text-white">
              Điều chỉnh XP & Điểm thưởng
            </h4>
            <p className="text-xs text-surface-500">
              Tài khoản: <strong>{editingXpUser.full_name || editingXpUser.email}</strong>
            </p>
            <form onSubmit={handleSaveXp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-surface-600 dark:text-surface-300 mb-1">
                  Kinh nghiệm (XP - Tự động tính lại Level & Rank)
                </label>
                <input
                  type="number"
                  min={0}
                  value={xpInput}
                  onChange={e => setXpInput(parseInt(e.target.value) || 0)}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-600 dark:text-surface-300 mb-1">
                  Điểm tích lũy (Points)
                </label>
                <input
                  type="number"
                  min={0}
                  value={pointsInput}
                  onChange={e => setPointsInput(parseInt(e.target.value) || 0)}
                  className="input w-full"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingXpUser(null)} className="btn btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── TAB 3: REPORTS & MODERATION ───────────────────────────────────────── */}
      {activeTab === 'reports' && (
        <div className="card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg text-surface-900 dark:text-white">
                Kiểm duyệt Báo cáo vi phạm Cộng đồng
              </h3>
              <p className="text-xs text-surface-500">
                Xem xét các tin nhắn hoặc tài khoản bị người dùng báo cáo để giữ môi trường học tập lành mạnh
              </p>
            </div>

            <div className="flex items-center gap-2">
              {(['all', 'pending', 'resolved', 'dismissed'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setReportFilter(st)}
                  className={clsx(
                    'px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors',
                    reportFilter === st
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
                  )}
                >
                  {st === 'all' && 'Tất cả'}
                  {st === 'pending' && 'Chờ xử lý'}
                  {st === 'resolved' && 'Đã giải quyết'}
                  {st === 'dismissed' && 'Đã bỏ qua'}
                </button>
              ))}
            </div>
          </div>

          {loadingReports ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-7 h-7 animate-spin text-primary-500" />
            </div>
          ) : reports.length === 0 ? (
            <div className="py-14 text-center text-surface-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 opacity-80" />
              <p className="text-sm font-medium">Không có báo cáo vi phạm nào trong mục này.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map(r => (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-50/60 dark:bg-surface-800/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={clsx(
                          'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase',
                          r.status === 'pending'
                            ? 'bg-warning-100 dark:bg-warning-500/20 text-warning-700 dark:text-warning-300'
                            : r.status === 'resolved'
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                            : 'bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-400'
                        )}
                      >
                        {r.status === 'pending' ? 'Chờ xử lý' : r.status === 'resolved' ? 'Đã xử lý' : 'Đã bỏ qua'}
                      </span>
                      <span className="text-sm font-bold text-danger-600 dark:text-danger-400">
                        Lý do: {r.reason}
                      </span>
                      <span className="text-xs text-surface-400">
                        • {new Date(r.created_at).toLocaleString('vi-VN')}
                      </span>
                    </div>

                    <div className="text-xs text-surface-600 dark:text-surface-300 space-y-1">
                      <p>
                        <strong>Người báo cáo:</strong>{' '}
                        {r.reporter?.full_name || r.reporter?.email || r.reporter_id}
                      </p>
                      {r.reported_user_id && (
                        <p>
                          <strong>Tài khoản bị báo cáo:</strong>{' '}
                          <span className="text-danger-600 dark:text-danger-400 font-semibold">
                            {r.reported_user?.full_name || r.reported_user?.email || r.reported_user_id}
                          </span>
                        </p>
                      )}
                      {r.message && (
                        <div className="mt-2 p-3 rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700">
                          <p className="text-2xs uppercase font-bold text-surface-400 mb-1">
                            Nội dung tin nhắn bị báo cáo:
                          </p>
                          <p className="text-sm text-surface-800 dark:text-surface-200 italic">
                            "{r.message.content || '[Tin nhắn đính kèm tệp hoặc đã bị xóa]'}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {r.status === 'pending' && (
                      <>
                        {r.message_id && (
                          <button
                            onClick={() =>
                              handleResolveReport(r, 'resolved', { delete_message: true })
                            }
                            className="px-3 py-2 rounded-xl text-xs font-semibold bg-danger-600 hover:bg-danger-700 text-white transition-colors"
                          >
                            Xóa tin nhắn & Duyệt
                          </button>
                        )}
                        {r.reported_user_id && (
                          <button
                            onClick={() =>
                              handleResolveReport(r, 'resolved', {
                                delete_message: true,
                                ban_reported_user: true,
                              })
                            }
                            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white transition-colors"
                          >
                            Khóa User & Duyệt
                          </button>
                        )}
                        <button
                          onClick={() => handleResolveReport(r, 'resolved')}
                          className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đánh dấu Đã xử lý
                        </button>
                        <button
                          onClick={() => handleResolveReport(r, 'dismissed')}
                          className="px-3 py-2 rounded-xl text-xs font-semibold bg-surface-200 dark:bg-surface-800 hover:bg-surface-300 text-surface-700 dark:text-surface-300 transition-colors flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Bỏ qua
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDeleteReport(r.id)}
                      className="p-2 rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-danger-500/20 text-danger-500 transition-colors"
                      title="Xóa báo cáo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 4: COMMUNITY CHANNELS ─────────────────────────────────────────── */}
      {activeTab === 'channels' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form tạo kênh Global mới */}
          <div className="card p-6 space-y-4 h-fit">
            <h3 className="font-bold text-base text-surface-900 dark:text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary-500" />
              Tạo Kênh Cộng đồng Chung
            </h3>
            <p className="text-xs text-surface-500">
              Kênh Global sẽ hiển thị mặc định cho toàn bộ sinh viên trong hệ thống.
            </p>
            <form onSubmit={handleCreateGlobalChannel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-surface-600 dark:text-surface-300 mb-1">
                  Tên kênh học tập
                </label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={e => setNewChannelName(e.target.value)}
                  placeholder="VD: Ôn thi Lập trình Web, Hỏi đáp AI..."
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-600 dark:text-surface-300 mb-1">
                  Mô tả kênh
                </label>
                <textarea
                  value={newChannelDesc}
                  onChange={e => setNewChannelDesc(e.target.value)}
                  placeholder="Mô tả mục đích hoạt động của kênh..."
                  className="input w-full h-24 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={creatingChannel}
                className="btn btn-primary w-full flex items-center justify-center gap-2"
              >
                {creatingChannel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Tạo kênh chính thức
              </button>
            </form>
          </div>

          {/* Danh sách kênh */}
          <div className="card p-6 lg:col-span-2 space-y-4">
            <h3 className="font-bold text-base text-surface-900 dark:text-white">
              Danh sách Kênh Chat trên hệ thống ({channels.length})
            </h3>

            {loadingChannels ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-7 h-7 animate-spin text-primary-500" />
              </div>
            ) : (
              <div className="space-y-3">
                {channels.map(ch => {
                  const membersCount = ch.chat_members?.[0]?.count ?? 0
                  const messagesCount = ch.community_messages?.[0]?.count ?? 0
                  return (
                    <div
                      key={ch.id}
                      className="p-4 rounded-xl border border-surface-200 dark:border-surface-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-50 dark:hover:bg-surface-800/40"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-surface-900 dark:text-white">
                            #{ch.name}
                          </span>
                          {ch.is_global && (
                            <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center gap-1">
                              <Globe className="w-3 h-3" /> Global
                            </span>
                          )}
                          {ch.is_archived && (
                            <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-surface-200 dark:bg-surface-700 text-surface-600">
                              Đã lưu trữ
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-surface-500">
                          {ch.description || 'Không có mô tả'}
                        </p>
                        <div className="flex items-center gap-3 text-2xs text-surface-400 pt-1">
                          <span>👥 {membersCount} thành viên</span>
                          <span>•</span>
                          <span>💬 {messagesCount} tin nhắn</span>
                          <span>•</span>
                          <span>Tạo ngày {new Date(ch.created_at).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleToggleChannelGlobal(ch)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-surface-100 dark:bg-surface-800 hover:bg-primary-500/10 text-surface-700 dark:text-surface-300"
                          title="Chuyển đổi Global / Nhóm riêng"
                        >
                          {ch.is_global ? 'Chuyển Riêng tư' : 'Đặt làm Global'}
                        </button>
                        <button
                          onClick={() => handleToggleChannelArchive(ch)}
                          className="p-2 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-warning-500/10 text-warning-600"
                          title={ch.is_archived ? 'Khôi phục kênh' : 'Lưu trữ kênh'}
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteChannel(ch)}
                          className="p-2 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-danger-500/10 text-danger-600"
                          title="Xóa kênh"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 5: SYSTEM BROADCAST ───────────────────────────────────────────── */}
      {activeTab === 'broadcast' && (
        <div className="max-w-2xl mx-auto card p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center text-primary-600 dark:text-primary-400">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-surface-900 dark:text-white">
                Phát Thông báo Toàn Hệ thống (Broadcast)
              </h3>
              <p className="text-xs text-surface-500">
                Gửi thông báo trực tiếp tới chuông thông báo (Realtime Notification) của toàn bộ sinh viên
              </p>
            </div>
          </div>

          <form onSubmit={handleSendBroadcast} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-surface-600 dark:text-surface-300 mb-1">
                Tiêu đề thông báo
              </label>
              <input
                type="text"
                value={bcTitle}
                onChange={e => setBcTitle(e.target.value)}
                placeholder="VD: Thông báo bảo trì hệ thống / Cập nhật tính năng AI mới..."
                className="input w-full"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-surface-600 dark:text-surface-300 mb-1">
                  Phân loại mức độ
                </label>
                <select
                  value={bcType}
                  onChange={e => setBcType(e.target.value as any)}
                  className="input w-full"
                >
                  <option value="info">Thông tin chung (Info)</option>
                  <option value="success">Tin mừng / Sự kiện (Success)</option>
                  <option value="warning">Lưu ý quan trọng (Warning)</option>
                  <option value="error">Cảnh báo khẩn cấp (Alert)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-600 dark:text-surface-300 mb-1">
                  Đường dẫn đính kèm (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={bcLink}
                  onChange={e => setBcLink(e.target.value)}
                  placeholder="VD: /dashboard hoặc /community"
                  className="input w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-600 dark:text-surface-300 mb-1">
                Nội dung chi tiết
              </label>
              <textarea
                value={bcMessage}
                onChange={e => setBcMessage(e.target.value)}
                placeholder="Nhập nội dung thông báo gửi đến toàn bộ sinh viên..."
                className="input w-full h-32 resize-none"
                required
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={sendingBroadcast}
                className="btn btn-primary flex items-center gap-2 px-6"
              >
                {sendingBroadcast ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Phát thông báo ngay
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

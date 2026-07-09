import { useState } from 'react'
import {
  User, Bell, Palette, Shield, ChevronRight,
  Moon, Globe, GraduationCap, Camera, Loader2,
  LogOut,
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useTheme } from '@/contexts/ThemeContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'

const TABS = [
  { id: 'profile',  label: 'Tài khoản',   icon: User },
  { id: 'appear',   label: 'Giao diện',   icon: Palette },
  { id: 'notifs',   label: 'Thông báo',   icon: Bell },
  { id: 'security', label: 'Bảo mật',     icon: Shield },
]

function ProfileTab() {
  const { user } = useAuth()
  const { profile, updateProfile, uploadAvatar } = useProfile()
  const metadata = user?.user_metadata || {}

  const [form, setForm] = useState({
    full_name: profile?.full_name || metadata.full_name || '',
    school: metadata.school || '',
    major: metadata.major || '',
  })
  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const initial = form.full_name ? form.full_name.charAt(0).toUpperCase() : (user?.email?.charAt(0).toUpperCase() || 'U')

  const handleSave = async () => {
    setLoading(true)
    try {
      await supabase.auth.updateUser({
        data: {
          full_name: form.full_name,
          school: form.school,
          major: form.major,
        }
      })
      await updateProfile({ full_name: form.full_name })
      toast.success('Đã cập nhật thông tin!')
    } catch (e: any) {
      toast.error(e.message || 'Lỗi cập nhật thông tin')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      return toast.error('Vui lòng chọn file hình ảnh')
    }
    setUploadingAvatar(true)
    try {
      await uploadAvatar(file)
      toast.success('Đã cập nhật ảnh đại diện')
    } catch (e: any) {
      toast.error(e.message || 'Không thể tải ảnh lên')
    } finally {
      setUploadingAvatar(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="relative">
          {profile?.avatar_url ? (
             <img src={profile.avatar_url} alt="Avatar" className="w-20 h-20 rounded-2xl object-cover shadow-sm" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-brand flex items-center justify-center text-white text-2xl font-bold shadow-glow">
              {initial}
            </div>
          )}
          <label className="cursor-pointer absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-white dark:bg-surface-700 border border-surface-200 dark:border-surface-600 flex items-center justify-center shadow-sm hover:bg-surface-50 dark:hover:bg-surface-600 transition-colors">
            {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 text-surface-500 animate-spin" /> : <Camera className="w-3.5 h-3.5 text-surface-500" />}
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploadingAvatar} />
          </label>
        </div>
        <div>
          <h3 className="font-semibold text-surface-900 dark:text-white">{form.full_name || 'Người dùng'}</h3>
          <p className="text-sm text-surface-500">{user?.email}</p>
          {(form.major || form.school) && (
            <p className="text-xs text-primary-500 mt-1 flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5" />
              {form.major} {form.major && form.school && '—'} {form.school}
            </p>
          )}
        </div>
      </div>

      {/* Form fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Họ và tên</label>
          <input
            className="input"
            value={form.full_name}
            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Email</label>
          <input className="input" type="email" value={user?.email || ''} disabled />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Trường</label>
          <input
            className="input"
            value={form.school}
            placeholder="Ví dụ: Đại học Bách Khoa..."
            onChange={e => setForm(f => ({ ...f, school: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Ngành học</label>
          <input
            className="input"
            value={form.major}
            placeholder="Ví dụ: Khoa học máy tính..."
            onChange={e => setForm(f => ({ ...f, major: e.target.value }))}
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="px-5 py-2.5 rounded-xl bg-gradient-brand text-white text-sm font-semibold shadow-glow-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Lưu thay đổi
      </button>
    </div>
  )
}

function AppearanceTab() {
  const { theme, setTheme } = useTheme()
  const { language, setLanguage } = useLanguage()

  return (
    <div className="space-y-6">
      {/* Theme */}
      <div>
        <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-3">Chế độ màu</h4>
        <div className="grid grid-cols-3 gap-3">
          {(['light', 'dark', 'system'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={clsx(
                'p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all duration-150',
                theme === t
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                  : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600',
              )}
            >
              <div className={clsx(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                t === 'light' ? 'bg-white border border-surface-200' :
                t === 'dark'  ? 'bg-surface-900 border border-surface-700' :
                'bg-gradient-to-br from-white to-surface-900',
              )}>
                <Moon className={clsx('w-4 h-4', t === 'light' ? 'text-warning-500' : 'text-surface-400')} />
              </div>
              <span className="text-xs font-medium text-surface-700 dark:text-surface-300 capitalize">
                {t === 'light' ? 'Sáng' : t === 'dark' ? 'Tối' : 'Hệ thống'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div>
        <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4 text-surface-400" />Ngôn ngữ
        </h4>
        <select className="input max-w-xs" value={language} onChange={e => setLanguage(e.target.value as any)}>
          <option value="vi">🇻🇳 Tiếng Việt</option>
          <option value="en">🇺🇸 English</option>
        </select>
      </div>
    </div>
  )
}

function NotificationsTab() {
  const items = [
    { label: 'Nhắc deadline', desc: 'Nhận thông báo trước 1 ngày khi deadline đến', defaultOn: true },
    { label: 'Nhắc lịch học', desc: 'Thông báo trước 30 phút khi có tiết học', defaultOn: true },
    { label: 'Tóm tắt tuần', desc: 'Báo cáo tổng kết học tập cuối tuần', defaultOn: false },
    { label: 'Gợi ý học tập AI', desc: 'AI gợi ý môn học và flashcard cần ôn', defaultOn: true },
  ]
  const [states, setStates] = useState(() => Object.fromEntries(items.map(i => [i.label, i.defaultOn])))

  return (
    <div className="space-y-3">
      {items.map(item => (
        <div key={item.label} className="flex items-center justify-between p-4 card">
          <div>
            <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{item.label}</p>
            <p className="text-xs text-surface-500 mt-0.5">{item.desc}</p>
          </div>
          <button
            onClick={() => setStates(s => ({ ...s, [item.label]: !s[item.label] }))}
            className={clsx(
              'w-11 h-6 rounded-full transition-colors duration-200 relative',
              states[item.label] ? 'bg-primary-500' : 'bg-surface-200 dark:bg-surface-700',
            )}
          >
            <div className={clsx(
              'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200',
              states[item.label] ? 'left-[calc(100%-22px)]' : 'left-0.5',
            )} />
          </button>
        </div>
      ))}
    </div>
  )
}

function SecurityTab() {
  const { signOut } = useAuth()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [changingPass, setChangingPass] = useState(false)

  const handleUpdatePassword = async () => {
    if (password.length < 6) return toast.error('Mật khẩu cần ít nhất 6 ký tự')
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success('Đã cập nhật mật khẩu!')
      setChangingPass(false)
      setPassword('')
    } catch (e: any) {
      toast.error(e.message || 'Lỗi cập nhật mật khẩu')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    toast.success('Đã đăng xuất')
  }

  return (
    <div className="space-y-4">
      {/* Change Password */}
      {!changingPass ? (
        <div
          onClick={() => setChangingPass(true)}
          className="card p-4 flex items-center justify-between cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/70 transition-colors group"
        >
          <div>
            <p className="text-sm font-medium text-surface-800 dark:text-surface-200">Đổi mật khẩu</p>
            <p className="text-xs text-surface-500 mt-0.5">Cập nhật mật khẩu bảo mật</p>
          </div>
          <ChevronRight className="w-4 h-4 text-surface-400 group-hover:text-surface-600 transition-colors" />
        </div>
      ) : (
        <div className="card p-5 space-y-4">
          <p className="text-sm font-medium text-surface-800 dark:text-surface-200">Nhập mật khẩu mới</p>
          <input
            type="password"
            className="input"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Ít nhất 6 ký tự"
          />
          <div className="flex gap-2">
            <button
              onClick={handleUpdatePassword}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors flex items-center gap-2"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Cập nhật
            </button>
            <button
              onClick={() => { setChangingPass(false); setPassword('') }}
              className="px-4 py-2 rounded-xl border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 text-sm font-medium hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* 2FA Placeholder */}
      <div className="card p-4 flex items-center justify-between cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/70 transition-colors group">
        <div>
          <p className="text-sm font-medium text-surface-800 dark:text-surface-200">Xác thực 2 bước (2FA)</p>
          <p className="text-xs text-surface-500 mt-0.5">Tính năng sẽ sớm ra mắt</p>
        </div>
        <ChevronRight className="w-4 h-4 text-surface-400 group-hover:text-surface-600 transition-colors" />
      </div>

      <div className="pt-4 border-t border-surface-200 dark:border-surface-800">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2.5 w-full rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors justify-center"
        >
          <LogOut className="w-4 h-4" /> Đăng xuất
        </button>
      </div>
    </div>
  )
}

const TAB_CONTENT: Record<string, React.ReactNode> = {
  profile: <ProfileTab />,
  appear:  <AppearanceTab />,
  notifs:  <NotificationsTab />,
  security:<SecurityTab />,
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const { t } = useLanguage()

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">
      <div>
        <h2 className="section-title text-xl">{t('settings.title')}</h2>
        <p className="section-subtitle mt-0.5">{t('settings.subtitle')}</p>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Tab sidebar */}
        <div className="lg:w-52 shrink-0">
          <nav className="space-y-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  activeTab === id
                    ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
                    : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800',
                )}
              >
                <Icon className={clsx('w-4 h-4', activeTab === id ? 'text-primary-500' : 'text-surface-400')} />
                {t(`settings.tab.${id}`)}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 card p-6">
          {TAB_CONTENT[activeTab]}
        </div>
      </div>
    </div>
  )
}

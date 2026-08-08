import { useState } from 'react'
import {
  User, Bell, Palette, Shield, Trophy, BookOpen, Database,
  ChevronRight,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useProfile } from '@/hooks/useProfile'
import { useAuth } from '@/hooks/useAuth'
import { ProfileTab } from '../components/ProfileTab'
import { AppearanceTab } from '../components/AppearanceTab'
import { NotificationsTab } from '../components/NotificationsTab'
import { SecurityTab } from '../components/SecurityTab'
import { GamificationTab } from '../components/GamificationTab'
import { StudyPrefsTab } from '../components/StudyPrefsTab'
import { DataPrivacyTab } from '../components/DataPrivacyTab'

const TABS = [
  { id: 'profile',      label: 'Hồ sơ',          icon: User,     color: 'text-primary-500',  bg: 'bg-primary-50 dark:bg-primary-500/10' },
  { id: 'appearance',   label: 'Giao diện',        icon: Palette,  color: 'text-cyan-500',     bg: 'bg-cyan-50 dark:bg-cyan-500/10' },
  { id: 'notifications',label: 'Thông báo',        icon: Bell,     color: 'text-yellow-500',   bg: 'bg-yellow-50 dark:bg-yellow-500/10' },
  { id: 'security',     label: 'Bảo mật',          icon: Shield,   color: 'text-red-500',      bg: 'bg-red-50 dark:bg-red-500/10' },
  { id: 'gamification', label: 'Gamification',     icon: Trophy,   color: 'text-yellow-500',   bg: 'bg-yellow-50 dark:bg-yellow-500/10' },
  { id: 'study',        label: 'Sở thích Học tập', icon: BookOpen, color: 'text-green-500',    bg: 'bg-green-50 dark:bg-green-500/10' },
  { id: 'data',         label: 'Dữ liệu & Quyền',  icon: Database, color: 'text-surface-500',  bg: 'bg-surface-50 dark:bg-surface-700' },
]

import { RANK_CONFIG } from '@/lib/ranks'

const TAB_CONTENT: Record<string, React.ReactNode> = {
  profile:       <ProfileTab />,
  appearance:    <AppearanceTab />,
  notifications: <NotificationsTab />,
  security:      <SecurityTab />,
  gamification:  <GamificationTab />,
  study:         <StudyPrefsTab />,
  data:          <DataPrivacyTab />,
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const { profile } = useProfile()
  const { user } = useAuth()

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Người dùng'
  const rank = profile?.rank_tier ?? 'Bronze'
  const rankColor = RANK_CONFIG[rank]?.color ?? '#cd7f32'
  const level = profile?.level ?? 1
  const xp = profile?.xp ?? 0
  const initial = displayName.charAt(0).toUpperCase()

  const currentLevelXpStart = level === 1 ? 0 : ((level - 1) * level / 2) * 100
  const nextLevelXpStart = (level * (level + 1) / 2) * 100
  const xpNeeded = nextLevelXpStart - currentLevelXpStart
  const xpProgress = Math.max(0, xp - currentLevelXpStart)
  const progressPct = Math.min(100, Math.round((xpProgress / xpNeeded) * 100))

  const activeTabMeta = TABS.find(t => t.id === activeTab)!

  return (
    <div className="max-w-5xl mx-auto animate-slide-up pb-10 space-y-0">
      {/* ── Hero Profile Banner ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl mb-6">
        {/* Cover background */}
        {profile?.cover_url ? (
          <img src={profile.cover_url} alt="Cover" className="w-full h-36 object-cover" />
        ) : (
          <div className="h-36" style={{
            background: `linear-gradient(135deg, ${rankColor}40 0%, #6B4EFF30 50%, #06b6d430 100%)`,
          }} />
        )}

        {/* Overlay content */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl ring-2 ring-white/30 overflow-hidden shrink-0 shadow-lg">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-xl font-black"
                style={{ background: `linear-gradient(135deg, ${rankColor}, ${rankColor}88)` }}>
                {initial}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-white font-black text-lg leading-tight">{displayName}</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: `${rankColor}30`, color: rankColor, border: `1px solid ${rankColor}50` }}>
                {RANK_CONFIG[rank]?.label ?? rank} · Lv {level}
              </span>
            </div>
            {/* XP bar */}
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden max-w-48">
                <div className="h-full rounded-full" style={{ width: `${progressPct}%`, background: rankColor }} />
              </div>
              <span className="text-white/70 text-xs">{xp.toLocaleString()} XP</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Layout ───────────────────────────────────────────────────────── */}
      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Sidebar */}
        <div className="lg:w-56 shrink-0">
          <nav className="space-y-1">
            {TABS.map(({ id, label, icon: Icon, color, bg }) => (
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
                <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all', activeTab === id ? bg : 'bg-surface-100 dark:bg-surface-800')}>
                  <Icon className={clsx('w-3.5 h-3.5', activeTab === id ? color : 'text-surface-400')} />
                </div>
                <span className="flex-1 text-left">{label}</span>
                {activeTab === id && <ChevronRight className="w-3.5 h-3.5 text-primary-400 shrink-0" />}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="card p-6">
            {/* Tab header */}
            <div className="flex items-center gap-3 mb-6 pb-5 border-b border-surface-100 dark:border-surface-700">
              <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center', activeTabMeta.bg)}>
                <activeTabMeta.icon className={clsx('w-4.5 h-4.5', activeTabMeta.color)} />
              </div>
              <div>
                <h2 className="text-base font-bold text-surface-900 dark:text-white">{activeTabMeta.label}</h2>
                <p className="text-xs text-surface-500 mt-0.5">
                  {{
                    profile: 'Cập nhật thông tin cá nhân và hồ sơ học tập',
                    appearance: 'Tùy chỉnh giao diện theo phong cách của bạn',
                    notifications: 'Quản lý loại thông báo bạn muốn nhận',
                    security: 'Bảo vệ tài khoản và quản lý phiên đăng nhập',
                    gamification: 'Theo dõi tiến độ XP, rank và huy hiệu',
                    study: 'Cài đặt Pomodoro, Flashcard và mục tiêu học tập',
                    data: 'Xuất dữ liệu và kiểm soát quyền riêng tư',
                  }[activeTab]}
                </p>
              </div>
            </div>

            {/* Tab body */}
            {TAB_CONTENT[activeTab]}
          </div>
        </div>
      </div>
    </div>
  )
}

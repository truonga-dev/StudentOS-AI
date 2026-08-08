import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  CheckSquare,
  FileText,
  FolderOpen,
  BarChart3,
  Settings,
  GraduationCap,
  ChevronLeft,
  Sparkles,
  Bot,
  BrainCircuit,
  User,
  Users,
  PenTool,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useProfile } from '@/hooks/useProfile'
import { useLanguage } from '@/contexts/LanguageContext'
import { Flame, Trophy } from 'lucide-react'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen?: boolean
  onCloseMobile?: () => void
}

export function Sidebar({ collapsed, onToggle, mobileOpen = false, onCloseMobile }: SidebarProps) {
  const location = useLocation()
  const { profile } = useProfile()
  const { t } = useLanguage()

  const NAV_ITEMS = [
    { to: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/subjects',  icon: BookOpen,        label: t('nav.subjects') },
    { to: '/calendar',  icon: Calendar,        label: t('nav.calendar') },
    { to: '/tasks',     icon: CheckSquare,     label: t('nav.tasks') },
    { to: '/notes',     icon: FileText,        label: t('nav.notes') },
    { to: '/files',     icon: FolderOpen,      label: t('nav.files') },
    { to: '/flashcards', icon: BrainCircuit,   label: t('nav.flashcards') },
    { to: '/mocktests',  icon: PenTool,        label: 'Thi thử' },
    { to: '/leaderboard', icon: Trophy,        label: 'Xếp hạng' },
    { to: '/chat',      icon: Bot,             label: t('nav.chat') },
    { to: '/community', icon: Users,           label: t('nav.community') },
    { to: '/analytics', icon: BarChart3,       label: t('nav.analytics') },
  ]

  const handleLinkClick = () => {
    if (onCloseMobile) onCloseMobile()
  }

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-full z-40 flex flex-col',
        'bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-700',
        'transition-all duration-300 ease-in-out',
        'w-64 md:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        collapsed ? 'md:w-[72px]' : 'md:w-64',
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-surface-200 dark:border-surface-700 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center shrink-0 shadow-glow-sm">
            <GraduationCap className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          {(!collapsed || mobileOpen) && (
            <div className="overflow-hidden">
              <p className="font-bold text-surface-900 dark:text-white text-sm leading-tight truncate">
                Student OS
              </p>
              <p className="text-2xs text-primary-500 font-semibold flex items-center gap-0.5">
                <Sparkles className="w-3 h-3" />AI
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 scrollable">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} onClick={handleLinkClick}>
            {({ isActive }) => (
              <div
                className={clsx(
                  'sidebar-item',
                  isActive && 'active',
                  collapsed && !mobileOpen && 'justify-center px-2',
                )}
                title={collapsed && !mobileOpen ? label : undefined}
              >
                <Icon
                  className={clsx(
                    'w-5 h-5 shrink-0',
                    isActive
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-surface-500 dark:text-surface-400',
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {(!collapsed || mobileOpen) && (
                  <span className="truncate">{label}</span>
                )}
                {(!collapsed || mobileOpen) && isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500" />
                )}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Gamification Stats */}
      {(!collapsed || mobileOpen) && profile && (
        <div className="px-4 py-3 mx-3 mb-2 rounded-xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-bold text-sm" title="Chuỗi ngày học liên tiếp">
            <Flame className="w-4 h-4" fill="currentColor" /> {profile.current_streak}
          </div>
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-sm" title="Điểm kinh nghiệm (EXP)">
            <Trophy className="w-4 h-4" /> {profile.points}
          </div>
        </div>
      )}

      {/* Bottom: Settings + Collapse toggle */}
      <div className="px-3 py-4 border-t border-surface-200 dark:border-surface-700 space-y-1">
        <NavLink to="/settings" onClick={handleLinkClick}>
          {({ isActive }) => (
            <div
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative',
                isActive
                  ? 'bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-white font-semibold'
                  : 'text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800/50 hover:text-surface-900 dark:hover:text-surface-200'
              )}
            >
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="Avatar" 
                  className={clsx('w-5 h-5 rounded-full object-cover', isActive ? 'ring-2 ring-primary-500' : '')} 
                />
              ) : (
                <User className={clsx('w-5 h-5', isActive ? 'text-primary-600 dark:text-primary-400' : 'text-surface-400 group-hover:text-surface-500')} />
              )}
              
              {(!collapsed || mobileOpen) && <span>{t('nav.settings')}</span>}
            </div>
          )}
        </NavLink>

        {/* Collapse button - hidden on mobile viewports */}
        <button
          onClick={onToggle}
          className={clsx(
            'sidebar-item w-full md:flex hidden',
            collapsed && 'justify-center px-2',
          )}
          title={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        >
          <ChevronLeft
            className={clsx(
              'w-5 h-5 shrink-0 text-surface-400 transition-transform duration-300',
              collapsed && 'rotate-180',
            )}
          />
          {!collapsed && <span className="text-surface-500">Thu gọn</span>}
        </button>
      </div>
    </aside>
  )
}

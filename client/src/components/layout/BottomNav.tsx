import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FileText, CheckSquare, BrainCircuit, Users } from 'lucide-react'
import { clsx } from 'clsx'
import { useLanguage } from '@/contexts/LanguageContext'

export function BottomNav() {
  const { t } = useLanguage()

  const NAV_ITEMS = [
    { to: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/notes',     icon: FileText,        label: t('nav.notes') },
    { to: '/tasks',     icon: CheckSquare,     label: t('nav.tasks') },
    { to: '/flashcards', icon: BrainCircuit,   label: t('nav.flashcards') },
    { to: '/community', icon: Users,           label: t('nav.community') },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 h-16 bg-white/90 dark:bg-surface-900/90 backdrop-blur-lg border-t border-surface-200 dark:border-surface-800 flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] md:hidden">
      {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
        <NavLink key={to} to={to} className="flex-1 flex flex-col items-center justify-center py-1">
          {({ isActive }) => (
            <div className={clsx(
              "flex flex-col items-center gap-1 transition-all duration-200",
              isActive 
                ? "text-primary-600 dark:text-primary-400 scale-105" 
                : "text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200"
            )}>
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-semibold tracking-wide truncate max-w-[70px]">
                {label}
              </span>
            </div>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { BottomNav } from './BottomNav'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { clsx } from 'clsx'
import { useGlobalChatNotifications } from '@/hooks/useGlobalChatNotifications'

export function AppLayout() {
  // ---- Global Notifications: luôn chạy dù ở trang nào ----
  useGlobalChatNotifications()
  const [collapsed, setCollapsed] = useState(false)
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  })

  // Apply dark mode class to HTML element
  useEffect(() => {
    const html = document.documentElement
    if (darkMode) {
      html.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      html.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  // Auto-collapse on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setCollapsed(true)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const sidebarWidth = isMobile ? 0 : (collapsed ? 72 : 256)

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      {/* Mobile Drawer Overlay Backdrop */}
      {isMobile && mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-30 bg-surface-900/40 backdrop-blur-sm transition-opacity" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        collapsed={collapsed} 
        onToggle={() => setCollapsed(c => !c)} 
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main content */}
      <div
        className="transition-all duration-300 flex flex-col min-h-screen"
        style={{ marginLeft: sidebarWidth }}
      >
        {/* Topbar */}
        <Topbar
          sidebarCollapsed={collapsed}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(d => !d)}
          onToggleMobileMenu={() => setMobileMenuOpen(o => !o)}
        />

        <main
          className={clsx(
            'flex-1 p-6 mt-16 animate-fade-in',
            isMobile && 'pb-24'
          )}
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && <BottomNav />}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { clsx } from 'clsx'
import { ChatWidget } from '@/features/chat/components/ChatWidget'

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
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

  const sidebarWidth = collapsed ? 72 : 256

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      {/* Sidebar */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />

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
        />

        <main
          className={clsx(
            'flex-1 p-6',
            'mt-16', // topbar height
            'animate-fade-in',
          )}
        >
          <Outlet />
        </main>
      </div>

      {/* Global AI Chat Widget */}
      <ChatWidget />
    </div>
  )
}

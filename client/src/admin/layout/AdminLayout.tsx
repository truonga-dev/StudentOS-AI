import { useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, Flag, MessagesSquare, BookOpen, Megaphone, ScrollText,
  Settings, LogOut, ShieldCheck, Menu, X, Loader2, ShieldAlert, ExternalLink,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useQuery } from '@tanstack/react-query'
import { useAdminAuth } from '../context/AdminAuthContext'
import { adminApi } from '../services/adminApi'
import { Avatar, Button } from '../components/ui'

const NAV = [
  { group: 'Tổng quan', items: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  ]},
  { group: 'Quản lý', items: [
    { to: '/admin/users', label: 'Người dùng', icon: Users },
    { to: '/admin/reports', label: 'Báo cáo vi phạm', icon: Flag, badge: 'reports' as const },
    { to: '/admin/community', label: 'Cộng đồng', icon: MessagesSquare },
    { to: '/admin/content', label: 'Nội dung học tập', icon: BookOpen },
  ]},
  { group: 'Hệ thống', items: [
    { to: '/admin/broadcast', label: 'Thông báo', icon: Megaphone },
    { to: '/admin/audit-logs', label: 'Nhật ký hoạt động', icon: ScrollText },
    { to: '/admin/settings', label: 'Cài đặt', icon: Settings },
  ]},
]

const TITLES: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/users': 'Người dùng',
  '/admin/reports': 'Báo cáo vi phạm',
  '/admin/community': 'Cộng đồng',
  '/admin/content': 'Nội dung học tập',
  '/admin/broadcast': 'Thông báo hệ thống',
  '/admin/audit-logs': 'Nhật ký hoạt động',
  '/admin/settings': 'Cài đặt hệ thống',
}

function FullScreenLoader() {
  return (
    <div className="min-h-screen grid place-items-center bg-[#09090f]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-violet-400" />
        <p className="text-xs text-zinc-500 tracking-wide">Đang xác minh quyền quản trị…</p>
      </div>
    </div>
  )
}

function DeniedScreen() {
  const { logout, error } = useAdminAuth()
  return (
    <div className="min-h-screen grid place-items-center bg-[#09090f] p-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-rose-500/10 ring-1 ring-rose-500/30 grid place-items-center mb-5">
          <ShieldAlert className="w-7 h-7 text-rose-400" />
        </div>
        <h1 className="text-xl font-bold text-white">Không có quyền truy cập</h1>
        <p className="text-sm text-zinc-400 mt-2">{error || 'Tài khoản hiện tại không phải Quản trị viên.'}</p>
        <div className="flex gap-2 justify-center mt-6">
          <Link to="/dashboard"><Button variant="outline">Về ứng dụng</Button></Link>
          <Button onClick={logout}>Đăng nhập tài khoản khác</Button>
        </div>
      </div>
    </div>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { admin, logout } = useAdminAuth()
  const { data: stats } = useQuery({ queryKey: ['admin', 'stats'], queryFn: adminApi.stats, staleTime: 60_000 })
  const pending = stats?.community.pending_reports ?? 0

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/[0.05]">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 grid place-items-center shadow-lg shadow-violet-900/40">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-none">Student OS</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-violet-300/80 mt-1">Admin Console</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV.map(section => (
          <div key={section.group}>
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600">{section.group}</p>
            <div className="space-y-0.5">
              {section.items.map(item => (
                <NavLink key={item.to} to={item.to} end={'end' in item ? item.end : false} onClick={onNavigate}
                  className={({ isActive }) => clsx(
                    'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors',
                    isActive ? 'text-white bg-white/[0.06]' : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.03]',
                  )}>
                  {({ isActive }) => (
                    <>
                      {isActive && <motion.span layoutId="admin-nav-pill" className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-gradient-to-b from-violet-400 to-fuchsia-500" />}
                      <item.icon className={clsx('w-[18px] h-[18px]', isActive ? 'text-violet-300' : 'text-zinc-500 group-hover:text-zinc-300')} />
                      <span className="flex-1">{item.label}</span>
                      {'badge' in item && pending > 0 && (
                        <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white min-w-[18px] text-center">{pending}</span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-white/[0.05]">
        <div className="flex items-center gap-3 rounded-xl p-2.5 bg-white/[0.02]">
          <Avatar src={admin?.avatar_url} name={admin?.full_name || admin?.email} size={34} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{admin?.full_name || 'Admin'}</p>
            <p className="text-[11px] text-zinc-500 truncate">{admin?.email}</p>
          </div>
          <button onClick={logout} title="Đăng xuất" className="p-2 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminLayout() {
  const { status } = useAdminAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (status === 'checking') return <FullScreenLoader />
  if (status === 'guest') return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  if (status === 'denied') return <DeniedScreen />

  return (
    <div className="admin-root min-h-screen bg-[#09090f] text-zinc-200 font-sans">
      {/* ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/3 h-[480px] w-[480px] rounded-full bg-violet-700/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[380px] w-[380px] rounded-full bg-fuchsia-700/10 blur-[120px]" />
      </div>

      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 border-r border-white/[0.05] bg-[#0c0c14]/80 backdrop-blur-xl z-30">
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div className="fixed inset-0 bg-black/60 z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside className="fixed inset-y-0 left-0 w-64 bg-[#0c0c14] border-r border-white/5 z-50 lg:hidden"
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="relative lg:pl-64">
        <header className="sticky top-0 z-20 h-16 flex items-center gap-3 px-4 sm:px-8 border-b border-white/[0.05] bg-[#09090f]/70 backdrop-blur-xl">
          <button className="lg:hidden p-2 -ml-2 text-zinc-400 hover:text-white" onClick={() => setMobileOpen(v => !v)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-500">Admin</span>
            <span className="text-zinc-700">/</span>
            <span className="text-white font-medium">{TITLES[location.pathname] ?? 'Admin'}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Hệ thống hoạt động
            </span>
            <a href="/dashboard" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5">
              Mở ứng dụng <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </header>

        <main className="px-4 sm:px-8 py-8 max-w-[1500px]">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { adminApi } from '../services/adminApi'
import type { Profile } from '@/types'

type Status = 'checking' | 'guest' | 'denied' | 'admin'

interface AdminAuthValue {
  status: Status
  admin: Profile | null
  error: string | null
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
  recheck: () => Promise<void>
}

const Ctx = createContext<AdminAuthValue | null>(null)

/**
 * Phiên đăng nhập riêng cho khu vực Admin.
 * Quyền admin luôn được xác minh phía server qua GET /admin/me (không tin client).
 */
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const [status, setStatus] = useState<Status>('checking')
  const [admin, setAdmin] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)

  const verify = useCallback(async (): Promise<boolean> => {
    try {
      const me = await adminApi.me()
      setAdmin(me)
      setStatus('admin')
      setError(null)
      return true
    } catch (e) {
      setAdmin(null)
      setStatus('denied')
      setError(e instanceof Error ? e.message : 'Không có quyền truy cập')
      return false
    }
  }, [])

  useEffect(() => {
    if (loading) return
    if (!user) { setStatus('guest'); setAdmin(null); return }
    setStatus('checking')
    verify()
  }, [user, loading, verify])

  const login = async (email: string, password: string) => {
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password })
    if (authErr) return { ok: false, error: authErr.message === 'Invalid login credentials' ? 'Email hoặc mật khẩu không đúng' : authErr.message }
    const ok = await verify()
    if (!ok) {
      await supabase.auth.signOut()
      setStatus('guest')
      return { ok: false, error: 'Tài khoản này không có quyền Quản trị viên.' }
    }
    return { ok: true }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setAdmin(null)
    setStatus('guest')
  }

  return (
    <Ctx.Provider value={{ status, admin, error, login, logout, recheck: async () => { await verify() } }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAdminAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAdminAuth must be used inside <AdminAuthProvider>')
  return v
}

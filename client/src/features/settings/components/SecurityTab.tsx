import { useState } from 'react'
import { Loader2, Eye, EyeOff, AlertTriangle, LogOut, Smartphone, ChevronRight, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { clsx } from 'clsx'

function PasswordStrengthBar({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score = checks.filter(Boolean).length
  const levels = ['', 'Yếu', 'Trung bình', 'Tốt', 'Mạnh']
  const colors = ['', '#ef4444', '#f97316', '#3b82f6', '#22c55e']

  if (!password) return null

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex-1 h-1.5 rounded-full transition-all duration-300"
            style={{ background: i <= score ? colors[score] : '#e2e8f0' }} />
        ))}
      </div>
      <p className="text-xs font-medium" style={{ color: colors[score] || '#94a3b8' }}>
        {levels[score] || 'Nhập mật khẩu'}
      </p>
    </div>
  )
}

export function SecurityTab() {
  const { user, signOut } = useAuth()
  const [changingPass, setChangingPass] = useState(false)
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loadingPass, setLoadingPass] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteEmail, setDeleteEmail] = useState('')

  const handleUpdatePassword = async () => {
    if (password.length < 6) return toast.error('Mật khẩu cần ít nhất 6 ký tự')
    setLoadingPass(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success('Đã cập nhật mật khẩu!')
      setChangingPass(false)
      setPassword('')
    } catch (e: any) {
      toast.error(e.message || 'Lỗi cập nhật mật khẩu')
    } finally {
      setLoadingPass(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    toast.success('Đã đăng xuất')
  }

  const handleDeleteAccount = async () => {
    if (deleteEmail !== user?.email) return toast.error('Email không khớp')
    toast.error('Tính năng xóa tài khoản đang được phát triển')
    setShowDeleteDialog(false)
  }

  return (
    <div className="space-y-4">
      {/* Change Password */}
      <div>
        <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary-500" /> Mật khẩu
        </h4>
        {!changingPass ? (
          <button
            onClick={() => setChangingPass(true)}
            className="w-full card p-4 flex items-center justify-between hover:bg-surface-50 dark:hover:bg-surface-700/60 transition-colors group"
          >
            <div className="text-left">
              <p className="text-sm font-medium text-surface-800 dark:text-surface-200">Đổi mật khẩu</p>
              <p className="text-xs text-surface-500 mt-0.5">Cập nhật mật khẩu bảo mật tài khoản</p>
            </div>
            <ChevronRight className="w-4 h-4 text-surface-400 group-hover:text-surface-600 transition-colors" />
          </button>
        ) : (
          <div className="card p-5 space-y-4">
            <p className="text-sm font-medium text-surface-800 dark:text-surface-200">Nhập mật khẩu mới</p>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                className="input pr-10"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Ít nhất 8 ký tự..."
                autoFocus
              />
              <button onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <PasswordStrengthBar password={password} />
            <div className="flex gap-2 pt-1">
              <button onClick={handleUpdatePassword} disabled={loadingPass}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-60">
                {loadingPass && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Cập nhật
              </button>
              <button onClick={() => { setChangingPass(false); setPassword('') }}
                className="px-4 py-2 rounded-xl border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 text-sm font-medium hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
                Hủy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2FA - Coming Soon */}
      <div className="card p-4 flex items-center justify-between opacity-60">
        <div>
          <p className="text-sm font-medium text-surface-800 dark:text-surface-200 flex items-center gap-2">
            Xác thực 2 bước (2FA)
            <span className="px-1.5 py-0.5 rounded-md bg-surface-200 dark:bg-surface-700 text-[10px] font-semibold text-surface-500 uppercase">Sắp ra mắt</span>
          </p>
          <p className="text-xs text-surface-500 mt-0.5">Bảo vệ tài khoản với TOTP Authenticator</p>
        </div>
        <Smartphone className="w-4 h-4 text-surface-400" />
      </div>

      {/* Devices */}
      <div>
        <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-3">Phiên đăng nhập</h4>
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-surface-800 dark:text-surface-200">Thiết bị hiện tại</p>
            <p className="text-xs text-surface-500 mt-0.5">{navigator.userAgent.includes('Mobile') ? '📱 Mobile' : '💻 Desktop'} · Đang hoạt động</p>
          </div>
          <div className="px-2 py-1 rounded-lg bg-success-100 dark:bg-success-500/10 text-success-600 dark:text-success-400 text-xs font-semibold">Hiện tại</div>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-surface-200 dark:border-surface-700 space-y-2">
        <button onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 font-medium hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors text-sm">
          <LogOut className="w-4 h-4" /> Đăng xuất
        </button>
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl border-2 border-danger-200 dark:border-danger-900/40 bg-danger-50/50 dark:bg-danger-900/10 p-5 space-y-3">
        <h4 className="text-sm font-bold text-danger-600 dark:text-danger-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Vùng nguy hiểm
        </h4>
        <p className="text-xs text-surface-500">Các thao tác sau <strong>không thể hoàn tác</strong>. Hãy cân nhắc kỹ trước khi thực hiện.</p>
        <button
          onClick={() => setShowDeleteDialog(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-danger-300 dark:border-danger-800 text-danger-600 dark:text-danger-400 text-sm font-semibold hover:bg-danger-100 dark:hover:bg-danger-900/30 transition-colors"
        >
          <AlertTriangle className="w-4 h-4" /> Xóa tài khoản vĩnh viễn
        </button>
      </div>

      {/* Delete Confirm Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteDialog(false)}>
          <div className="bg-white dark:bg-surface-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6 text-danger-500" />
              </div>
              <h3 className="text-base font-bold text-surface-900 dark:text-white">Xóa tài khoản vĩnh viễn?</h3>
              <p className="text-sm text-surface-500 mt-1">Toàn bộ dữ liệu học tập, ghi chú và flashcard sẽ bị xóa. Không thể khôi phục.</p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
                  Nhập email <strong>{user?.email}</strong> để xác nhận:
                </label>
                <input className="input" type="email" placeholder={user?.email} value={deleteEmail} onChange={e => setDeleteEmail(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowDeleteDialog(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 text-sm font-medium text-surface-600 hover:bg-surface-50 transition-colors">
                  Hủy
                </button>
                <button onClick={handleDeleteAccount} disabled={deleteEmail !== user?.email}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-danger-500 text-white text-sm font-bold hover:bg-danger-600 transition-colors disabled:opacity-40">
                  Xóa tài khoản
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

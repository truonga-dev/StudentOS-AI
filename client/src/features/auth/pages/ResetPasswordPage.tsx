import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export function ResetPasswordPage() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Mật khẩu không khớp!')
      return
    }
    
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.')
      return
    }

    setLoading(true)

    const { error } = await updatePassword(password)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // Đổi mật khẩu thành công, chuyển hướng về dashboard
      navigate('/dashboard')
    }
  }

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white tracking-tight">
          Tạo mật khẩu mới 🔑
        </h1>
        <p className="text-surface-500 dark:text-surface-400 text-sm font-medium">
          Vui lòng nhập mật khẩu mới cho tài khoản của bạn.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-danger-50 dark:bg-danger-500/10
                        border border-danger-200 dark:border-danger-500/30 text-danger-600 dark:text-danger-400 text-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-bold text-surface-700 dark:text-surface-300 ml-1">Mật khẩu mới</label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400 group-focus-within:text-primary-500 transition-colors" />
            <input
              type="password"
              className="w-full px-4 py-3 pl-11 rounded-2xl border border-surface-200 dark:border-surface-700 
                         bg-white dark:bg-surface-900 text-surface-900 dark:text-white 
                         focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 
                         transition-all duration-200 outline-none"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-surface-700 dark:text-surface-300 ml-1">Nhập lại mật khẩu</label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400 group-focus-within:text-primary-500 transition-colors" />
            <input
              type="password"
              className="w-full px-4 py-3 pl-11 rounded-2xl border border-surface-200 dark:border-surface-700 
                         bg-white dark:bg-surface-900 text-surface-900 dark:text-white 
                         focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 
                         transition-all duration-200 outline-none"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !password || !confirmPassword}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-brand text-white font-bold text-[15px]
                     hover:opacity-90 active:scale-[0.98] transition-all duration-200
                     shadow-glow-sm hover:shadow-glow disabled:opacity-60 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2 mt-2"
        >
          {loading && <Loader2 className="w-5 h-5 animate-spin" />}
          {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
        </button>
      </form>
    </div>
  )
}

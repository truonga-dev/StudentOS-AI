import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ email: '', password: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await signIn(form.email, form.password)

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('Email hoặc mật khẩu không đúng.')
      } else if (error.message.includes('Email not confirmed')) {
        setError('Vui lòng xác nhận email trước khi đăng nhập.')
      } else if (error.message.includes('Too many requests')) {
        setError('Quá nhiều lần thử. Vui lòng thử lại sau ít phút.')
      } else {
        setError(error.message)
      }
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    setGoogleLoading(true)
    const { error } = await signInWithGoogle()
    if (error) {
      setError('Không thể đăng nhập với Google. Vui lòng thử lại.')
      setGoogleLoading(false)
    }
    // Nếu thành công → Supabase tự redirect về /dashboard
  }

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white tracking-tight">
          Chào mừng trở lại! 👋
        </h1>
        <p className="text-surface-500 dark:text-surface-400 text-sm font-medium">
          Đăng nhập để tiếp tục học tập thông minh.
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
        {/* Email */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-surface-700 dark:text-surface-300 ml-1">Email</label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400 group-focus-within:text-primary-500 transition-colors" />
            <input
              type="email"
              className="w-full px-4 py-3 pl-11 rounded-2xl border border-surface-200 dark:border-surface-700 
                         bg-white dark:bg-surface-900 text-surface-900 dark:text-white 
                         focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 
                         transition-all duration-200 outline-none"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              disabled={loading || googleLoading}
              required
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-2">
          <div className="flex items-center justify-between ml-1">
            <label className="text-sm font-bold text-surface-700 dark:text-surface-300">Mật khẩu</label>
            <Link to="/forgot-password" className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-bold transition-colors">
              Quên mật khẩu?
            </Link>
          </div>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400 group-focus-within:text-primary-500 transition-colors" />
            <input
              type={showPassword ? 'text' : 'password'}
              className="w-full px-4 py-3 pl-11 pr-11 rounded-2xl border border-surface-200 dark:border-surface-700 
                         bg-white dark:bg-surface-900 text-surface-900 dark:text-white 
                         focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 
                         transition-all duration-200 outline-none"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              disabled={loading || googleLoading}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-brand text-white font-bold text-[15px]
                     hover:opacity-90 active:scale-[0.98] transition-all duration-200
                     shadow-glow-sm hover:shadow-glow disabled:opacity-60 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2 mt-2"
        >
          {loading && <Loader2 className="w-5 h-5 animate-spin" />}
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4 py-2">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-surface-200 dark:via-surface-700 to-transparent" />
          <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">hoặc</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-surface-200 dark:via-surface-700 to-transparent" />
        </div>

        {/* Google SSO */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading || googleLoading}
          className="w-full py-3 px-4 rounded-2xl border border-surface-200 dark:border-surface-700
                     bg-white dark:bg-surface-900 text-surface-700 dark:text-surface-200
                     font-bold text-[15px] hover:bg-surface-50 dark:hover:bg-surface-800
                     transition-all duration-200 flex items-center justify-center gap-3
                     disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-sm"
        >
          {googleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {googleLoading ? 'Đang chuyển hướng...' : 'Đăng nhập với Google'}
        </button>
      </form>

      {/* Register link */}
      <p className="text-center text-sm font-medium text-surface-500">
        Chưa có tài khoản?{' '}
        <Link to="/register" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-bold transition-colors">
          Đăng ký ngay
        </Link>
      </p>
    </div>
  )
}

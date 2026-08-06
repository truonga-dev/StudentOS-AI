import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await resetPassword(email)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  // ─── Success State ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-success-50 dark:bg-success-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-success-500" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white tracking-tight">
            Kiểm tra email của bạn! 📬
          </h1>
          <p className="text-surface-500 dark:text-surface-400 text-sm leading-relaxed">
            Chúng tôi đã gửi link đặt lại mật khẩu đến{' '}
            <span className="font-semibold text-surface-700 dark:text-surface-300">{email}</span>.
            <br />Nhấp vào link trong email để tiếp tục.
          </p>
        </div>
        <p className="text-center text-sm font-medium text-surface-500">
          <Link to="/login" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-bold transition-colors">
            Quay lại đăng nhập
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white tracking-tight">
          Quên mật khẩu? 🔒
        </h1>
        <p className="text-surface-500 dark:text-surface-400 text-sm font-medium">
          Nhập email của bạn và chúng tôi sẽ gửi link đặt lại mật khẩu.
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
          <label className="text-sm font-bold text-surface-700 dark:text-surface-300 ml-1">Email</label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400 group-focus-within:text-primary-500 transition-colors" />
            <input
              type="email"
              className="w-full px-4 py-3 pl-11 rounded-2xl border border-surface-200 dark:border-surface-700 
                         bg-white dark:bg-surface-900 text-surface-900 dark:text-white 
                         focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 
                         transition-all duration-200 outline-none"
              placeholder="nguyenvana@gmail.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !email}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-brand text-white font-bold text-[15px]
                     hover:opacity-90 active:scale-[0.98] transition-all duration-200
                     shadow-glow-sm hover:shadow-glow disabled:opacity-60 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2 mt-2"
        >
          {loading && <Loader2 className="w-5 h-5 animate-spin" />}
          {loading ? 'Đang gửi...' : 'Gửi link đặt lại'}
        </button>
      </form>

      {/* Back to Login link */}
      <p className="text-center text-sm font-medium text-surface-500">
        Nhớ mật khẩu rồi?{' '}
        <Link to="/login" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-bold transition-colors">
          Đăng nhập ngay
        </Link>
      </p>
    </div>
  )
}

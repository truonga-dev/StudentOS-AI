import { useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export function RegisterPage() {
  const { signUp } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [agreed, setAgreed] = useState(false)
  
  // Modals state
  const [showTerms, setShowTerms] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await signUp(form.email, form.password, form.fullName)

    if (error) {
      if (error.message.includes('User already registered')) {
        setError('Email này đã được đăng ký. Hãy thử đăng nhập.')
      } else if (error.message.includes('Password should be')) {
        setError('Mật khẩu phải có ít nhất 6 ký tự.')
      } else if (error.message.includes('Unable to validate email')) {
        setError('Email không hợp lệ.')
      } else {
        setError(error.message)
      }
      setLoading(false)
    } else {
      // Supabase mặc định yêu cầu xác nhận email
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
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
            Kiểm tra email của bạn! 📬
          </h1>
          <p className="text-surface-500 dark:text-surface-400 text-sm leading-relaxed">
            Chúng tôi đã gửi link xác nhận đến{' '}
            <span className="font-semibold text-surface-700 dark:text-surface-300">{form.email}</span>.
            <br />Nhấp vào link trong email để kích hoạt tài khoản.
          </p>
        </div>
        <p className="text-center text-sm text-surface-500">
          Đã xác nhận?{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    )
  }

  // ─── Form State ─────────────────────────────────────────────────────────────

  const passwordStrength = Math.min(Math.floor(form.password.length / 2), 4)
  const strengthColors = ['bg-danger-400', 'bg-danger-400', 'bg-warning-400', 'bg-success-500', 'bg-success-500']

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white tracking-tight">
          Tạo tài khoản mới 🎓
        </h1>
        <p className="text-surface-500 dark:text-surface-400 text-sm font-medium">
          Bắt đầu hành trình học tập thông minh hôm nay.
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
        {/* Full name */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-surface-700 dark:text-surface-300 ml-1">Họ và tên</label>
          <div className="relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400 group-focus-within:text-primary-500 transition-colors" />
            <input
              type="text"
              className="w-full px-4 py-3 pl-11 rounded-2xl border border-surface-200 dark:border-surface-700 
                         bg-white dark:bg-surface-900 text-surface-900 dark:text-white 
                         focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 
                         transition-all duration-200 outline-none"
              placeholder="Nguyễn Văn A"
              value={form.fullName}
              onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
              disabled={loading}
              required
            />
          </div>
        </div>

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
              disabled={loading}
              required
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-surface-700 dark:text-surface-300 ml-1">Mật khẩu</label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400 group-focus-within:text-primary-500 transition-colors" />
            <input
              type={showPassword ? 'text' : 'password'}
              className="w-full px-4 py-3 pl-11 pr-11 rounded-2xl border border-surface-200 dark:border-surface-700 
                         bg-white dark:bg-surface-900 text-surface-900 dark:text-white 
                         focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 
                         transition-all duration-200 outline-none"
              placeholder="Tối thiểu 6 ký tự"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              minLength={6}
              disabled={loading}
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

          {/* Password strength */}
          {form.password.length > 0 && (
            <div className="flex gap-1.5 mt-2 px-1 animate-fade-in">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                    i < passwordStrength ? strengthColors[passwordStrength] : 'bg-surface-200 dark:bg-surface-700'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Terms */}
        <label className="flex items-start gap-3 cursor-pointer group mt-2">
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-surface-300 text-primary-500 focus:ring-primary-500 transition-colors cursor-pointer"
          />
          <span className="text-sm font-medium text-surface-500 dark:text-surface-400 leading-relaxed group-hover:text-surface-700 dark:group-hover:text-surface-300 transition-colors">
            Tôi đồng ý với{' '}
            <button type="button" onClick={(e) => { e.preventDefault(); setShowTerms(true); }} className="text-primary-600 dark:text-primary-400 hover:underline">Điều khoản dịch vụ</button>
            {' '}và{' '}
            <button type="button" onClick={(e) => { e.preventDefault(); setShowPrivacy(true); }} className="text-primary-600 dark:text-primary-400 hover:underline">Chính sách bảo mật</button>
          </span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !agreed}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-brand text-white font-bold text-[15px]
                     hover:opacity-90 active:scale-[0.98] transition-all duration-200
                     shadow-glow-sm hover:shadow-glow disabled:opacity-60 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2 mt-4"
        >
          {loading && <Loader2 className="w-5 h-5 animate-spin" />}
          {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
        </button>
      </form>

      {/* Login link */}
      <p className="text-center text-sm font-medium text-surface-500">
        Đã có tài khoản?{' '}
        <Link to="/login" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-bold transition-colors">
          Đăng nhập
        </Link>
      </p>

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-surface-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-slide-up">
            <div className="p-6 border-b border-surface-200 dark:border-surface-800 flex justify-between items-center bg-surface-50/50 dark:bg-surface-900/50">
              <h2 className="text-xl font-bold text-surface-900 dark:text-white">Điều khoản dịch vụ</h2>
              <button onClick={() => setShowTerms(false)} className="p-2 rounded-full hover:bg-surface-200 dark:hover:bg-surface-800 transition-colors">
                <X className="w-5 h-5 text-surface-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 text-surface-600 dark:text-surface-400 text-sm leading-relaxed">
              <p>Chào mừng bạn đến với Hệ điều hành học tập thông minh (Student OS AI). Khi đăng ký và sử dụng dịch vụ, bạn đồng ý với các điều khoản sau:</p>
              
              <h3 className="font-bold text-surface-900 dark:text-white text-base">1. Sử dụng dịch vụ</h3>
              <p>Bạn đồng ý sử dụng hệ thống vào mục đích học tập cá nhân, không lạm dụng hoặc dùng các thủ thuật gây quá tải hệ thống. AI được cung cấp nhằm hỗ trợ học tập, không thay thế hoàn toàn cho nỗ lực cá nhân của bạn.</p>
              
              <h3 className="font-bold text-surface-900 dark:text-white text-base">2. Quyền sở hữu trí tuệ</h3>
              <p>Mọi nội dung, tính năng và công nghệ thuộc bản quyền của Student OS AI. Dữ liệu ghi chú, lịch học, và tài liệu cá nhân bạn tải lên vẫn thuộc quyền sở hữu của bạn.</p>
              
              <h3 className="font-bold text-surface-900 dark:text-white text-base">3. Chấm dứt dịch vụ</h3>
              <p>Chúng tôi có quyền tạm ngưng hoặc khóa tài khoản của bạn nếu phát hiện hành vi vi phạm điều khoản nghiêm trọng hoặc cố tình phá hoại hệ thống.</p>
              
              <p className="pt-4 text-xs italic">Cập nhật lần cuối: 26/06/2026</p>
            </div>
            <div className="p-4 border-t border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-950 flex justify-end">
              <button 
                onClick={() => { setShowTerms(false); setAgreed(true); }}
                className="px-6 py-2.5 rounded-xl bg-gradient-brand text-white font-bold hover:opacity-90 transition-opacity"
              >
                Tôi đồng ý
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Modal */}
      {showPrivacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-surface-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-slide-up">
            <div className="p-6 border-b border-surface-200 dark:border-surface-800 flex justify-between items-center bg-surface-50/50 dark:bg-surface-900/50">
              <h2 className="text-xl font-bold text-surface-900 dark:text-white">Chính sách bảo mật</h2>
              <button onClick={() => setShowPrivacy(false)} className="p-2 rounded-full hover:bg-surface-200 dark:hover:bg-surface-800 transition-colors">
                <X className="w-5 h-5 text-surface-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 text-surface-600 dark:text-surface-400 text-sm leading-relaxed">
              <p>Sự riêng tư của bạn là ưu tiên hàng đầu của chúng tôi. Chính sách này giải thích cách chúng tôi thu thập, sử dụng và bảo vệ dữ liệu của bạn.</p>
              
              <h3 className="font-bold text-surface-900 dark:text-white text-base">1. Dữ liệu thu thập</h3>
              <p>Chúng tôi thu thập email, tên của bạn để tạo tài khoản, cùng với các nội dung học tập (ghi chú, tasks, lịch biểu, flashcards) mà bạn tạo trên hệ thống.</p>
              
              <h3 className="font-bold text-surface-900 dark:text-white text-base">2. Cách chúng tôi sử dụng dữ liệu</h3>
              <p>Dữ liệu của bạn được dùng để: 
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  <li>Cung cấp và đồng bộ hóa trải nghiệm học tập trên các thiết bị.</li>
                  <li>Sử dụng làm ngữ cảnh cho AI để AI có thể phân tích và tư vấn cho bạn chính xác hơn.</li>
                  <li>Phân tích (Analytics) kết quả học tập của cá nhân bạn.</li>
                </ul>
              </p>
              
              <h3 className="font-bold text-surface-900 dark:text-white text-base">3. Bảo vệ dữ liệu</h3>
              <p>Dữ liệu của bạn được lưu trữ an toàn với cơ sở dữ liệu có các biện pháp bảo vệ mã hóa tiêu chuẩn (Supabase Row Level Security). Chúng tôi không bán dữ liệu của bạn cho bất kỳ bên thứ ba nào.</p>
              
              <p className="pt-4 text-xs italic">Cập nhật lần cuối: 26/06/2026</p>
            </div>
            <div className="p-4 border-t border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-950 flex justify-end">
              <button 
                onClick={() => { setShowPrivacy(false); setAgreed(true); }}
                className="px-6 py-2.5 rounded-xl bg-gradient-brand text-white font-bold hover:opacity-90 transition-opacity"
              >
                Tôi đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

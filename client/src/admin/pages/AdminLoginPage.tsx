import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, AlertCircle, KeyRound } from 'lucide-react'
import { useAdminAuth } from '../context/AdminAuthContext'

export function AdminLoginPage() {
  const { status, login } = useAdminAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || '/admin'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { document.title = 'Đăng nhập Quản trị — Student OS AI' }, [])

  if (status === 'admin') return <Navigate to={from} replace />

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const res = await login(email.trim(), password)
    setSubmitting(false)
    if (res.ok) navigate(from, { replace: true })
    else setError(res.error || 'Đăng nhập thất bại')
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07070c] text-zinc-200 grid lg:grid-cols-2">

      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        <div className="absolute -top-32 -left-32 h-[520px] w-[520px] rounded-full bg-violet-700/25 blur-[140px] animate-blob" />
        <div className="absolute bottom-[-120px] right-[-80px] h-[460px] w-[460px] rounded-full bg-fuchsia-700/20 blur-[140px] animate-blob [animation-delay:4s]" />
      </div>

      {/* Left — branding */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 border-r border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 grid place-items-center shadow-xl shadow-violet-900/50">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white">Student OS AI</p>
            <p className="text-[10px] uppercase tracking-[0.25em] text-violet-300/80">Admin Console</p>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="text-5xl font-bold leading-[1.1] tracking-tight text-white">
            Trung tâm <br />
            <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent">điều hành hệ thống</span>
          </h2>
          <p className="mt-5 max-w-md text-zinc-400 leading-relaxed">
            Giám sát người dùng, kiểm duyệt cộng đồng, quản lý nội dung và cấu hình toàn bộ nền tảng tại một nơi.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-3 max-w-md">
            {['Người dùng', 'Kiểm duyệt', 'Phân tích'].map((t, i) => (
              <motion.div key={t} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.08 }}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-xs text-zinc-300">
                <div className="h-1 w-6 rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 mb-2" />{t}
              </motion.div>
            ))}
          </div>
        </motion.div>

        <p className="text-xs text-zinc-600">© {new Date().getFullYear()} Student OS AI · Khu vực giới hạn truy cập</p>
      </div>

      {/* Right — form */}
      <div className="relative flex items-center justify-center p-6 sm:p-12">
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}
          className="w-full max-w-[400px]">
          <div className="lg:hidden flex justify-center mb-8">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 grid place-items-center shadow-xl shadow-violet-900/50">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
          </div>

          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl p-8 shadow-2xl shadow-black/40">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-300 ring-1 ring-violet-500/25 mb-4">
              <KeyRound className="w-3 h-3" /> Chỉ dành cho Quản trị viên
            </div>
            <h1 className="text-2xl font-bold text-white">Đăng nhập Admin</h1>
            <p className="text-sm text-zinc-400 mt-1">Sử dụng tài khoản đã được cấp quyền quản trị.</p>

            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="mt-5 flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
              </motion.div>
            )}

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="admin-email" className="block text-xs font-medium text-zinc-400 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input id="admin-email" type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full rounded-xl bg-black/30 border border-white/10 pl-10 pr-3.5 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/15 transition" />
                </div>
              </div>
              <div>
                <label htmlFor="admin-password" className="block text-xs font-medium text-zinc-400 mb-1.5">Mật khẩu</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input id="admin-password" type={show ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl bg-black/30 border border-white/10 pl-10 pr-11 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/15 transition" />
                  <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button id="admin-login-submit" type="submit" disabled={submitting}
                className="group w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 hover:brightness-110 active:scale-[0.99] transition disabled:opacity-60">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Đăng nhập <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" /></>}
              </button>
            </form>

            <p className="mt-6 text-center text-[11px] text-zinc-600">
              Mọi lượt truy cập và thao tác đều được ghi lại trong nhật ký hệ thống.
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-zinc-500">
            Không phải quản trị viên? <a href="/login" className="text-violet-300 hover:text-violet-200">Về trang đăng nhập học viên</a>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

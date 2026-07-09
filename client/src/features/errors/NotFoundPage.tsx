import { Link } from 'react-router-dom'
import { GraduationCap, Home } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
      <div className="text-center space-y-6 px-6 animate-scale-in">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-glow">
            <GraduationCap className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
        </div>

        {/* 404 */}
        <div>
          <h1 className="text-8xl font-black text-gradient">404</h1>
          <h2 className="text-xl font-semibold text-surface-800 dark:text-surface-200 mt-2">
            Trang không tồn tại
          </h2>
          <p className="text-surface-500 dark:text-surface-400 text-sm mt-2">
            Có vẻ như bạn lạc đường mất rồi. Về Dashboard thôi!
          </p>
        </div>

        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-brand text-white font-semibold shadow-glow-sm hover:shadow-glow hover:opacity-90 transition-all duration-150"
        >
          <Home className="w-4 h-4" />
          Về trang chủ
        </Link>
      </div>
    </div>
  )
}

import { useTheme } from '@/contexts/ThemeContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useProfile } from '@/hooks/useProfile'
import { clsx } from 'clsx'
import { Sun, Moon, Monitor, Check } from 'lucide-react'
import toast from 'react-hot-toast'

const ACCENT_COLORS = [
  { name: 'Violet',   hex: '#6B4EFF', label: 'Tím (Mặc định)' },
  { name: 'Blue',     hex: '#3b82f6', label: 'Xanh dương' },
  { name: 'Cyan',     hex: '#06b6d4', label: 'Xanh lam' },
  { name: 'Emerald',  hex: '#10b981', label: 'Xanh lá' },
  { name: 'Orange',   hex: '#f97316', label: 'Cam' },
  { name: 'Pink',     hex: '#ec4899', label: 'Hồng' },
  { name: 'Rose',     hex: '#f43f5e', label: 'Đỏ hồng' },
  { name: 'Slate',    hex: '#64748b', label: 'Xám' },
]

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r} ${g} ${b}`
}

export function AppearanceTab() {
  const { theme, setTheme } = useTheme()
  const { language, setLanguage } = useLanguage()
  const { profile, updateProfile } = useProfile()

  const currentAccent = profile?.pref_accent_color ?? '#6B4EFF'

  const applyAccentColor = async (hex: string) => {
    // Apply CSS variable to :root immediately for real-time preview
    document.documentElement.style.setProperty('--color-primary', hexToRgb(hex))
    try {
      await updateProfile({ pref_accent_color: hex })
      toast.success('Đã áp dụng màu chủ đạo!')
    } catch {
      toast.error('Không thể lưu màu')
    }
  }

  const THEME_OPTIONS = [
    { id: 'light',  label: 'Sáng',    icon: Sun,     preview: 'bg-white border-surface-200' },
    { id: 'dark',   label: 'Tối',     icon: Moon,    preview: 'bg-surface-900 border-surface-700' },
    { id: 'system', label: 'Hệ thống', icon: Monitor, preview: 'bg-gradient-to-br from-white to-surface-900 border-surface-400' },
  ]

  return (
    <div className="space-y-8">
      {/* ── Theme ─────────────────────────────────────────────────────────── */}
      <div>
        <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-1">Chế độ màu</h4>
        <p className="text-xs text-surface-500 mb-3">Tùy chỉnh giao diện phù hợp với sở thích</p>
        <div className="grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map(({ id, label, icon: Icon, preview }) => (
            <button
              key={id}
              onClick={() => setTheme(id as any)}
              className={clsx(
                'p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all duration-150',
                theme === id
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                  : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600',
              )}
            >
              <div className={clsx('w-12 h-8 rounded-lg border-2 flex items-center justify-center', preview)}>
                <Icon className="w-4 h-4 text-surface-500" />
              </div>
              <span className={clsx('text-xs font-semibold', theme === id ? 'text-primary-600 dark:text-primary-400' : 'text-surface-600 dark:text-surface-400')}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Accent Color ─────────────────────────────────────────────────── */}
      <div>
        <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-1">Màu chủ đạo</h4>
        <p className="text-xs text-surface-500 mb-3">Thay đổi màu accent áp dụng toàn bộ ứng dụng</p>
        <div className="flex flex-wrap gap-3">
          {ACCENT_COLORS.map(({ name, hex, label }) => (
            <button
              key={name}
              onClick={() => applyAccentColor(hex)}
              title={label}
              className="relative group flex flex-col items-center gap-1.5"
            >
              <div
                className="w-10 h-10 rounded-full transition-transform duration-150 group-hover:scale-110 shadow-md"
                style={{
                  background: `radial-gradient(circle at 35% 35%, ${hex}ee, ${hex})`,
                  boxShadow: currentAccent === hex ? `0 0 0 3px white, 0 0 0 5px ${hex}` : undefined,
                }}
              >
                {currentAccent === hex && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" strokeWidth={3} />
                  </div>
                )}
              </div>
              <span className="text-[10px] text-surface-500 whitespace-nowrap">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Language ─────────────────────────────────────────────────────── */}
      <div>
        <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-1">Ngôn ngữ</h4>
        <p className="text-xs text-surface-500 mb-3">Ngôn ngữ hiển thị của ứng dụng</p>
        <div className="flex gap-3">
          {[{ code: 'vi', flag: '🇻🇳', label: 'Tiếng Việt' }, { code: 'en', flag: '🇺🇸', label: 'English' }].map(({ code, flag, label }) => (
            <button
              key={code}
              onClick={() => setLanguage(code as any)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all',
                language === code
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
                  : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:border-surface-300',
              )}
            >
              <span className="text-base">{flag}</span> {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

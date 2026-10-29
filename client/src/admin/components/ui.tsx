import { type ReactNode, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, X, AlertTriangle, Inbox } from 'lucide-react'
import { clsx } from 'clsx'

// ─── Layout primitives ──────────────────────────────────────────────────────

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="text-sm text-zinc-400 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ children, className, title, action }: { children: ReactNode; className?: string; title?: string; action?: ReactNode }) {
  return (
    <section className={clsx('rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm', className)}>
      {title && (
        <header className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.04]">
          <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
          {action}
        </header>
      )}
      <div className={title ? 'p-5' : ''}>{children}</div>
    </section>
  )
}

const accentMap = {
  violet: 'from-violet-500/20 to-violet-500/0 text-violet-300 ring-violet-500/30',
  emerald: 'from-emerald-500/20 to-emerald-500/0 text-emerald-300 ring-emerald-500/30',
  amber: 'from-amber-500/20 to-amber-500/0 text-amber-300 ring-amber-500/30',
  rose: 'from-rose-500/20 to-rose-500/0 text-rose-300 ring-rose-500/30',
  sky: 'from-sky-500/20 to-sky-500/0 text-sky-300 ring-sky-500/30',
  fuchsia: 'from-fuchsia-500/20 to-fuchsia-500/0 text-fuchsia-300 ring-fuchsia-500/30',
} as const
export type Accent = keyof typeof accentMap

export function StatCard({ label, value, icon: Icon, accent = 'violet', hint }: {
  label: string; value: ReactNode; icon: React.ElementType; accent?: Accent; hint?: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5"
    >
      <div className={clsx('absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none', accentMap[accent].split(' ').slice(0, 2).join(' '))} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
        </div>
        <div className={clsx('rounded-xl p-2.5 ring-1 bg-black/20', accentMap[accent].split(' ').slice(2).join(' '))}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  )
}

// ─── Small elements ─────────────────────────────────────────────────────────

const badgeTones = {
  gray: 'bg-zinc-500/10 text-zinc-300 ring-zinc-500/20',
  violet: 'bg-violet-500/10 text-violet-300 ring-violet-500/25',
  green: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/25',
  amber: 'bg-amber-500/10 text-amber-300 ring-amber-500/25',
  red: 'bg-rose-500/10 text-rose-300 ring-rose-500/25',
  blue: 'bg-sky-500/10 text-sky-300 ring-sky-500/25',
} as const
export function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: keyof typeof badgeTones }) {
  return <span className={clsx('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', badgeTones[tone])}>{children}</span>
}

export function Avatar({ src, name, size = 32 }: { src?: string | null; name?: string | null; size?: number }) {
  const initials = (name || '?').split(/\s|@/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('')
  return src ? (
    <img src={src} alt={name || ''} style={{ width: size, height: size }} className="rounded-full object-cover ring-1 ring-white/10" />
  ) : (
    <div style={{ width: size, height: size, fontSize: size * 0.38 }}
      className="rounded-full grid place-items-center font-semibold text-white bg-gradient-to-br from-violet-500 to-fuchsia-600 ring-1 ring-white/10">
      {initials}
    </div>
  )
}

type BtnVariant = 'primary' | 'ghost' | 'danger' | 'outline'
const btn: Record<BtnVariant, string> = {
  primary: 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-900/30 hover:brightness-110',
  ghost: 'text-zinc-300 hover:bg-white/5 hover:text-white',
  danger: 'bg-rose-600/90 text-white hover:bg-rose-500',
  outline: 'border border-white/10 text-zinc-200 hover:bg-white/5',
}
export function Button({ variant = 'primary', loading, className, children, ...rest }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; loading?: boolean }) {
  return (
    <button {...rest} disabled={rest.disabled || loading}
      className={clsx('inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]', btn[variant], className)}>
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
}

export const inputCls = 'w-full rounded-xl bg-white/[0.03] border border-white/10 px-3.5 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition'

export function Spinner({ className }: { className?: string }) {
  return <div className={clsx('flex items-center justify-center py-16', className)}><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>
}

export function EmptyState({ title = 'Không có dữ liệu', hint }: { title?: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/5 mb-3"><Inbox className="w-6 h-6 text-zinc-500" /></div>
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      {hint && <p className="text-xs text-zinc-500 mt-1">{hint}</p>}
    </div>
  )
}

export function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
      className={clsx('relative h-6 w-11 rounded-full transition-colors disabled:opacity-50', checked ? 'bg-violet-600' : 'bg-zinc-700')}>
      <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={clsx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow', checked ? 'left-[22px]' : 'left-0.5')} />
    </button>
  )
}

// ─── Overlays ───────────────────────────────────────────────────────────────

export function Modal({ open, onClose, title, children, width = 'max-w-lg' }: {
  open: boolean; onClose: () => void; title?: string; children: ReactNode; width?: string
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    if (open) window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }}
            className={clsx('relative w-full rounded-2xl border border-white/10 bg-[#12121c] shadow-2xl max-h-[90vh] overflow-y-auto', width)}>
            {title && (
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <h3 className="font-semibold text-white">{title}</h3>
                <button onClick={onClose} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
            )}
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText = 'Xác nhận', loading, danger = true }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: ReactNode
  confirmText?: string; loading?: boolean; danger?: boolean
}) {
  return (
    <Modal open={open} onClose={onClose} width="max-w-md">
      <div className="flex gap-4">
        <div className={clsx('h-10 w-10 shrink-0 rounded-xl grid place-items-center', danger ? 'bg-rose-500/15 text-rose-400' : 'bg-violet-500/15 text-violet-300')}>
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-white">{title}</h3>
          <div className="text-sm text-zinc-400 mt-1">{message}</div>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <Button variant="ghost" onClick={onClose}>Hủy</Button>
        <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmText}</Button>
      </div>
    </Modal>
  )
}

// ─── Table helpers ──────────────────────────────────────────────────────────

export const th = 'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500'
export const td = 'px-4 py-3 text-sm text-zinc-300 align-middle'

export function fmtDate(d?: string | null, withTime = false) {
  if (!d) return '—'
  const date = new Date(d)
  return withTime
    ? date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('vi-VN')
}

export function fmtNum(n?: number | null) {
  return (n ?? 0).toLocaleString('vi-VN')
}

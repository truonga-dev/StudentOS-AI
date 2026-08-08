import { useState } from 'react'
import { useProfile } from '@/hooks/useProfile'
import { Loader2, Timer, BookOpen, Target, Brain } from 'lucide-react'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

function Slider({ label, value, onChange, min, max, step = 1, unit }: {
  label: string; value: number; onChange: (v: number) => void
  min: number; max: number; step?: number; unit: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-surface-700 dark:text-surface-300">{label}</label>
        <span className="text-sm font-bold text-primary-500">{value} {unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary-500 bg-surface-200 dark:bg-surface-700"
      />
      <div className="flex justify-between text-[10px] text-surface-400">
        <span>{min} {unit}</span><span>{max} {unit}</span>
      </div>
    </div>
  )
}

export function StudyPrefsTab() {
  const { profile, updateProfile } = useProfile()
  const [loading, setLoading] = useState(false)

  const [prefs, setPrefs] = useState({
    pomodoro_work: profile?.pref_pomodoro_work ?? 25,
    pomodoro_break: profile?.pref_pomodoro_break ?? 5,
    daily_goal_hours: profile?.pref_daily_goal_hours ?? 2,
    weekly_goal_days: profile?.pref_weekly_goal_days ?? 5,
  })

  const [flashcardPrefs, setFlashcardPrefs] = useState({
    daily_cards: 20,
    sound_effect: true,
    spaced_rep: true,
  })

  const [aiPrefs, setAiPrefs] = useState({
    language: 'vi',
    detail: 'detailed' as 'concise' | 'detailed' | 'expert',
  })

  const handleSave = async () => {
    setLoading(true)
    try {
      await updateProfile({
        pref_pomodoro_work: prefs.pomodoro_work,
        pref_pomodoro_break: prefs.pomodoro_break,
        pref_daily_goal_hours: prefs.daily_goal_hours,
        pref_weekly_goal_days: prefs.weekly_goal_days,
      })
      toast.success('Đã lưu sở thích học tập!')
    } catch (e: any) {
      toast.error(e.message || 'Lỗi lưu cài đặt')
    } finally {
      setLoading(false)
    }
  }

  const ToggleSwitch = ({ on, onChange }: { on: boolean; onChange: () => void }) => (
    <button onClick={onChange}
      className={clsx('w-11 h-6 rounded-full transition-colors duration-200 relative shrink-0', on ? 'bg-primary-500' : 'bg-surface-200 dark:bg-surface-700')}>
      <div className={clsx('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200', on ? 'left-[calc(100%-22px)]' : 'left-0.5')} />
    </button>
  )

  return (
    <div className="space-y-8">
      {/* ── Pomodoro ─────────────────────────────────────────────────────── */}
      <div>
        <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-4 flex items-center gap-2">
          <Timer className="w-4 h-4 text-primary-500" /> Pomodoro Timer
        </h4>
        <div className="card p-5 space-y-5">
          <Slider label="Thời gian làm việc" value={prefs.pomodoro_work} onChange={v => setPrefs(p => ({ ...p, pomodoro_work: v }))} min={10} max={60} step={5} unit="phút" />
          <Slider label="Thời gian nghỉ" value={prefs.pomodoro_break} onChange={v => setPrefs(p => ({ ...p, pomodoro_break: v }))} min={3} max={30} step={1} unit="phút" />
          <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50 text-xs text-surface-500 flex items-center gap-2">
            <Timer className="w-3.5 h-3.5 shrink-0" />
            Mỗi phiên làm việc: <strong>{prefs.pomodoro_work} phút</strong> tập trung + <strong>{prefs.pomodoro_break} phút</strong> nghỉ
          </div>
        </div>
      </div>

      {/* ── Flashcard ────────────────────────────────────────────────────── */}
      <div>
        <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-accent-500" /> Flashcard
        </h4>
        <div className="card p-5 space-y-4">
          <Slider label="Số thẻ ôn mỗi ngày" value={flashcardPrefs.daily_cards} onChange={v => setFlashcardPrefs(p => ({ ...p, daily_cards: v }))} min={5} max={100} step={5} unit="thẻ" />
          {[
            { key: 'spaced_rep', label: 'Spaced Repetition', desc: 'Thuật toán lặp lại tối ưu theo SM-2' },
            { key: 'sound_effect', label: 'Âm thanh lật thẻ', desc: 'Phát âm thanh khi lật flashcard' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{item.label}</p>
                <p className="text-xs text-surface-500">{item.desc}</p>
              </div>
              <ToggleSwitch on={flashcardPrefs[item.key as keyof typeof flashcardPrefs] as boolean}
                onChange={() => setFlashcardPrefs(p => ({ ...p, [item.key]: !p[item.key as keyof typeof p] }))} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Study Goals ──────────────────────────────────────────────────── */}
      <div>
        <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-success-500" /> Mục tiêu học tập
        </h4>
        <div className="card p-5 space-y-5">
          <Slider label="Giờ học mỗi ngày" value={prefs.daily_goal_hours} onChange={v => setPrefs(p => ({ ...p, daily_goal_hours: v }))} min={0.5} max={12} step={0.5} unit="giờ" />
          <Slider label="Số ngày học mỗi tuần" value={prefs.weekly_goal_days} onChange={v => setPrefs(p => ({ ...p, weekly_goal_days: v }))} min={1} max={7} unit="ngày" />
        </div>
      </div>

      {/* ── AI Preferences ───────────────────────────────────────────────── */}
      <div>
        <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-4 flex items-center gap-2">
          <Brain className="w-4 h-4 text-indigo-500" /> Trợ lý AI
        </h4>
        <div className="card p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Ngôn ngữ phản hồi</label>
            <select className="input max-w-xs" value={aiPrefs.language} onChange={e => setAiPrefs(p => ({ ...p, language: e.target.value }))}>
              <option value="vi">🇻🇳 Tiếng Việt</option>
              <option value="en">🇺🇸 English</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Mức độ chi tiết</label>
            <div className="flex gap-2 flex-wrap">
              {([
                { id: 'concise', label: '⚡ Ngắn gọn' },
                { id: 'detailed', label: '📝 Chi tiết' },
                { id: 'expert', label: '🎓 Chuyên sâu' },
              ] as const).map(({ id, label }) => (
                <button key={id} onClick={() => setAiPrefs(p => ({ ...p, detail: id }))}
                  className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all',
                    aiPrefs.detail === id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
                      : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400')}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={loading}
        className="px-6 py-2.5 rounded-xl bg-gradient-brand text-white text-sm font-semibold shadow-glow-sm hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-60">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />} Lưu cài đặt
      </button>
    </div>
  )
}

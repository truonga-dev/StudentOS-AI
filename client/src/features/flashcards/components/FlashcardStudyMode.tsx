import { useState, useEffect, useCallback, useRef } from 'react'
import { X, RotateCcw, Keyboard, Zap, Trophy, CheckCircle2, XCircle, Timer } from 'lucide-react'
import { clsx } from 'clsx'
import { calculateSM2 } from '@/utils/sm2'
import { useProfile } from '@/hooks/useProfile'
import type { Flashcard } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export type StudyMode = 'due' | 'all' | 'starred'

interface StudyResult {
  memorized: number
  forgotten: number
  total: number
  xpEarned: number
  timeSeconds: number
}

interface Props {
  cards: Flashcard[]
  mode: StudyMode
  onClose: () => void
  onUpdateCard: (id: string, updates: Partial<Flashcard>) => Promise<void>
}

// ─── Quality labels ───────────────────────────────────────────────────────────

const QUALITY_CONFIG = [
  { q: 1, label: 'Lại từ đầu', sublabel: '1m', color: 'text-danger-600 dark:text-danger-400', bg: 'bg-danger-50 dark:bg-danger-500/10 hover:bg-danger-100 dark:hover:bg-danger-500/20', border: 'border-danger-200 dark:border-danger-800', key: '1' },
  { q: 3, label: 'Khó',        sublabel: '~6h',  color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/20', border: 'border-orange-200 dark:border-orange-800', key: '2' },
  { q: 4, label: 'Tốt',        sublabel: '1-3n', color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-50 dark:bg-primary-500/10 hover:bg-primary-100 dark:hover:bg-primary-500/20', border: 'border-primary-200 dark:border-primary-800', key: '3' },
  { q: 5, label: 'Dễ',         sublabel: '4+n', color: 'text-success-600 dark:text-success-400', bg: 'bg-success-50 dark:bg-success-500/10 hover:bg-success-100 dark:hover:bg-success-500/20', border: 'border-success-200 dark:border-success-800', key: '4' },
]

// ─── Session Summary Screen ───────────────────────────────────────────────────

function SessionSummary({ result, onClose, onRestart }: { result: StudyResult; onClose: () => void; onRestart: () => void }) {
  const pct = result.total > 0 ? Math.round((result.memorized / result.total) * 100) : 0
  const mins = Math.floor(result.timeSeconds / 60)
  const secs = result.timeSeconds % 60

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-surface-50 to-primary-50 dark:from-surface-950 dark:to-primary-950/30 px-6 animate-fade-in">
      {/* Trophy animation */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-gradient-brand flex items-center justify-center shadow-glow animate-pulse-slow">
          <Trophy className="w-12 h-12 text-white" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-white font-black text-sm shadow">
          +{result.xpEarned}
        </div>
      </div>

      <h2 className="text-3xl font-black text-surface-900 dark:text-white mb-1">Phiên học hoàn thành! 🎉</h2>
      <p className="text-surface-500 mb-8">+{result.xpEarned} XP đã được ghi nhận</p>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-lg mb-8">
        {[
          { label: 'Đã thuộc', value: result.memorized, icon: CheckCircle2, color: 'text-success-500', bg: 'bg-success-50 dark:bg-success-500/10' },
          { label: 'Cần ôn lại', value: result.forgotten, icon: XCircle, color: 'text-danger-500', bg: 'bg-danger-50 dark:bg-danger-500/10' },
          { label: 'Tỉ lệ', value: `${pct}%`, icon: Zap, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { label: 'Thời gian', value: `${mins}m${secs}s`, icon: Timer, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-500/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={clsx('p-4 rounded-2xl flex flex-col items-center gap-2', bg)}>
            <Icon className={clsx('w-5 h-5', color)} />
            <p className="text-xl font-black text-surface-900 dark:text-white">{value}</p>
            <p className="text-xs text-surface-500 text-center">{label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-lg mb-8">
        <div className="h-3 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-success-500 transition-all duration-1000"
            style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-surface-400 text-center mt-2">{pct >= 80 ? '🌟 Xuất sắc!' : pct >= 60 ? '👍 Tốt lắm!' : '💪 Cố gắng hơn nhé!'}</p>
      </div>

      <div className="flex gap-3">
        <button onClick={onRestart}
          className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-primary-200 dark:border-primary-800 text-primary-600 dark:text-primary-400 font-semibold hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors">
          <RotateCcw className="w-4 h-4" /> Học lại
        </button>
        <button onClick={onClose}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-brand text-white font-semibold hover:opacity-90 transition-opacity shadow-glow-sm">
          Xong 🎓
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FlashcardStudyMode({ cards, mode, onClose, onUpdateCard }: Props) {
  const { addXp } = useProfile()
  const [studyCards, setStudyCards] = useState<Flashcard[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showKeys, setShowKeys] = useState(false)
  const [stats, setStats] = useState({ memorized: 0, forgotten: 0 })
  const [result, setResult] = useState<StudyResult | null>(null)
  const [startTime] = useState(Date.now())
  const [isAnimating, setIsAnimating] = useState(false)
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null)

  // Touch swipe tracking
  const touchStartX = useRef<number>(0)

  // Initialize cards based on mode
  useEffect(() => {
    let filtered: Flashcard[] = []
    if (mode === 'due') {
      filtered = cards.filter(c => !c.next_review_date || new Date(c.next_review_date) <= new Date())
    } else if (mode === 'starred') {
      filtered = cards.filter(c => c.is_memorized)
    } else {
      filtered = [...cards]
    }
    // Shuffle
    setStudyCards(filtered.sort(() => Math.random() - 0.5))
    setCurrentIdx(0)
    setIsFlipped(false)
  }, [cards, mode])

  const currentCard = studyCards[currentIdx]
  const progressPct = studyCards.length > 0 ? Math.round((currentIdx / studyCards.length) * 100) : 0

  // ── Handle quality answer ──
  const handleQuality = useCallback(async (quality: number) => {
    if (!currentCard || !isFlipped || isAnimating) return
    setIsAnimating(true)

    const { newInterval, newRepetitions, newEaseFactor } = calculateSM2(
      quality,
      currentCard.repetition || 0,
      currentCard.interval || 0,
      currentCard.ease_factor || 2.5
    )
    const nextReviewDate = new Date()
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval)
    const isMemorized = quality >= 3

    try {
      await onUpdateCard(currentCard.id, {
        is_memorized: isMemorized,
        last_reviewed: new Date().toISOString(),
        interval: newInterval,
        repetition: newRepetitions,
        ease_factor: newEaseFactor,
        next_review_date: nextReviewDate.toISOString(),
      })
    } catch { /* silent */ }

    setStats(prev => ({
      memorized: prev.memorized + (isMemorized ? 1 : 0),
      forgotten: prev.forgotten + (isMemorized ? 0 : 1),
    }))

    // If forgotten, push back to end
    if (quality < 3) {
      setStudyCards(prev => [...prev, currentCard])
    }

    // Slide out animation
    setSlideDir(isMemorized ? 'right' : 'left')
    setTimeout(() => {
      setSlideDir(null)
      setIsFlipped(false)

      if (currentIdx < studyCards.length - 1) {
        setCurrentIdx(prev => prev + 1)
      } else {
        // Session complete
        const elapsed = Math.round((Date.now() - startTime) / 1000)
        const xpEarned = (stats.memorized + (isMemorized ? 1 : 0)) * 2 + 5 // 2 XP per card + 5 bonus
        addXp(xpEarned).catch(() => {})
        setResult({
          memorized: stats.memorized + (isMemorized ? 1 : 0),
          forgotten: stats.forgotten + (isMemorized ? 0 : 1),
          total: currentIdx + 1,
          xpEarned,
          timeSeconds: elapsed,
        })
      }
      setIsAnimating(false)
    }, 300)
  }, [currentCard, isFlipped, isAnimating, currentIdx, studyCards, stats, startTime, addXp, onUpdateCard])

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (result) return

      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault()
          setIsFlipped(v => !v)
          break
        case '1': handleQuality(1); break
        case '2': handleQuality(3); break
        case '3': handleQuality(4); break
        case '4': handleQuality(5); break
        case 'ArrowLeft': if (!isFlipped) setCurrentIdx(p => Math.max(0, p - 1)); break
        case 'ArrowRight': if (!isFlipped) setCurrentIdx(p => Math.min(studyCards.length - 1, p + 1)); break
        case 'Escape': onClose(); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isFlipped, handleQuality, result, studyCards.length, onClose])

  // ── Touch swipe ──
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(diff) < 60) return
    if (!isFlipped) { setIsFlipped(true); return }
    if (diff < 0) handleQuality(1)  // swipe left = again
    else handleQuality(5)           // swipe right = easy
  }

  // ── Early empty state ──
  if (studyCards.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-50 dark:bg-surface-950">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-surface-900 dark:text-white mb-2">Không có thẻ nào cần ôn!</h2>
          <p className="text-surface-500 mb-6">
            {mode === 'due' ? 'Tất cả thẻ đều đã được ôn tập. Quay lại sau!' : 'Chưa có thẻ nào trong bộ sưu tập này.'}
          </p>
          <button onClick={onClose} className="btn btn-primary px-8 py-3">Quay về</button>
        </div>
      </div>
    )
  }

  // ── Session summary ──
  if (result) {
    return (
      <div className="fixed inset-0 z-50">
        <SessionSummary result={result} onClose={onClose} onRestart={() => {
          setResult(null)
          setStudyCards(s => [...s].sort(() => Math.random() - 0.5))
          setCurrentIdx(0)
          setIsFlipped(false)
          setStats({ memorized: 0, forgotten: 0 })
        }} />
      </div>
    )
  }

  if (!currentCard) return null

  const subjectData = Array.isArray(currentCard.subjects) ? currentCard.subjects[0] : currentCard.subjects

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-surface-50 via-white to-primary-50/30 dark:from-surface-950 dark:via-surface-900 dark:to-primary-950/20"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-surface-200 dark:border-surface-800 bg-white/80 dark:bg-surface-900/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 rounded-xl text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-bold text-surface-900 dark:text-white text-sm sm:text-base">Ôn tập Flashcards</h2>
            <p className="text-xs text-surface-500">
              {mode === 'due' ? '📅 Đến hạn hôm nay' : mode === 'starred' ? '⭐ Đã thuộc' : '🔀 Toàn bộ'}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5 text-success-600 dark:text-success-400 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span className="hidden sm:inline">Thuộc: </span>{stats.memorized}
          </div>
          <div className="flex items-center gap-1.5 text-danger-500 text-xs font-bold">
            <XCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Quên: </span>{stats.forgotten}
          </div>
          <button
            onClick={() => setShowKeys(v => !v)}
            className="p-2 rounded-xl text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors hidden sm:flex"
            title="Phím tắt"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Progress bar ─────────────────────────────────────────────────── */}
      <div className="h-1.5 bg-surface-100 dark:bg-surface-800 shrink-0">
        <div
          className="h-full bg-gradient-to-r from-primary-500 to-cyan-500 transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* ── Counter ──────────────────────────────────────────────────────── */}
      <div className="text-center py-2 shrink-0">
        <span className="text-sm font-semibold text-surface-500">
          {currentIdx + 1} <span className="text-surface-300 dark:text-surface-600">/</span> {studyCards.length}
        </span>
        {subjectData && (
          <span className="ml-3 px-2 py-0.5 rounded-md text-xs font-semibold"
            style={{ background: `${subjectData.color}20`, color: subjectData.color }}>
            {subjectData.title}
          </span>
        )}
      </div>

      {/* ── Card area ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-4 overflow-hidden">
        <div className="w-full max-w-2xl">
          {/* 3D Flip Card */}
          <div className="perspective-1000 w-full">
            <div
              className={clsx(
                'relative w-full transition-transform duration-500 transform-style-3d cursor-pointer select-none',
                'h-[320px] sm:h-[400px]',
                isFlipped && 'rotate-y-180',
                slideDir === 'right' && 'translate-x-[110%] opacity-0',
                slideDir === 'left' && '-translate-x-[110%] opacity-0',
              )}
              onClick={() => setIsFlipped(v => !v)}
            >
              {/* ── Front ── */}
              <div className="absolute inset-0 backface-hidden rounded-3xl shadow-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 flex flex-col items-center justify-center p-8 text-center overflow-hidden">
                {/* Decorative corners */}
                <div className="absolute top-0 left-0 w-20 h-20 bg-primary-500/5 rounded-br-full" />
                <div className="absolute bottom-0 right-0 w-20 h-20 bg-cyan-500/5 rounded-tl-full" />

                <span className="text-xs font-bold uppercase tracking-widest text-primary-500 mb-4">Câu hỏi</span>

                {currentCard.image_url && (
                  <img src={currentCard.image_url} alt="" className="max-h-24 object-contain rounded-lg mb-4" />
                )}

                <h3 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-white leading-relaxed line-clamp-5">
                  {currentCard.question}
                </h3>

                <div className="absolute bottom-5 flex items-center gap-2 text-surface-400 text-xs">
                  <RotateCcw className="w-3.5 h-3.5 animate-spin-slow" />
                  <span className="hidden sm:inline">Space</span> để lật thẻ
                </div>
              </div>

              {/* ── Back ── */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-3xl shadow-xl flex flex-col items-center justify-center p-8 text-center overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #6B4EFF, #06b6d4)' }}>
                {/* Shimmer overlay */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                <span className="relative text-xs font-bold uppercase tracking-widest text-white/60 mb-4">Đáp án</span>
                <p className="relative text-lg sm:text-xl font-semibold text-white leading-relaxed overflow-y-auto max-h-[75%] custom-scrollbar">
                  {currentCard.answer}
                </p>
              </div>
            </div>
          </div>

          {/* ── Hint below card ── */}
          {!isFlipped && (
            <p className="text-center text-xs text-surface-400 mt-4 hidden sm:block">
              ← → để điều hướng • Space để lật • Esc để thoát
            </p>
          )}
        </div>
      </div>

      {/* ── Action buttons (SM-2) ─────────────────────────────────────────── */}
      <div className={clsx(
        'shrink-0 px-4 sm:px-8 pb-6 pt-2 transition-all duration-300',
        isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none',
      )}>
        <p className="text-center text-xs text-surface-400 mb-3">Đánh giá mức độ ghi nhớ</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 max-w-xl mx-auto">
          {QUALITY_CONFIG.map(({ q, label, sublabel, color, bg, border, key }) => (
            <button
              key={q}
              onClick={(e) => { e.stopPropagation(); handleQuality(q) }}
              className={clsx(
                'flex flex-col items-center justify-center gap-1 py-3 sm:py-4 px-2 rounded-2xl border-2 font-bold transition-all duration-150 active:scale-95',
                bg, border
              )}
            >
              <span className={clsx('text-sm font-bold', color)}>{label}</span>
              <span className="text-[10px] text-surface-400">{sublabel}</span>
              <kbd className="hidden sm:block text-[9px] px-1.5 py-0.5 bg-surface-100 dark:bg-surface-700 rounded text-surface-400 font-mono">[{key}]</kbd>
            </button>
          ))}
        </div>
      </div>

      {/* ── Keyboard shortcuts overlay ────────────────────────────────────── */}
      {showKeys && (
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center p-4"
          onClick={() => setShowKeys(false)}
        >
          <div className="bg-white dark:bg-surface-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-center mb-4 text-surface-900 dark:text-white flex items-center justify-center gap-2">
              <Keyboard className="w-4 h-4" /> Phím tắt
            </h3>
            <div className="space-y-2 text-sm">
              {[
                ['Space / Enter', 'Lật thẻ'],
                ['1', 'Lại từ đầu'],
                ['2', 'Khó'],
                ['3', 'Tốt'],
                ['4', 'Dễ'],
                ['← / →', 'Điều hướng'],
                ['Esc', 'Thoát phiên học'],
              ].map(([key, desc]) => (
                <div key={key} className="flex justify-between items-center">
                  <kbd className="px-2 py-1 bg-surface-100 dark:bg-surface-700 rounded text-surface-600 dark:text-surface-300 font-mono text-xs">{key}</kbd>
                  <span className="text-surface-500">{desc}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowKeys(false)} className="w-full mt-4 py-2 rounded-xl bg-surface-100 dark:bg-surface-700 text-sm font-medium text-surface-600 dark:text-surface-300">
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, ChevronRight, ChevronLeft, Sparkles, BookOpen, BarChart2, CheckSquare, Clock, Zap } from 'lucide-react'

// ─── Tour Step definition ─────────────────────────────────────────────────────
interface TourStep {
  targetId: string | null     // null = centered modal (no spotlight)
  title: string
  description: string
  icon: React.ElementType
  iconColor: string
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: null,
    title: 'Chào mừng đến Student OS AI! 🎉',
    description: 'Hệ điều hành học tập thông minh — kết hợp Gamification, AI cá nhân hóa và quản lý thời gian khoa học để giúp bạn chinh phục mọi mục tiêu học tập.',
    icon: Sparkles,
    iconColor: 'text-primary-400',
    position: 'center',
  },
  {
    targetId: 'hero-profile-card',
    title: 'Hồ sơ Học tập của bạn 🏆',
    description: 'Đây là trung tâm Gamification! Theo dõi Level, Điểm XP tích lũy, chuỗi ngày học liên tục (Streak) và Rank của bạn từ Đồng → Bạc → Vàng → Bạch Kim → Kim Cương → Thách Đấu.',
    icon: Zap,
    iconColor: 'text-yellow-400',
    position: 'bottom',
  },
  {
    targetId: 'study-hours-chart',
    title: 'Biểu đồ Giờ Học 📊',
    description: 'Theo dõi trực quan số giờ bạn tập trung học tập mỗi ngày trong tuần. Mục tiêu ít nhất 2h/ngày để duy trì Streak và tối đa hóa XP nhận được.',
    icon: BarChart2,
    iconColor: 'text-blue-400',
    position: 'top',
  },
  {
    targetId: 'today-timeline-card',
    title: 'Lịch Học Hôm Nay 📅',
    description: 'Xem ngay thời gian biểu và các sự kiện học tập hôm nay. Bạn có thể thêm sự kiện mới trong trang Lịch để không bao giờ bỏ lỡ deadline hay buổi học quan trọng nào.',
    icon: Clock,
    iconColor: 'text-green-400',
    position: 'top',
  },
  {
    targetId: 'upcoming-tasks-card',
    title: 'Công việc sắp tới ✅',
    description: 'Danh sách nhiệm vụ cần làm được sắp xếp theo deadline và độ ưu tiên (Khẩn → Bình thường → Thấp). Hoàn thành mỗi task để nhận XP thưởng!',
    icon: CheckSquare,
    iconColor: 'text-purple-400',
    position: 'left',
  },
  {
    targetId: 'ai-weekly-report',
    title: 'Cố vấn AI Hàng tuần 🤖',
    description: 'Nhận phân tích học tập cá nhân hóa từ AI mỗi tuần: điểm mạnh, điểm yếu, và lộ trình cải thiện được đề xuất riêng cho bạn. Chúc bạn học tập hiệu quả!',
    icon: BookOpen,
    iconColor: 'text-pink-400',
    position: 'left',
  },
]

// ─── Spotlight rect ────────────────────────────────────────────────────────────
interface SpotlightRect { top: number; left: number; width: number; height: number }

function getElementRect(id: string): SpotlightRect | null {
  const el = document.getElementById(id)
  if (!el) return null
  const rect = el.getBoundingClientRect()
  return { top: rect.top + window.scrollY, left: rect.left, width: rect.width, height: rect.height }
}

// ─── Component ────────────────────────────────────────────────────────────────
interface OnboardingTourProps {
  onComplete: () => void
  onSkip: () => void
}

export function OnboardingTour({ onComplete, onSkip }: OnboardingTourProps) {
  const [step, setStep] = useState(0)
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const [visible, setVisible] = useState(false)
  const resizeRef = useRef<ResizeObserver | null>(null)
  const PADDING = 16

  const currentStep = TOUR_STEPS[step]
  const totalSteps = TOUR_STEPS.length
  const isLast = step === totalSteps - 1
  const isFirst = step === 0

  const computePositions = useCallback(() => {
    if (!currentStep.targetId) {
      setSpotlight(null)
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10001,
      })
      return
    }
    const rect = getElementRect(currentStep.targetId)
    if (!rect) return

    // Scroll the element into view smoothly
    const el = document.getElementById(currentStep.targetId!)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })

    setSpotlight({ ...rect, top: rect.top - PADDING, left: rect.left - PADDING, width: rect.width + PADDING * 2, height: rect.height + PADDING * 2 })

    // Compute tooltip position
    const vw = window.innerWidth
    const vh = window.innerHeight
    const tooltipW = Math.min(360, vw - 32)
    const tooltipH = 240 // approximate
    const pos = currentStep.position ?? 'bottom'
    let top: number, left: number

    const elScrollTop = rect.top  // already includes scrollY
    const elScreenTop = rect.top - window.scrollY

    if (pos === 'bottom') {
      top = elScrollTop + rect.height + PADDING * 2 + 4
      left = rect.left + rect.width / 2 - tooltipW / 2
    } else if (pos === 'top') {
      top = elScrollTop - tooltipH - PADDING * 2 - 4
      left = rect.left + rect.width / 2 - tooltipW / 2
    } else if (pos === 'left') {
      top = elScrollTop + rect.height / 2 - tooltipH / 2
      left = rect.left - tooltipW - PADDING * 2 - 4
    } else if (pos === 'right') {
      top = elScrollTop + rect.height / 2 - tooltipH / 2
      left = rect.left + rect.width + PADDING * 2 + 4
    } else {
      top = window.scrollY + vh / 2 - tooltipH / 2
      left = vw / 2 - tooltipW / 2
    }

    // Clamp within viewport horizontally
    left = Math.max(16, Math.min(left, vw - tooltipW - 16))

    // Mobile fallback: if no space, show fixed at bottom
    const isMobile = vw < 768
    if (isMobile) {
      setTooltipStyle({ position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 10001 })
      return
    }

    setTooltipStyle({ position: 'absolute', top, left, width: tooltipW, zIndex: 10001 })
  }, [currentStep])

  useEffect(() => {
    // Slight delay so DOM has time to scroll/render
    const t = setTimeout(() => {
      computePositions()
      setVisible(true)
    }, 50)

    // Watch for resize
    resizeRef.current = new ResizeObserver(() => computePositions())
    resizeRef.current.observe(document.body)

    window.addEventListener('resize', computePositions)
    window.addEventListener('scroll', computePositions, { passive: true })

    return () => {
      clearTimeout(t)
      resizeRef.current?.disconnect()
      window.removeEventListener('resize', computePositions)
      window.removeEventListener('scroll', computePositions)
    }
  }, [computePositions])

  const goNext = () => {
    setVisible(false)
    setTimeout(() => { setStep(s => s + 1); setVisible(false) }, 120)
    setTimeout(() => setVisible(true), 200)
  }

  const goPrev = () => {
    setVisible(false)
    setTimeout(() => { setStep(s => s - 1) }, 120)
    setTimeout(() => setVisible(true), 200)
  }

  const handleFinish = () => {
    setVisible(false)
    setTimeout(onComplete, 300)
  }

  const handleSkip = () => {
    setVisible(false)
    setTimeout(onSkip, 300)
  }

  const StepIcon = currentStep.icon

  return (
    <>
      {/* ── Dark overlay with SVG cut-out spotlight ─────────────────────────── */}
      <div
        className="fixed inset-0 z-[10000] pointer-events-none select-none"
        style={{ background: 'rgba(0,0,0,0.65)' }}
      >
        {spotlight && (
          <svg
            className="absolute inset-0 w-full h-full"
            style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
          >
            <defs>
              <mask id="spotlight-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={spotlight.left}
                  y={spotlight.top - window.scrollY}
                  width={spotlight.width}
                  height={spotlight.height}
                  rx={16}
                  fill="black"
                />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(0,0,0,0.65)" mask="url(#spotlight-mask)" />
          </svg>
        )}
      </div>

      {/* ── Spotlight border glow ─────────────────────────────────────────────── */}
      {spotlight && (
        <div
          className="pointer-events-none"
          style={{
            position: 'fixed',
            zIndex: 10001,
            top: spotlight.top - window.scrollY,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            borderRadius: 16,
            boxShadow: '0 0 0 2px rgba(107,78,255,0.8), 0 0 24px 4px rgba(107,78,255,0.4)',
            transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      )}

      {/* ── Click-blocker overlay (allows clicks on tooltip only) ─────────────── */}
      <div
        className="fixed inset-0 z-[10000]"
        onClick={handleSkip}
        aria-label="Bỏ qua hướng dẫn"
      />

      {/* ── Tooltip card ─────────────────────────────────────────────────────── */}
      <div
        style={{
          ...tooltipStyle,
          opacity: visible ? 1 : 0,
          transform: tooltipStyle.transform
            ? `${tooltipStyle.transform} scale(${visible ? 1 : 0.94})`
            : `translateY(${visible ? 0 : 8}px) scale(${visible ? 1 : 0.96})`,
          transition: 'opacity 0.22s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            backdropFilter: 'blur(20px) saturate(180%)',
            background: 'rgba(15, 12, 30, 0.82)',
            border: '1px solid rgba(107,78,255,0.35)',
            borderRadius: 20,
            padding: '24px 24px 20px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset',
            maxWidth: 380,
            width: '100%',
          }}
        >
          {/* Top row: icon + step indicator + close */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(107,78,255,0.15)', border: '1px solid rgba(107,78,255,0.25)' }}
              >
                <StepIcon className={`w-5 h-5 ${currentStep.iconColor}`} strokeWidth={2} />
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Bước {step + 1} / {totalSteps}
                </p>
                <div className="flex gap-1 mt-1">
                  {TOUR_STEPS.map((_, i) => (
                    <div
                      key={i}
                      style={{
                        width: i === step ? 18 : 6,
                        height: 6,
                        borderRadius: 3,
                        background: i === step ? '#6B4EFF' : 'rgba(255,255,255,0.2)',
                        transition: 'all 0.3s ease',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white/70"
              aria-label="Bỏ qua"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <h3 className="text-base font-bold leading-snug mb-2" style={{ color: 'rgba(255,255,255,0.95)' }}>
            {currentStep.title}
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {currentStep.description}
          </p>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <button
              onClick={handleSkip}
              className="text-xs font-medium transition-colors"
              style={{ color: 'rgba(255,255,255,0.35)' }}
              onMouseOver={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
              onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
            >
              Bỏ qua
            </button>

            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={goPrev}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.6)',
                    border: '1px solid rgba(255,255,255,0.10)',
                  }}
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Quay lại
                </button>
              )}
              <button
                onClick={isLast ? handleFinish : goNext}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: isLast
                    ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                    : 'linear-gradient(135deg, #6B4EFF 0%, #06b6d4 100%)',
                  color: 'white',
                  boxShadow: isLast ? '0 0 16px rgba(34,197,94,0.4)' : '0 0 16px rgba(107,78,255,0.4)',
                }}
              >
                {isLast ? (
                  <><Sparkles className="w-3.5 h-3.5" /> Nhận 50 XP &amp; Bắt đầu!</>
                ) : (
                  <>Tiếp tục <ChevronRight className="w-3.5 h-3.5" /></>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

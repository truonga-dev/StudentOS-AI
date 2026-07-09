import { useState } from 'react'
import { Plus, X, Loader2, GraduationCap, Edit2, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import { useGPA, useGrades } from '@/hooks/useGPA'
import { useSubjects } from '@/hooks/useSubjects'
import { Calculator } from 'lucide-react'

export function GPATracker() {
  const { summary, loading: summaryLoading, refresh: refreshSummary } = useGPA()
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  
  // Projection States
  const [showProjection, setShowProjection] = useState(false)
  const [targetGPA, setTargetGPA] = useState<number>(3.2)
  const [remainingCredits, setRemainingCredits] = useState<number>(30)
  
  if (summaryLoading) {
    return (
      <div className="card p-6 flex justify-center items-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="card p-5 space-y-6">
      {/* Header & Overview */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-500 flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="section-title text-base">GPA Tracker</h3>
            <p className="text-xs text-surface-500">Quản lý và theo dõi điểm trung bình</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-surface-500">GPA (Hệ 10)</p>
            <p className="text-lg font-bold text-surface-900 dark:text-white">{summary?.gpa_10.toFixed(2) || '0.00'}</p>
          </div>
          <div className="w-px h-8 bg-surface-200 dark:bg-surface-700" />
          <div className="text-right">
            <p className="text-xs text-surface-500">GPA (Hệ 4)</p>
            <p className="text-lg font-bold text-primary-500">{summary?.gpa_4.toFixed(2) || '0.00'}</p>
          </div>
        </div>
      </div>

      {/* Projection Tool Toggle */}
      <button 
        onClick={() => setShowProjection(!showProjection)}
        className="flex items-center gap-2 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 transition-colors"
      >
        <Calculator className="w-4 h-4" />
        {showProjection ? 'Đóng công cụ dự phóng' : 'Dự phóng điểm mục tiêu'}
      </button>

      {/* Projection Tool UI */}
      {showProjection && summary && (
        <div className="p-4 rounded-2xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 animate-slide-up space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-surface-500">GPA mục tiêu (Hệ 4)</label>
              <input 
                type="number" step="0.01" min="0" max="4"
                value={targetGPA} onChange={e => setTargetGPA(parseFloat(e.target.value) || 0)}
                className="w-full input text-sm py-2"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-surface-500">Số tín chỉ còn lại</label>
              <input 
                type="number" min="1"
                value={remainingCredits} onChange={e => setRemainingCredits(parseInt(e.target.value) || 0)}
                className="w-full input text-sm py-2"
              />
            </div>
          </div>
          
          {(() => {
            const currentTotalCredits = summary.total_credits || 0
            const currentGPA4 = summary.gpa_4 || 0
            
            if (remainingCredits <= 0) return null
            
            const requiredGPA = ((targetGPA * (currentTotalCredits + remainingCredits)) - (currentGPA4 * currentTotalCredits)) / remainingCredits
            const isImpossible = requiredGPA > 4.0
            const isAlreadyAchieved = requiredGPA <= 0
            
            return (
              <div className={clsx(
                "p-3 rounded-xl border text-sm",
                isImpossible ? "bg-danger-50 dark:bg-danger-500/10 border-danger-200 text-danger-700 dark:text-danger-400" :
                isAlreadyAchieved ? "bg-success-50 dark:bg-success-500/10 border-success-200 text-success-700 dark:text-success-400" :
                "bg-primary-50 dark:bg-primary-500/10 border-primary-200 text-primary-700 dark:text-primary-400"
              )}>
                {isImpossible ? (
                  <p><strong>Bất khả thi!</strong> Bạn cần GPA {requiredGPA.toFixed(2)} cho {remainingCredits} tín chỉ còn lại (vượt quá 4.0). Hãy điều chỉnh mục tiêu.</p>
                ) : isAlreadyAchieved ? (
                  <p><strong>Rất tốt!</strong> Bạn đã đạt hoặc vượt mục tiêu. Kể cả bị 0 điểm các tín chỉ còn lại, bạn vẫn sẽ đạt GPA mục tiêu.</p>
                ) : (
                  <p>Để đạt GPA <strong>{targetGPA.toFixed(2)}</strong>, bạn cần đạt trung bình <strong>{requiredGPA.toFixed(2)}</strong> (hệ 4) cho {remainingCredits} tín chỉ còn lại.</p>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* Subject List */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-surface-700 dark:text-surface-300">Chi tiết môn học</h4>
        {summary?.subjects.length === 0 ? (
          <p className="text-sm text-surface-500 text-center py-4">Chưa có dữ liệu điểm</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {summary?.subjects.map(s => (
              <div 
                key={s.subject_id} 
                className="p-3 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-primary-300 dark:hover:border-primary-500/50 transition-colors cursor-pointer"
                onClick={() => setSelectedSubject(s.subject_id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm font-medium text-surface-900 dark:text-white truncate pr-2">{s.title}</p>
                  <span className={clsx(
                    "text-xs px-2 py-0.5 rounded-md font-medium",
                    s.status === 'pass' ? "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400" : 
                    s.status === 'fail' ? "bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-danger-400" :
                    "bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400"
                  )}>
                    {s.has_grades ? s.average_10.toFixed(1) : '-'}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-surface-500">
                  <span>{s.credits} tín chỉ</span>
                  <span>Hệ 4: {s.has_grades ? s.gpa_4.toFixed(1) : '-'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedSubject && (
        <SubjectGradesModal 
          subjectId={selectedSubject} 
          onClose={() => {
            setSelectedSubject(null)
            refreshSummary()
          }} 
        />
      )}
    </div>
  )
}

function SubjectGradesModal({ subjectId, onClose }: { subjectId: string, onClose: () => void }) {
  const { subjects } = useSubjects()
  const { grades, loading, addGrade, removeGrade } = useGrades(subjectId)
  
  const [title, setTitle] = useState('')
  const [score, setScore] = useState('')
  const [weight, setWeight] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const subject = subjects.find(s => s.id === subjectId)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !score || !weight) return
    setSubmitting(true)
    try {
      await addGrade({
        subject_id: subjectId,
        title,
        score: parseFloat(score),
        weight: parseFloat(weight) / 100 // Convert % to decimal
      })
      setTitle('')
      setScore('')
      setWeight('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-surface-900 rounded-2xl w-full max-w-md overflow-hidden animate-slide-up shadow-xl">
        <div className="p-4 border-b border-surface-200 dark:border-surface-800 flex justify-between items-center">
          <h3 className="font-semibold text-surface-900 dark:text-white truncate pr-4">
            Điểm: {subject?.title}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-surface-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4">
          <form onSubmit={handleAdd} className="flex gap-2 items-end mb-6">
            <div className="flex-1">
              <label className="text-xs font-medium text-surface-500 mb-1 block">Tên cột điểm</label>
              <input 
                type="text" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="VD: Giữa kỳ" 
                className="w-full text-sm rounded-lg border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 px-3 py-2"
                required
              />
            </div>
            <div className="w-20">
              <label className="text-xs font-medium text-surface-500 mb-1 block">Điểm (10)</label>
              <input 
                type="number" 
                step="0.1"
                min="0"
                max="10"
                value={score}
                onChange={e => setScore(e.target.value)}
                className="w-full text-sm rounded-lg border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 px-3 py-2"
                required
              />
            </div>
            <div className="w-20">
              <label className="text-xs font-medium text-surface-500 mb-1 block">Trọng số %</label>
              <input 
                type="number" 
                min="1"
                max="100"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                className="w-full text-sm rounded-lg border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 px-3 py-2"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={submitting}
              className="p-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : grades.length === 0 ? (
            <p className="text-center text-sm text-surface-500 py-8">Chưa có điểm nào được nhập</p>
          ) : (
            <div className="space-y-2">
              {grades.map(g => (
                <div key={g.id} className="flex justify-between items-center p-3 bg-surface-50 dark:bg-surface-800/50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-surface-900 dark:text-white">{g.title}</p>
                    <p className="text-xs text-surface-500">Trọng số: {g.weight * 100}%</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-primary-500">{g.score}</span>
                    <button 
                      onClick={() => removeGrade(g.id)}
                      className="p-1.5 text-surface-400 hover:text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

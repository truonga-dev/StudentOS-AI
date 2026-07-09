import { useState } from 'react'
import { BookOpen, Play, CheckCircle2, ChevronRight, PenTool, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

type MockTestStep = 'setup' | 'doing' | 'result'

interface Question {
  question: string
  options: string[]
  correct_answer: number
}

interface TestData {
  multiple_choice: Question[]
  essay: string[]
}

export function MockTestPage() {
  const [step, setStep] = useState<MockTestStep>('setup')
  const [loading, setLoading] = useState(false)
  const [topic, setTopic] = useState('')
  const [numMC, setNumMC] = useState(5)
  const [numEssay, setNumEssay] = useState(1)
  
  const [testData, setTestData] = useState<TestData | null>(null)
  
  // Doing state
  const [mcAnswers, setMcAnswers] = useState<Record<number, number>>({})
  const [essayAnswers, setEssayAnswers] = useState<Record<number, string>>({})
  
  // Result state
  const [grading, setGrading] = useState(false)
  const [essayResults, setEssayResults] = useState<Record<number, any>>({})

  const generateTest = async () => {
    if (!topic.trim()) {
      toast.error('Vui lòng nhập chủ đề thi')
      return
    }
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("Chưa đăng nhập")

      const response = await fetch(`${import.meta.env.VITE_API_URL}/ai/generate-mock-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          topic,
          num_multiple_choice: numMC,
          num_essay: numEssay
        })
      })

      const result = await response.json()

      if (!response.ok) throw new Error(result.detail || 'Lỗi khi tạo đề thi')

      setTestData(result)
      setStep('doing')
      setMcAnswers({})
      setEssayAnswers({})
    } catch (error: any) {
      toast.error(error.message || 'Lỗi tạo đề thi')
    } finally {
      setLoading(false)
    }
  }

  const submitTest = async () => {
    setStep('result')
    
    // Grade essays in background
    if (testData?.essay.length) {
      setGrading(true)
      const results: Record<number, any> = {}
      
      for (let i = 0; i < testData.essay.length; i++) {
        const question = testData.essay[i]
        const student_answer = essayAnswers[i] || 'Không làm bài'
        
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const response = await fetch(`${import.meta.env.VITE_API_URL}/ai/grade-essay`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({ question, student_answer })
          })
          if (response.ok) {
            results[i] = await response.json()
          }
        } catch (e) {
          results[i] = { score: 0, feedback: 'Không thể chấm điểm do lỗi kết nối' }
        }
      }
      setEssayResults(results)
      setGrading(false)
    }
  }

  const resetTest = () => {
    setStep('setup')
    setTestData(null)
    setEssayResults({})
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center text-primary-500">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white tracking-tight">Thi Thử & Chấm Điểm AI</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">Luyện tập trắc nghiệm và tự luận với AI làm giám khảo.</p>
        </div>
      </div>

      {step === 'setup' && (
        <div className="card p-6 md:p-8">
          <h2 className="text-lg font-semibold mb-6">Cấu hình đề thi</h2>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">Chủ đề bài thi</label>
              <input 
                type="text" 
                className="input" 
                placeholder="Ví dụ: Lịch sử thế chiến 2, Cấu trúc dữ liệu..." 
                value={topic}
                onChange={e => setTopic(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Số câu trắc nghiệm</label>
                <input 
                  type="number" 
                  className="input" 
                  min={0} max={20}
                  value={numMC}
                  onChange={e => setNumMC(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Số câu tự luận</label>
                <input 
                  type="number" 
                  className="input" 
                  min={0} max={5}
                  value={numEssay}
                  onChange={e => setNumEssay(Number(e.target.value))}
                />
              </div>
            </div>
            <button 
              onClick={generateTest}
              disabled={loading}
              className="btn btn-primary w-full mt-4"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (
                <span className="flex items-center gap-2 mx-auto">
                  <Play className="w-5 h-5" /> Bắt đầu thi
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {step === 'doing' && testData && (
        <div className="space-y-6">
          <div className="card p-6 md:p-8">
            <h2 className="text-xl font-bold mb-6 text-primary-500 border-b border-surface-100 dark:border-surface-800 pb-4">
              I. Trắc nghiệm
            </h2>
            {testData.multiple_choice.length === 0 && <p className="text-surface-500 italic">Không có câu hỏi trắc nghiệm.</p>}
            <div className="space-y-8">
              {testData.multiple_choice.map((q, qIdx) => (
                <div key={qIdx}>
                  <p className="font-semibold text-surface-900 dark:text-white mb-3">Câu {qIdx + 1}: {q.question}</p>
                  <div className="space-y-2">
                    {q.options.map((opt, oIdx) => (
                      <label key={oIdx} className="flex items-center gap-3 p-3 rounded-lg border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 cursor-pointer transition-colors">
                        <input 
                          type="radio" 
                          name={`mc_${qIdx}`} 
                          className="text-primary-500 focus:ring-primary-500" 
                          checked={mcAnswers[qIdx] === oIdx}
                          onChange={() => setMcAnswers(prev => ({...prev, [qIdx]: oIdx}))}
                        />
                        <span className="text-surface-700 dark:text-surface-300">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6 md:p-8">
            <h2 className="text-xl font-bold mb-6 text-accent-500 border-b border-surface-100 dark:border-surface-800 pb-4">
              II. Tự luận
            </h2>
            {testData.essay.length === 0 && <p className="text-surface-500 italic">Không có câu hỏi tự luận.</p>}
            <div className="space-y-8">
              {testData.essay.map((q, qIdx) => (
                <div key={qIdx}>
                  <p className="font-semibold text-surface-900 dark:text-white mb-3">Câu {qIdx + 1}: {q}</p>
                  <textarea 
                    className="input min-h-[150px] w-full" 
                    placeholder="Nhập câu trả lời của bạn..."
                    value={essayAnswers[qIdx] || ''}
                    onChange={e => setEssayAnswers(prev => ({...prev, [qIdx]: e.target.value}))}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button onClick={submitTest} className="btn btn-primary px-8">
              Nộp bài <CheckCircle2 className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      )}

      {step === 'result' && testData && (
        <div className="space-y-6">
          <div className="card p-6 md:p-8 bg-gradient-to-br from-success-50 to-white dark:from-success-900/20 dark:to-surface-900 border-success-200 dark:border-success-800/30">
            <h2 className="text-2xl font-bold text-success-700 dark:text-success-400 mb-2">Kết quả bài thi</h2>
            <p className="text-surface-600 dark:text-surface-300">
              Trắc nghiệm: đúng {testData.multiple_choice.filter((q, i) => mcAnswers[i] === q.correct_answer).length} / {testData.multiple_choice.length} câu.
            </p>
          </div>

          <div className="card p-6 md:p-8">
            <h3 className="font-bold text-lg mb-4">Chi tiết trắc nghiệm</h3>
            <div className="space-y-6">
              {testData.multiple_choice.map((q, qIdx) => {
                const isCorrect = mcAnswers[qIdx] === q.correct_answer
                const hasAnswered = mcAnswers[qIdx] !== undefined
                return (
                  <div key={qIdx} className={clsx("p-4 rounded-xl border", isCorrect ? "bg-success-50 border-success-200 dark:bg-success-900/10 dark:border-success-800" : hasAnswered ? "bg-danger-50 border-danger-200 dark:bg-danger-900/10 dark:border-danger-800" : "bg-surface-50 border-surface-200 dark:bg-surface-800 dark:border-surface-700")}>
                    <p className="font-semibold mb-2">Câu {qIdx + 1}: {q.question}</p>
                    <div className="space-y-1">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className={clsx(
                          "flex items-center gap-2 p-2 rounded-lg",
                          oIdx === q.correct_answer && "bg-success-100 text-success-800 dark:bg-success-800/30 dark:text-success-300 font-medium",
                          oIdx === mcAnswers[qIdx] && oIdx !== q.correct_answer && "bg-danger-100 text-danger-800 dark:bg-danger-800/30 dark:text-danger-300 font-medium"
                        )}>
                          <div className={clsx("w-4 h-4 rounded-full border flex items-center justify-center", 
                            oIdx === q.correct_answer ? "border-success-500 bg-success-500" : 
                            oIdx === mcAnswers[qIdx] ? "border-danger-500 bg-danger-500" : "border-surface-300"
                          )}>
                            {(oIdx === q.correct_answer || oIdx === mcAnswers[qIdx]) && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card p-6 md:p-8">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <PenTool className="w-5 h-5 text-accent-500" /> Nhận xét Tự luận từ AI
            </h3>
            {grading && (
              <div className="flex flex-col items-center justify-center py-8 text-surface-500">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-accent-500" />
                <p>AI đang chấm điểm phần tự luận...</p>
              </div>
            )}
            {!grading && (
              <div className="space-y-6">
                {testData.essay.map((q, qIdx) => (
                  <div key={qIdx} className="p-4 border border-surface-200 dark:border-surface-700 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                    <p className="font-semibold mb-2">Câu {qIdx + 1}: {q}</p>
                    <div className="bg-white dark:bg-surface-900 p-3 rounded-lg border border-surface-200 dark:border-surface-700 mb-4 text-sm">
                      <span className="text-surface-400 font-medium">Bài làm:</span>
                      <p className="mt-1 whitespace-pre-wrap">{essayAnswers[qIdx] || <span className="italic text-surface-400">Không có câu trả lời</span>}</p>
                    </div>
                    {essayResults[qIdx] && (
                      <div className="bg-accent-50 dark:bg-accent-500/10 p-4 rounded-lg border border-accent-100 dark:border-accent-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-accent-700 dark:text-accent-300">Điểm AI chấm:</span>
                          <span className="text-xl font-black text-accent-600 dark:text-accent-400">{essayResults[qIdx].score} / 10</span>
                        </div>
                        <p className="text-sm text-surface-700 dark:text-surface-300 whitespace-pre-wrap">{essayResults[qIdx].feedback}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-center pt-6">
            <button onClick={resetTest} className="btn btn-outline px-8">
              Thi lại / Tạo đề mới
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

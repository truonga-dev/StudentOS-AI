import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPublicSubject, getPublicFlashcards } from '@/services/subjects'
import { bulkCreateFlashcards } from '@/services/flashcards'
import type { Subject, Flashcard } from '@/types'
import { Loader2, ArrowLeft, Download, Layers } from 'lucide-react'
import toast from 'react-hot-toast'

export function SharedSubjectPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [subject, setSubject] = useState<Subject | null>(null)
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      if (!id) return
      try {
        const sub = await getPublicSubject(id)
        setSubject(sub)
        const cards = await getPublicFlashcards(id)
        setFlashcards(cards)
      } catch (err: any) {
        toast.error('Môn học không tồn tại hoặc không được chia sẻ công khai.')
        navigate('/')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, navigate])

  const handleClone = async () => {
    try {
      setSaving(true)
      // Note: Trích xuất question, answer và bỏ id, user_id, subject_id cũ
      // Hiện tại app lưu flashcard vào tài khoản user (không cần subject_id hoặc user tự gán lại sau).
      const inputs = flashcards.map(f => ({
        question: f.question,
        answer: f.answer,
        subject_id: null
      }))
      await bulkCreateFlashcards(inputs)
      toast.success(`Đã lưu ${flashcards.length} flashcard vào kho của bạn!`)
      navigate('/flashcards')
    } catch (err: any) {
      toast.error('Lỗi khi lưu flashcard: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-surface-50 dark:bg-surface-900">
      <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
    </div>
  )

  if (!subject) return null

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-surface-500 hover:text-surface-900 dark:hover:text-surface-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" /> Trở về Trang chủ
        </button>
        
        <div className="card p-8 shadow-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300 mb-4">
                Bộ thẻ được chia sẻ
              </span>
              <h1 className="text-3xl font-bold">{subject.title}</h1>
              <p className="text-surface-500 mt-2 flex items-center gap-2">
                <Layers className="w-4 h-4" /> Bao gồm {flashcards.length} Flashcard
              </p>
            </div>
            
            <button
              onClick={handleClone}
              disabled={saving || flashcards.length === 0}
              className="btn bg-gradient-brand text-white shadow-glow-sm hover:shadow-glow px-6 py-3 text-lg font-medium"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (
                <>
                  <Download className="w-5 h-5 mr-2" /> Lưu về kho của tôi
                </>
              )}
            </button>
          </div>
          
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {flashcards.map(card => (
              <div key={card.id} className="p-4 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/50">
                <div className="font-semibold text-primary-600 dark:text-primary-400 mb-2">Hỏi: {card.question}</div>
                <div className="text-surface-700 dark:text-surface-300">Đáp: {card.answer}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

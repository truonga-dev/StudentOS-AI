import { useState, useRef } from 'react'
import { Plus, Search, BookOpen, Trash2, Brain, Loader2, PlayCircle, X, ChevronRight, ChevronLeft, Check, RotateCcw, Image as ImageIcon, Sparkles, Layers } from 'lucide-react'
import { clsx } from 'clsx'
import { useFlashcards } from '@/hooks/useFlashcards'
import { useSubjects } from '@/hooks/useSubjects'
import { generateFlashcardsFromImage, generateFlashcardsFromDocument } from '@/services/ai'
import { uploadFlashcardImage } from '@/services/flashcards'
import { useFiles } from '@/hooks/useFiles'
import { calculateSM2 } from '@/utils/sm2'
import { FileText, File as FileIcon, Presentation } from 'lucide-react'
import toast from 'react-hot-toast'

export function FlashcardsPage() {
  const { flashcards, loading, addFlashcard, addMultipleFlashcards, editFlashcard, removeFlashcard } = useFlashcards()
  const { subjects } = useSubjects()
  const { files } = useFiles()
  
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({ question: '', answer: '', subject_id: '' })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  
  // AI Generate state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedCards, setGeneratedCards] = useState<{question: string, answer: string}[]>([])
  const [selectedSubjectIdForAi, setSelectedSubjectIdForAi] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Document selection
  const [isSelectingDocument, setIsSelectingDocument] = useState(false)
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  
  // Study Mode state
  const [studyMode, setStudyMode] = useState(false)
  const [studyCards, setStudyCards] = useState<typeof flashcards>([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [studyStats, setStudyStats] = useState({ total: 0, memorized: 0, forgotten: 0 })

  const filteredCards = flashcards.filter(c => 
    c.question.toLowerCase().includes(search.toLowerCase()) || 
    c.answer.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.question.trim() || !formData.answer.trim()) {
      toast.error('Vui lòng nhập đủ câu hỏi và trả lời')
      return
    }

    try {
      setIsUploadingImage(true)
      let uploadedUrl = null
      if (imageFile) {
        uploadedUrl = await uploadFlashcardImage(imageFile)
      }

      await addFlashcard({
        question: formData.question.trim(),
        answer: formData.answer.trim(),
        subject_id: formData.subject_id || null,
        image_url: uploadedUrl
      })
      
      setIsModalOpen(false)
      setFormData({ question: '', answer: '', subject_id: '' })
      setImageFile(null)
      setImagePreview(null)
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi lưu flashcard')
    } finally {
      setIsUploadingImage(false)
    }
  }
  
  const handleGenerateFromDocuments = async () => {
    if (selectedDocuments.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 tài liệu')
      return
    }
    
    try {
      setIsGenerating(true)
      setGeneratedCards([])
      const cards = await generateFlashcardsFromDocument(selectedDocuments)
      setGeneratedCards(cards)
      setIsSelectingDocument(false)
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi tạo flashcard từ tài liệu')
    } finally {
      setIsGenerating(false)
    }
  }

  // Tính toán thẻ đến hạn ôn tập
  const dueCards = flashcards.filter(card => {
    if (!card.next_review_date) return true // Thẻ mới chưa học bao giờ
    return new Date(card.next_review_date) <= new Date() // Thẻ đã đến hạn
  })

  // Bắt đầu học
  const startStudy = () => {
    if (dueCards.length === 0) {
      toast.success('Bạn đã học xong tất cả các thẻ đến hạn hôm nay! Tuyệt vời!', { icon: '🎉' })
      return
    }
    setStudyCards([...dueCards].sort(() => Math.random() - 0.5)) // Shuffle
    setCurrentCardIndex(0)
    setIsFlipped(false)
    setStudyStats({ total: flashcards.length, memorized: 0, forgotten: 0 })
    setStudyMode(true)
  }

  const handleStudyAction = async (quality: number) => {
    const currentCard = studyCards[currentCardIndex]
    
    // Tính toán SM-2
    const { newInterval, newRepetitions, newEaseFactor } = calculateSM2(
      quality,
      currentCard.repetition || 0,
      currentCard.interval || 0,
      currentCard.ease_factor || 2.5
    )

    // Tính ngày ôn tập tiếp theo
    const nextReviewDate = new Date()
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval)

    const isMemorized = quality >= 3
    
    try {
      await editFlashcard(currentCard.id, { 
        is_memorized: isMemorized,
        last_reviewed: new Date().toISOString(),
        interval: newInterval,
        repetition: newRepetitions,
        ease_factor: newEaseFactor,
        next_review_date: nextReviewDate.toISOString()
      })
      
      setStudyStats(prev => ({
        ...prev,
        memorized: prev.memorized + (isMemorized ? 1 : 0),
        forgotten: prev.forgotten + (isMemorized ? 0 : 1)
      }))

      // Nếu quality < 3 (chọn Lại từ đầu), nhét thẻ này vào cuối mảng để học lại trong phiên này
      if (quality < 3) {
        setStudyCards(prev => [...prev, currentCard])
      }

      if (currentCardIndex < studyCards.length - 1) {
        setIsFlipped(false)
        setCurrentCardIndex(prev => prev + 1)
      } else {
        toast.success('Đã hoàn thành phiên học!', { icon: '🎓' })
        setStudyMode(false)
      }
    } catch (err) {
      toast.error('Có lỗi xảy ra khi lưu trạng thái học')
    }
  }

  // AI Generation
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Đọc file thành base64
    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = event.target?.result as string
      try {
        setIsGenerating(true)
        setGeneratedCards([]) // reset
        const cards = await generateFlashcardsFromImage(base64, file.type)
        setGeneratedCards(cards)
      } catch (err: any) {
        toast.error(err.message || 'Lỗi khi tạo flashcard từ ảnh')
      } finally {
        setIsGenerating(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSaveAiCards = async () => {
    if (generatedCards.length === 0) return
    
    try {
      await addMultipleFlashcards(
        generatedCards.map(c => ({
          ...c,
          subject_id: selectedSubjectIdForAi || null
        }))
      )
      setIsAiModalOpen(false)
      setGeneratedCards([])
    } catch (err) {}
  }

  if (studyMode) {
    const card = studyCards[currentCardIndex]
    if (!card) return null;

    return (
      <div className="max-w-2xl mx-auto h-[calc(100vh-112px)] flex flex-col pt-8 animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-surface-900 dark:text-white">Ôn tập Flashcards</h2>
            <p className="text-surface-500 mt-1 text-sm">
              Thẻ {currentCardIndex + 1} / {studyCards.length}
            </p>
          </div>
          <button 
            onClick={() => setStudyMode(false)}
            className="p-2 text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-surface-100 dark:bg-surface-800 h-2 rounded-full mb-12 overflow-hidden">
          <div 
            className="bg-primary-500 h-full transition-all duration-300"
            style={{ width: `${((currentCardIndex) / studyCards.length) * 100}%` }}
          />
        </div>

        {/* Card 3D Flip */}
        <div className="flex-1 perspective-1000">
          <div 
            className={clsx(
              "relative w-full h-[400px] transition-transform duration-500 transform-style-3d cursor-pointer",
              isFlipped ? "rotate-y-180" : ""
            )}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            {/* Mặt trước */}
            <div className="absolute inset-0 backface-hidden card bg-white dark:bg-surface-800 flex flex-col items-center justify-center p-8 text-center shadow-xl border border-surface-200 dark:border-surface-700">
              <span className="text-sm font-semibold text-primary-500 uppercase tracking-widest mb-4">Câu hỏi</span>
              {card?.image_url && (
                <img src={card.image_url} alt="Flashcard illustration" className="max-h-[160px] object-contain rounded-lg mb-4" />
              )}
              <h3 className="text-2xl font-bold text-surface-900 dark:text-white leading-relaxed line-clamp-3">
                {card?.question}
              </h3>
              <p className="absolute bottom-6 text-surface-400 text-sm flex items-center gap-2">
                <RotateCcw className="w-4 h-4" /> Bấm để xem đáp án
              </p>
            </div>

            {/* Mặt sau */}
            <div className="absolute inset-0 backface-hidden rotate-y-180 card bg-primary-500 text-white flex flex-col items-center justify-center p-8 text-center shadow-xl">
              <span className="text-sm font-semibold text-primary-200 uppercase tracking-widest mb-6">Đáp án</span>
              <p className="text-2xl font-medium leading-relaxed whitespace-pre-wrap">
                {card?.answer}
              </p>
            </div>
          </div>
        </div>

        {/* Actions (SM-2 Buttons) */}
        <div className={clsx(
          "mt-12 flex flex-wrap items-center justify-center gap-4 transition-all duration-300",
          isFlipped ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}>
          <button
            onClick={(e) => { e.stopPropagation(); handleStudyAction(1); }}
            className="btn h-14 px-6 rounded-2xl bg-danger-50 text-danger-600 hover:bg-danger-100 dark:bg-danger-500/10 dark:hover:bg-danger-500/20 font-bold border-none"
          >
            Lại từ đầu (1 phút)
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleStudyAction(3); }}
            className="btn h-14 px-6 rounded-2xl bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-500/10 dark:hover:bg-orange-500/20 font-bold border-none"
          >
            Khó
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleStudyAction(4); }}
            className="btn h-14 px-6 rounded-2xl bg-primary-50 text-primary-600 hover:bg-primary-100 dark:bg-primary-500/10 dark:hover:bg-primary-500/20 font-bold border-none"
          >
            Tốt
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleStudyAction(5); }}
            className="btn h-14 px-6 rounded-2xl bg-success-50 text-success-600 hover:bg-success-100 dark:bg-success-500/10 dark:hover:bg-success-500/20 font-bold border-none"
          >
            Dễ
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-slide-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Flashcards</h1>
          <p className="text-surface-500 mt-1">Học nhanh, nhớ lâu với thẻ ghi nhớ</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 min-w-[200px] md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              placeholder="Tìm thẻ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 h-10 w-full"
            />
          </div>
          <button
            onClick={startStudy}
            className="btn btn-secondary h-10 px-4 whitespace-nowrap"
          >
            <PlayCircle className="w-4 h-4" /> Học ngay ({dueCards.length})
          </button>
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="btn bg-gradient-brand text-white shadow-glow-sm hover:shadow-glow h-10 px-4 whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" /> Tạo bằng AI
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary h-10 px-4 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Tạo thủ công
          </button>
        </div>
      </div>

      {/* Danh sách Flashcard */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
      ) : flashcards.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 mt-8 rounded-3xl border border-dashed border-surface-200 dark:border-surface-700/50 bg-surface-50/50 dark:bg-surface-800/20">
          <Layers className="w-16 h-16 text-surface-300 dark:text-surface-600 mb-4" strokeWidth={1} />
          <h3 className="text-xl font-semibold text-surface-900 dark:text-white mb-2">Chưa có Flashcard nào</h3>
          <p className="text-surface-500 text-center max-w-sm mb-6">Bạn chưa tạo thẻ ghi nhớ nào. Hãy tạo thêm flashcard để bắt đầu ôn tập hiệu quả nhé!</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-brand text-white font-medium hover:shadow-glow transition-all"
          >
            <Plus className="w-5 h-5" /> Thêm Flashcard
          </button>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 mt-8 rounded-3xl border border-dashed border-surface-200 dark:border-surface-700/50 bg-surface-50/50 dark:bg-surface-800/20">
          <Layers className="w-16 h-16 text-surface-300 dark:text-surface-600 mb-4" strokeWidth={1} />
          <h3 className="text-xl font-semibold text-surface-900 dark:text-white mb-2">Không tìm thấy Flashcard</h3>
          <p className="text-surface-500 text-center max-w-sm">Không có thẻ nào phù hợp với bộ lọc hiện tại của bạn.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCards.map((card) => (
            <div key={card.id} className="card p-6 group hover:border-primary-200 dark:hover:border-primary-500/30 transition-all flex flex-col h-[200px]">
              <div className="flex items-center justify-between mb-4">
                {card.subjects ? (() => {
                  const subjectData = Array.isArray(card.subjects) ? card.subjects[0] : card.subjects;
                  return subjectData ? (
                    <span 
                      className="px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider"
                      style={{ backgroundColor: `${subjectData.color}15`, color: subjectData.color }}
                    >
                      {subjectData.title}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-surface-100 text-surface-500 dark:bg-surface-800">Chung</span>
                  );
                })() : (
                  <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-surface-100 text-surface-500 dark:bg-surface-800">Chung</span>
                )}
                <div className="flex items-center gap-2">
                  {card.is_memorized && (
                    <span className="w-2 h-2 rounded-full bg-success-500" title="Đã thuộc" />
                  )}
                  <button
                    onClick={() => {
                      if(confirm('Xóa thẻ này?')) removeFlashcard(card.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-surface-400 hover:text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-center mt-2">
                {card.image_url && (
                  <div className="flex justify-center mb-2">
                    <ImageIcon className="w-4 h-4 text-surface-400" />
                  </div>
                )}
                <h3 className="font-bold text-surface-900 dark:text-white text-lg line-clamp-2 text-center mb-2">
                  {card.question}
                </h3>
                <p className="text-surface-500 text-sm line-clamp-2 text-center">
                  {card.answer}
                </p>
              </div>

              {/* SM-2 Status Footer */}
              <div className="mt-4 pt-3 border-t border-surface-100 dark:border-surface-800 flex justify-between text-[11px] text-surface-400 font-medium">
                <span>
                  {card.next_review_date ? (
                    new Date(card.next_review_date) <= new Date() 
                      ? <span className="text-orange-500">Đến hạn ôn tập</span>
                      : `Ôn tập: ${new Date(card.next_review_date).toLocaleDateString('vi-VN')}`
                  ) : (
                    <span className="text-primary-500">Thẻ mới</span>
                  )}
                </span>
                <span>Ôn: {card.repetition || 0} lần</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Thêm Flashcard */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-lg p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Thêm Flashcard</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-surface-400 hover:text-surface-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Môn học (Tùy chọn)</label>
                <select
                  value={formData.subject_id}
                  onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                  className="input"
                >
                  <option value="">-- Chọn môn học --</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Câu hỏi (Mặt trước)</label>
                <textarea
                  required
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className="input min-h-[80px]"
                  placeholder="Nhập câu hỏi..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Đáp án (Mặt sau)</label>
                <textarea
                  required
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  className="input min-h-[100px]"
                  placeholder="Nhập đáp án..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Ảnh đính kèm (Tùy chọn)</label>
                <div className="flex items-center gap-4">
                  {imagePreview ? (
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-surface-200">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => { setImageFile(null); setImagePreview(null); }}
                        className="absolute top-1 right-1 p-0.5 bg-black/50 text-white rounded-full hover:bg-black/70"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-surface-300 rounded-lg cursor-pointer bg-surface-50 hover:bg-surface-100 dark:border-surface-700 dark:bg-surface-800 dark:hover:bg-surface-700 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-surface-500">
                        <ImageIcon className="w-6 h-6 mb-1" />
                        <p className="text-xs">Tải ảnh lên</p>
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setImageFile(file);
                            setImagePreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => {setIsModalOpen(false); setImageFile(null); setImagePreview(null)}} className="btn bg-surface-100 hover:bg-surface-200 text-surface-700">
                  Hủy
                </button>
                <button type="submit" disabled={isUploadingImage} className="btn btn-primary shadow-glow-sm">
                  {isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lưu Flashcard'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal AI Generate */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-2xl max-h-[90vh] flex flex-col p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center text-white shadow-glow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Tạo Flashcard từ Ảnh</h2>
                  <p className="text-sm text-surface-500">AI sẽ tự động đọc giáo trình và trích xuất kiến thức</p>
                </div>
              </div>
              <button onClick={() => setIsAiModalOpen(false)} className="text-surface-400 hover:text-surface-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
              {/* Cấu hình & Upload */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Môn học (Áp dụng cho tất cả thẻ sẽ tạo)</label>
                  <select
                    value={selectedSubjectIdForAi}
                    onChange={(e) => setSelectedSubjectIdForAi(e.target.value)}
                    className="input"
                  >
                    <option value="">-- Chọn môn học --</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                </div>
                
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/webp, application/pdf" 
                  ref={fileInputRef}
                  className="hidden" 
                  onChange={handleFileUpload}
                />
                
                {!isGenerating && generatedCards.length === 0 && (
                  isSelectingDocument ? (
                    <div className="space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm">Chọn tài liệu</h3>
                        <button 
                          onClick={() => { setIsSelectingDocument(false); setSelectedDocuments([]) }}
                          className="text-xs text-surface-500 hover:text-surface-700"
                        >
                          Quay lại
                        </button>
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                        {files.filter(f => f.mime_type === 'application/pdf').length === 0 ? (
                          <div className="text-center py-8 text-surface-500 text-sm">
                            Chưa có tài liệu PDF nào. Hãy upload tài liệu ở trang "Tài liệu" trước.
                          </div>
                        ) : (
                          files.filter(f => f.mime_type === 'application/pdf').map(file => (
                            <label key={file.id} className="flex items-center gap-3 p-3 rounded-xl border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 cursor-pointer transition-colors">
                              <input 
                                type="checkbox" 
                                checked={selectedDocuments.includes(file.name)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedDocuments([...selectedDocuments, file.name])
                                  else setSelectedDocuments(selectedDocuments.filter(n => n !== file.name))
                                }}
                                className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                              />
                              <FileText className="w-5 h-5 text-surface-400" />
                              <span className="text-sm font-medium flex-1 truncate">{file.name}</span>
                            </label>
                          ))
                        )}
                      </div>
                      <button 
                        onClick={handleGenerateFromDocuments}
                        disabled={selectedDocuments.length === 0}
                        className="btn btn-primary w-full shadow-glow-sm disabled:opacity-50"
                      >
                        Tạo Flashcard từ {selectedDocuments.length} tài liệu
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div 
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.accept = "image/png, image/jpeg, image/webp";
                            fileInputRef.current.click();
                          }
                        }}
                        className="border-2 border-dashed border-surface-200 dark:border-surface-700 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors text-center h-32"
                      >
                        <ImageIcon className="w-8 h-8 text-primary-500 mb-2 opacity-80" />
                        <p className="font-medium text-sm">Hình ảnh</p>
                        <p className="text-[10px] text-surface-400 mt-1">JPG, PNG</p>
                      </div>

                      <div 
                        onClick={() => setIsSelectingDocument(true)}
                        className="border-2 border-dashed border-surface-200 dark:border-surface-700 hover:border-danger-400 hover:bg-danger-50 dark:hover:bg-danger-500/10 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors text-center h-32"
                      >
                        <FileText className="w-8 h-8 text-danger-500 mb-2 opacity-80" />
                        <p className="font-medium text-sm">Tài liệu đã upload</p>
                        <p className="text-[10px] text-surface-400 mt-1">Chọn từ kho tài liệu PDF</p>
                      </div>

                      <div 
                        onClick={() => toast.error('Tính năng đọc Word sắp ra mắt. Vui lòng xuất ra PDF để sử dụng tạm!')}
                        className="border-2 border-dashed border-surface-200 dark:border-surface-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors text-center h-32"
                      >
                        <FileIcon className="w-8 h-8 text-blue-500 mb-2 opacity-80" />
                        <p className="font-medium text-sm">Tài liệu Word</p>
                        <p className="text-[10px] text-surface-400 mt-1">.doc, .docx</p>
                      </div>

                      <div 
                        onClick={() => toast.error('Tính năng đọc PowerPoint sắp ra mắt. Vui lòng xuất ra PDF để sử dụng tạm!')}
                        className="border-2 border-dashed border-surface-200 dark:border-surface-700 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors text-center h-32"
                      >
                        <Presentation className="w-8 h-8 text-orange-500 mb-2 opacity-80" />
                        <p className="font-medium text-sm">PowerPoint</p>
                        <p className="text-[10px] text-surface-400 mt-1">.ppt, .pptx</p>
                      </div>
                    </div>
                  )
                )}

                {isGenerating && (
                  <div className="py-12 flex flex-col items-center justify-center text-surface-500 gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                    <p>AI đang đọc ảnh và trích xuất kiến thức...</p>
                  </div>
                )}
              </div>

              {/* Kết quả Review */}
              {generatedCards.length > 0 && !isGenerating && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Kết quả trích xuất ({generatedCards.length} thẻ)</h3>
                    <button 
                      onClick={() => setGeneratedCards([])}
                      className="text-sm text-primary-500 hover:underline"
                    >
                      Tải ảnh khác
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {generatedCards.map((card, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800">
                        <p className="font-bold text-sm mb-1 text-primary-600 dark:text-primary-400">Hỏi: {card.question}</p>
                        <p className="text-sm text-surface-700 dark:text-surface-300">Đáp: {card.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-surface-200 dark:border-surface-700 shrink-0 mt-4">
              <button onClick={() => setIsAiModalOpen(false)} className="btn bg-surface-100 hover:bg-surface-200 text-surface-700">
                Đóng
              </button>
              <button 
                onClick={handleSaveAiCards}
                disabled={generatedCards.length === 0}
                className="btn bg-gradient-brand text-white shadow-glow-sm hover:shadow-glow disabled:opacity-50"
              >
                Lưu {generatedCards.length} thẻ vào CSDL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

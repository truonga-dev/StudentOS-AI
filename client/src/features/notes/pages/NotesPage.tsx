import { useState, useRef, useEffect } from 'react'
import { FileText, Plus, Search, Loader2, Trash2, Save, AlertCircle, Sparkles, CheckSquare, ArrowDownToLine, Image as ImageIcon, Smile, Heading1, Heading2, Heading3, Bold, Italic, List, ListOrdered, Quote, Table, Network, ArrowLeft } from 'lucide-react'
import { clsx } from 'clsx'
import { useNotes } from '@/hooks/useNotes'
import { useSubjects } from '@/hooks/useSubjects'
import { useFiles } from '@/hooks/useFiles'
import { useFlashcards } from '@/hooks/useFlashcards'
import { useTasks } from '@/hooks/useTasks'
import { summarizeText, suggestTasks, generateFlashcardsFromText, generateQuiz, generateMindmap } from '@/services/ai'
import { DocumentUploader } from '@/features/files/components/DocumentUploader'
import { MermaidChart } from '@/components/MermaidChart'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import toast from 'react-hot-toast'
import type { CreateNoteInput } from '@/types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const BORDER_COLORS = [
  'border-l-[#6366f1]', 'border-l-[#06b6d4]', 'border-l-[#22c55e]',
  'border-l-[#f59e0b]', 'border-l-[#ef4444]', 'border-l-[#ec4899]',
]

function getBorderColor(color?: string) {
  const map: Record<string, string> = {
    '#6366f1': 'border-l-[#6366f1]',
    '#06b6d4': 'border-l-[#06b6d4]',
    '#22c55e': 'border-l-[#22c55e]',
    '#f59e0b': 'border-l-[#f59e0b]',
    '#ef4444': 'border-l-[#ef4444]',
    '#ec4899': 'border-l-[#ec4899]',
  }
  return color ? (map[color] ?? 'border-l-[#6366f1]') : BORDER_COLORS[0]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const GRADIENTS = [
  'from-blue-500 via-indigo-500 to-purple-500',
  'from-emerald-400 via-teal-500 to-cyan-500',
  'from-orange-400 via-pink-500 to-rose-500',
  'from-violet-500 via-purple-500 to-fuchsia-500',
  'from-cyan-400 via-blue-500 to-indigo-500',
]

const EMOJIS = ['📝', '🧠', '💡', '✨', '📚', '🎯', '🚀', '🔮', '🌿', '🎨']

function getNoteMeta(id: string) {
  let sum = 0
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i)
  return {
    gradient: GRADIENTS[sum % GRADIENTS.length],
    emoji: EMOJIS[sum % EMOJIS.length]
  }
}

function extractHeadings(content: string) {
  if (!content) return []
  const headings = []
  
  // Try Markdown extraction
  const mdRegex = /^(#{1,3})\s+(.+)$/gm
  let match
  while ((match = mdRegex.exec(content)) !== null) {
    headings.push({
      level: match[1].length,
      text: match[2].replace(/[*_~`]/g, '').trim()
    })
  }
  
  // Try HTML extraction
  const htmlRegex = /<h([1-3])[^>]*>(.*?)<\/h\1>/gi
  while ((match = htmlRegex.exec(content)) !== null) {
    headings.push({
      level: parseInt(match[1]),
      text: match[2].replace(/<[^>]+>/g, '').trim()
    })
  }

  return headings
}

export function NotesPage() {
  const { notes, loading, error, addNote, saveNote, removeNote } = useNotes()
  const { subjects } = useSubjects()
  const { addMultipleFlashcards } = useFlashcards()
  const { addTask } = useTasks()
  const isMobile = useMediaQuery('(max-width: 1023px)')
  const [mobileActiveView, setMobileActiveView] = useState<'list' | 'editor'>('list')
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    return sessionStorage.getItem('lastSelectedNoteId')
  })
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newForm, setNewForm] = useState<CreateNoteInput>({ title: '', content: '', subject_id: null })
  const [editContent, setEditContent] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  // AI States
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<{ type: 'summary' | 'tasks' | 'flashcards' | 'quiz' | 'mindmap', content: any } | null>(null)
  
  // Quiz States
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({})
  const [showQuizResult, setShowQuizResult] = useState(false)

  // Files
  const { uploadFile, uploading: filesUploading } = useFiles()

  // Picker States
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [showCoverPicker, setShowCoverPicker] = useState(false)
  const [isTocExpanded, setIsTocExpanded] = useState(false)
  const tocHoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTocEnter = () => {
    if (tocHoverTimeoutRef.current) clearTimeout(tocHoverTimeoutRef.current)
    tocHoverTimeoutRef.current = setTimeout(() => setIsTocExpanded(true), 150)
  }

  const handleTocLeave = () => {
    if (tocHoverTimeoutRef.current) clearTimeout(tocHoverTimeoutRef.current)
    tocHoverTimeoutRef.current = setTimeout(() => setIsTocExpanded(false), 200)
  }

  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    (n.subjects?.title ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const selected = notes.find(n => n.id === selectedId) ?? filtered[0] ?? null

  // Đồng bộ local state khi selected thay đổi
  useEffect(() => {
    if (selected) {
      if (selectedId !== selected.id) setSelectedId(selected.id)
      setEditTitle(selected.title)
      setEditContent(selected.content)
      setAiResult(null)
      setQuizAnswers({})
      setShowQuizResult(false)
      setShowIconPicker(false)
      setShowCoverPicker(false)
      
      // Update the contentEditable div manually to prevent cursor jumping
      if (editorRef.current && editorRef.current.innerHTML !== selected.content) {
        editorRef.current.innerHTML = selected.content || ''
      }

      if (titleRef.current) {
        titleRef.current.style.height = 'auto'
        titleRef.current.style.height = `${titleRef.current.scrollHeight}px`
      }
    } else {
      if (selectedId !== null) setSelectedId(null)
    }
  }, [selected?.id])

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto'
      titleRef.current.style.height = `${titleRef.current.scrollHeight}px`
    }
  }, [editTitle])

  // Lưu selectedId vào sessionStorage để giữ nguyên ghi chú khi reload trang
  useEffect(() => {
    if (selectedId) {
      sessionStorage.setItem('lastSelectedNoteId', selectedId)
    } else {
      sessionStorage.removeItem('lastSelectedNoteId')
    }
  }, [selectedId])

  // Cảnh báo khi người dùng reload trang (F5) mà chưa kịp lưu (trong 1.5s delay)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveTimeoutRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  const handleSelectNote = (id: string) => {
    const note = notes.find(n => n.id === id)
    if (note) {
      setSelectedId(id)
      setEditContent(note.content)
      setEditTitle(note.title)
      setAiResult(null)
      setMobileActiveView('editor')
    }
  }

  // Auto-save sau 1.5s kể từ lần gõ cuối
  const handleContentChange = (value: string) => {
    setEditContent(value)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      if (!selected) return
      setSaving(true)
      // Chỉ truyền content, không truyền title (tránh bị overwrite bởi closure cũ)
      await saveNote(selected.id, { content: value })
      setSaving(false)
    }, 1500)
  }

  const execCmd = (cmd: string, value: string | undefined = undefined) => {
    document.execCommand(cmd, false, value)
    if (editorRef.current) {
      handleContentChange(editorRef.current.innerHTML)
      editorRef.current.focus()
    }
  }

  const insertTable = () => {
    const tableHTML = '<br><table width="100%" border="1" cellspacing="0" cellpadding="5" class="w-full mb-6 border border-surface-200 dark:border-surface-700"><tbody><tr><td class="border border-surface-200 dark:border-surface-700 p-3">Cột 1</td><td class="border border-surface-200 dark:border-surface-700 p-3">Cột 2</td></tr><tr><td class="border border-surface-200 dark:border-surface-700 p-3">Giá trị 1</td><td class="border border-surface-200 dark:border-surface-700 p-3">Giá trị 2</td></tr></tbody></table><br><p></p>'
    execCmd('insertHTML', tableHTML)
  }

  const handleTitleBlur = async () => {
    if (!selected || editTitle === selected.title) return
    await saveNote(selected.id, { title: editTitle })
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newForm.title.trim()) return
    setAdding(true)
    try {
      const created = await addNote(newForm)
      setShowModal(false)
      setNewForm({ title: '', content: '', subject_id: null })
      handleSelectNote(created.id)
    } catch (err) {
      console.error(err)
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa ghi chú này?')) return
    try {
      await removeNote(id)
      if (selectedId === id) {
        setSelectedId(null)
        setAiResult(null)
      }
      toast.success('Đã xóa ghi chú')
    } catch (err: any) {
      toast.error('Lỗi khi xóa ghi chú')
    }
  }

  const handleUpdateMeta = async (field: 'icon' | 'cover_image', value: string | null) => {
    if (!selected) return
    try {
      await saveNote(selected.id, { [field]: value })
      if (field === 'icon') setShowIconPicker(false)
      if (field === 'cover_image') setShowCoverPicker(false)
    } catch (e: any) {
      toast.error('Lỗi khi lưu: ' + e.message)
    }
  }

  // ── AI Handlers ────────────────────────────────────────────────────────────
  const handleAISummarize = async () => {
    if (!selected || !editContent.trim()) {
      return toast.error('Nội dung ghi chú trống!')
    }
    setAiLoading(true)
    try {
      const summary = await summarizeText(editContent)
      setAiResult({ type: 'summary', content: summary })
    } catch (err: any) {
      toast.error(err.message || 'Lỗi gọi AI')
    } finally {
      setAiLoading(false)
    }
  }

  const handleAISuggestTasks = async () => {
    if (!selected || !editContent.trim()) {
      return toast.error('Nội dung ghi chú trống!')
    }
    setAiLoading(true)
    try {
      const tasksStr = await suggestTasks(editContent)
      setAiResult({ type: 'tasks', content: tasksStr })
    } catch (err: any) {
      toast.error(err.message || 'Lỗi gọi AI')
    } finally {
      setAiLoading(false)
    }
  }

  const handleAIGenerateFlashcards = async () => {
    if (!selected || !editContent.trim()) {
      return toast.error('Nội dung ghi chú trống!')
    }
    setAiLoading(true)
    try {
      // clean content
      const text = editContent.replace(/<[^>]*>?/gm, ''); // basic HTML strip
      const cards = await generateFlashcardsFromText(text)
      setAiResult({ type: 'flashcards', content: cards })
    } catch (err: any) {
      toast.error(err.message || 'Lỗi gọi AI')
    } finally {
      setAiLoading(false)
    }
  }

  const handleAIGenerateQuiz = async () => {
    if (!selected || !editContent.trim()) {
      return toast.error('Nội dung ghi chú trống!')
    }
    setAiLoading(true)
    try {
      const text = editContent.replace(/<[^>]*>?/gm, '');
      const quiz = await generateQuiz(text)
      setAiResult({ type: 'quiz', content: quiz })
      setQuizAnswers({})
      setShowQuizResult(false)
    } catch (err: any) {
      toast.error(err.message || 'Lỗi gọi AI')
    } finally {
      setAiLoading(false)
    }
  }

  const handleAIGenerateMindmap = async () => {
    if (!selected || !editContent.trim()) {
      return toast.error('Nội dung ghi chú trống!')
    }
    setAiLoading(true)
    try {
      const text = editContent.replace(/<[^>]*>?/gm, '');
      const map = await generateMindmap(text)
      setAiResult({ type: 'mindmap', content: map })
      toast.success('Đã vẽ sơ đồ tư duy thành công')
    } catch (err: any) {
      toast.error(err.message || 'Lỗi gọi AI')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSaveFlashcards = async () => {
    if (aiResult?.type !== 'flashcards' || !aiResult.content.length || !selected) return
    try {
      await addMultipleFlashcards(
        aiResult.content.map((c: any) => ({
          ...c,
          subject_id: selected.subject_id || null
        }))
      )
      toast.success('Đã lưu flashcards thành công!')
      setAiResult(null)
    } catch (err) {
      toast.error('Lỗi khi lưu flashcards')
    }
  }

  const handleUploadFiles = async (fileList: File[]) => {
    if (!selected) return
    for (const file of fileList) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`File "${file.name}" vượt quá 50MB`)
        continue
      }
      try {
        const uploaded = await uploadFile(file, selected.subject_id)
        
        // Chèn vào Editor
        const isImage = uploaded.mime_type?.startsWith('image/')
        const markdown = isImage 
          ? `<br><img src="${uploaded.file_url}" alt="${uploaded.name}" class="rounded-xl border border-surface-200 dark:border-surface-700 max-h-[400px] object-cover mb-4"/><br>`
          : `<br><a href="${uploaded.file_url}" target="_blank" class="flex items-center gap-2 p-3 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-primary-600 dark:text-primary-400 font-medium w-fit mb-4 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">📎 ${uploaded.name}</a><br>`

        const appendedContent = editContent + markdown
        handleContentChange(appendedContent)
        if (editorRef.current) {
          editorRef.current.innerHTML = appendedContent
        }
        
        toast.success(`Đã đính kèm ${file.name}`)
      } catch (e: any) {
        toast.error(e.message || 'Upload thất bại')
      }
    }
    setShowUploadModal(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-112px)] flex gap-6 animate-slide-up relative">
      {/* Sidebar list */}
      {(!isMobile || mobileActiveView === 'list') && (
        <div className="w-full md:w-80 shrink-0 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title text-xl">Ghi chú</h2>
            <button
              onClick={() => setShowModal(true)}
              className="w-9 h-9 rounded-xl bg-gradient-brand text-white flex items-center justify-center shadow-glow-sm hover:shadow-glow transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input className="input pl-10" placeholder="Tìm ghi chú..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-danger-50 dark:bg-danger-500/10 text-danger-600 dark:text-danger-400 text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
            </div>
          )}

          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {filtered.length === 0 && (
              <div className="text-center py-10 text-surface-400">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Chưa có ghi chú nào</p>
              </div>
            )}
            {filtered.map(note => (
              <div
                key={note.id}
                onClick={() => handleSelectNote(note.id)}
                className={clsx(
                  'p-4 rounded-xl border-l-4 cursor-pointer transition-all duration-150 group relative',
                  getBorderColor(note.subjects?.color),
                  selected?.id === note.id
                    ? 'bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/30'
                    : 'bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600',
                )}
              >
                <h4 className="font-semibold text-sm text-surface-900 dark:text-white mb-1 truncate pr-6">{note.title}</h4>
                <p className="text-xs text-surface-500 dark:text-surface-400 line-clamp-2 mb-2">
                  {note.content
                    ? note.content.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() || 'Chưa có nội dung...'
                    : 'Chưa có nội dung...'}
                </p>
                <div className="flex items-center gap-1 flex-wrap">
                  {note.subjects && <span className="badge-neutral">{note.subjects.title}</span>}
                  <span className="ml-auto text-2xs text-surface-400">{formatDate(note.updated_at)}</span>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(note.id) }}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md hover:bg-danger-50 dark:hover:bg-danger-500/10 flex items-center justify-center text-surface-400 hover:text-danger-500 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editor area (The Notion Canvas) */}
      {(!isMobile || mobileActiveView === 'editor') && (
        <div className="flex-1 bg-white dark:bg-surface-900 rounded-2xl shadow-card border border-surface-200 dark:border-surface-800 flex overflow-hidden relative min-w-0">
        {selected ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col relative w-full scroll-smooth">
            {/* Cover Image */}
            <div className={`h-40 md:h-56 w-full shrink-0 bg-gradient-to-br ${selected.cover_image || getNoteMeta(selected.id).gradient} relative overflow-hidden group`}>
              <div className="absolute inset-0 bg-black/10 dark:bg-black/20" />
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay" />
              
              {/* Cover Hover Button */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-sm z-10">
                <button onClick={() => setShowCoverPicker(!showCoverPicker)} className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center gap-2 backdrop-blur-md font-semibold transition-all">
                  <ImageIcon className="w-4 h-4" /> Đổi ảnh bìa
                </button>
              </div>

              {/* Cover Picker Dropdown */}
              {showCoverPicker && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-surface-800 p-4 rounded-xl shadow-2xl z-50 border border-surface-200 dark:border-surface-700 w-80 animate-slide-up">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-surface-900 dark:text-white">Chọn màu nền</h4>
                    <button onClick={() => setShowCoverPicker(false)} className="text-surface-400 hover:text-surface-600">&times;</button>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {GRADIENTS.map(g => (
                      <button key={g} className={`h-12 rounded-lg bg-gradient-to-br ${g} border-2 ${(selected.cover_image || getNoteMeta(selected.id).gradient) === g ? 'border-primary-500 scale-105' : 'border-transparent hover:scale-105'} transition-all`} onClick={() => handleUpdateMeta('cover_image', g)} />
                    ))}
                  </div>
                  <button onClick={() => handleUpdateMeta('cover_image', null)} className="w-full mt-3 text-xs text-surface-500 hover:text-surface-700 p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">Xóa ảnh bìa (Dùng mặc định)</button>
                </div>
              )}
            </div>

            <div className="flex-1 flex w-full max-w-[1400px] mx-auto relative">
              {/* Main Editor Column */}
              <div className="flex-1 min-w-0 px-8 md:px-16 pb-32 flex flex-col relative pt-12">
                {isMobile && (
                  <button
                    onClick={() => setMobileActiveView('list')}
                    className="flex items-center gap-2 text-surface-500 hover:text-surface-800 dark:hover:text-surface-200 text-sm font-semibold mb-6 px-1 py-2 w-fit rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
                  </button>
                )}
                
                {/* Notion Hover Actions (above title) */}
                <div className="absolute top-4 left-8 md:left-16 flex items-center gap-4 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity z-20">
                  <button onClick={() => handleUpdateMeta('icon', EMOJIS[Math.floor(Math.random() * EMOJIS.length)])} className="flex items-center gap-1.5 text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 text-sm font-medium transition-colors">
                    <Smile className="w-4 h-4" /> Thêm biểu tượng
                  </button>
                  <button onClick={() => handleUpdateMeta('cover_image', GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)])} className="flex items-center gap-1.5 text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 text-sm font-medium transition-colors">
                    <ImageIcon className="w-4 h-4" /> Thêm ảnh bìa
                  </button>
                </div>

                {/* Note Icon */}
                <div className="-mt-24 mb-6 relative z-10 flex flex-col items-start">
                  <div className="group relative">
                    <div className="w-24 h-24 bg-white dark:bg-surface-900 rounded-2xl flex items-center justify-center text-5xl shadow-lg border-4 border-white dark:border-surface-900 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors" onClick={() => setShowIconPicker(!showIconPicker)}>
                      {selected.icon || getNoteMeta(selected.id).emoji}
                      <div className="absolute -top-2 -right-2 bg-surface-800 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                        <Smile className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Icon Picker Dropdown */}
                    {showIconPicker && (
                      <div className="absolute top-28 left-0 bg-white dark:bg-surface-800 p-4 rounded-xl shadow-2xl z-50 border border-surface-200 dark:border-surface-700 w-72 animate-slide-up">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold text-surface-900 dark:text-white">Chọn biểu tượng</h4>
                          <button onClick={() => setShowIconPicker(false)} className="text-surface-400 hover:text-surface-600">&times;</button>
                        </div>
                        <div className="grid grid-cols-5 gap-2 text-2xl">
                          {EMOJIS.map(e => (
                            <button key={e} className={`aspect-square flex items-center justify-center rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 ${(selected.icon || getNoteMeta(selected.id).emoji) === e ? 'bg-primary-50 dark:bg-primary-500/20' : ''}`} onClick={() => handleUpdateMeta('icon', e)}>{e}</button>
                          ))}
                        </div>
                        <button onClick={() => handleUpdateMeta('icon', null)} className="w-full mt-3 text-xs text-surface-500 hover:text-surface-700 p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">Xóa biểu tượng (Dùng mặc định)</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Title */}
                <textarea
                  ref={titleRef}
                  className="text-4xl md:text-5xl font-black text-surface-900 dark:text-white bg-transparent border-none outline-none w-full mb-6 placeholder:text-surface-300 dark:placeholder:text-surface-700 leading-tight resize-none overflow-hidden"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  placeholder="Tiêu đề không có tên"
                  rows={1}
                />

                {/* Meta & AI Toolbar */}
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8 pb-6 border-b border-surface-100 dark:border-surface-800">
                  <div className="flex items-center gap-3 flex-wrap">
                    {selected.subjects && (
                      <span className="badge-primary text-sm px-3 py-1">{selected.subjects.title}</span>
                    )}
                    <span className="text-sm text-surface-400">
                      Cập nhật: {formatDate(selected.updated_at)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 md:ml-auto w-full md:w-auto">
                    {saving && (
                      <div className="flex items-center gap-1.5 text-xs text-surface-400 mr-2">
                        <Save className="w-3.5 h-3.5 animate-pulse" /> Đang lưu...
                      </div>
                    )}
                    <button
                      onClick={handleAISummarize}
                      disabled={aiLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-semibold hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-all disabled:opacity-50"
                    >
                      {aiLoading && aiResult?.type !== 'tasks' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      Tóm tắt
                    </button>
                    <button
                      onClick={handleAISuggestTasks}
                      disabled={aiLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary-200 dark:border-primary-500/30 text-primary-600 dark:text-primary-400 text-xs font-semibold hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-all disabled:opacity-50"
                    >
                      {aiLoading && aiResult?.type === 'tasks' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckSquare className="w-3.5 h-3.5" />}
                      Gợi ý Task
                    </button>
                    <button
                      onClick={handleAIGenerateFlashcards}
                      disabled={aiLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary-200 dark:border-primary-500/30 text-primary-600 dark:text-primary-400 text-xs font-semibold hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-all disabled:opacity-50"
                    >
                      {aiLoading && aiResult?.type === 'flashcards' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      Tạo Flashcard
                    </button>
                    <button
                      onClick={handleAIGenerateQuiz}
                      disabled={aiLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary-200 dark:border-primary-500/30 text-primary-600 dark:text-primary-400 text-xs font-semibold hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-all disabled:opacity-50"
                    >
                      {aiLoading && aiResult?.type === 'quiz' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      Thi thử
                    </button>
                    <button
                      onClick={handleAIGenerateMindmap}
                      disabled={aiLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary-200 dark:border-primary-500/30 text-primary-600 dark:text-primary-400 text-xs font-semibold hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-all disabled:opacity-50"
                    >
                      {aiLoading && aiResult?.type === 'mindmap' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Network className="w-3.5 h-3.5" />}
                      Vẽ sơ đồ
                    </button>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 text-xs font-semibold hover:bg-surface-50 dark:hover:bg-surface-800 transition-all ml-auto"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" />
                      Đính kèm
                    </button>
                  </div>
                </div>

                {/* AI Result Panel */}
                {aiResult && (
                  <div className="mb-8 p-6 rounded-2xl border border-primary-200 dark:border-primary-500/30 bg-primary-50/50 dark:bg-primary-500/5 shadow-inner relative group animate-slide-up flex flex-col max-h-[600px]">
                    <button 
                      onClick={() => setAiResult(null)}
                      className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-white dark:hover:bg-surface-800 flex items-center justify-center text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 shadow-sm transition-all"
                    >
                      &times;
                    </button>
                    
                    <div className="flex items-center gap-2 mb-4 text-primary-600 dark:text-primary-400 font-bold text-base shrink-0 border-b border-primary-100 dark:border-primary-500/20 pb-4">
                      {aiResult.type === 'summary' || aiResult.type === 'flashcards' || aiResult.type === 'quiz' ? <Sparkles className="w-5 h-5" /> : 
                       aiResult.type === 'mindmap' ? <Network className="w-5 h-5" /> : <CheckSquare className="w-5 h-5" />}
                      {aiResult.type === 'summary' ? 'AI Tóm tắt nội dung' : 
                       aiResult.type === 'tasks' ? 'AI Gợi ý Task thực hành' : 
                       aiResult.type === 'mindmap' ? 'AI Vẽ Sơ đồ tư duy' : 
                       aiResult.type === 'quiz' ? 'AI Thi thử' : 'AI Trích xuất Flashcard'}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 mb-4 text-base text-surface-700 dark:text-surface-300 leading-loose space-y-4
                                   [&>ul]:list-disc [&>ul]:pl-6 [&>ul>li]:pl-1
                                   [&>ol]:list-decimal [&>ol]:pl-6 [&>ol>li]:pl-1
                                   [&>h1]:text-xl [&>h1]:font-bold [&>h2]:text-lg [&>h2]:font-bold [&>h3]:font-semibold
                                   [&>pre]:bg-surface-800 [&>pre]:text-surface-100 [&>pre]:p-5 [&>pre]:rounded-2xl [&>pre]:overflow-x-auto [&>pre]:text-sm [&>pre]:font-mono [&>pre]:shadow-inner
                                   [&>blockquote]:border-l-4 [&>blockquote]:border-primary-500 [&>blockquote]:pl-5 [&>blockquote]:italic [&>blockquote]:text-surface-500
                                   [&_img]:max-w-full [&_img]:rounded-xl [&_img]:shadow-sm">
                      {aiResult.type === 'flashcards' ? (
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-surface-500 mb-2">Đã tạo {aiResult.content.length} thẻ. Bạn có thể xem kết quả bên dưới, hãy chuyển qua module Flashcards để tạo và quản lý!</p>
                          {aiResult.content.map((card: any, idx: number) => (
                            <div key={idx} className="p-4 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800">
                              <p className="font-bold text-sm mb-1 text-primary-600 dark:text-primary-400">Hỏi: {card.question}</p>
                              <p className="text-sm text-surface-700 dark:text-surface-300">Đáp: {card.answer}</p>
                            </div>
                          ))}
                        </div>
                      ) : aiResult.type === 'quiz' ? (
                        <div className="space-y-6">
                          <p className="text-sm font-medium text-surface-500 mb-2">Trả lời các câu hỏi sau để kiểm tra kiến thức của bạn:</p>
                          {aiResult.content.map((q: any, qIdx: number) => (
                            <div key={qIdx} className="p-5 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 shadow-sm">
                              <h4 className="font-bold text-lg mb-4 text-surface-900 dark:text-white">Câu {qIdx + 1}: {q.question}</h4>
                              <div className="space-y-2">
                                {q.options.map((opt: string, oIdx: number) => {
                                  const isSelected = quizAnswers[qIdx] === oIdx;
                                  const isCorrect = q.correct_index === oIdx;
                                  
                                  let btnClass = "w-full text-left p-3 rounded-xl border text-sm font-medium transition-all ";
                                  
                                  if (showQuizResult) {
                                    if (isCorrect) {
                                      btnClass += "bg-success-50 border-success-500 text-success-700 dark:bg-success-500/10 dark:text-success-400";
                                    } else if (isSelected && !isCorrect) {
                                      btnClass += "bg-danger-50 border-danger-500 text-danger-700 dark:bg-danger-500/10 dark:text-danger-400";
                                    } else {
                                      btnClass += "bg-surface-50 border-surface-200 text-surface-500 dark:bg-surface-800/50 dark:border-surface-700 opacity-50";
                                    }
                                  } else {
                                    if (isSelected) {
                                      btnClass += "bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400 ring-2 ring-primary-500/20";
                                    } else {
                                      btnClass += "bg-white border-surface-200 hover:border-primary-300 hover:bg-surface-50 dark:bg-surface-800 dark:border-surface-700 dark:hover:border-primary-500/50";
                                    }
                                  }

                                  return (
                                    <button
                                      key={oIdx}
                                      disabled={showQuizResult}
                                      onClick={() => setQuizAnswers(prev => ({...prev, [qIdx]: oIdx}))}
                                      className={btnClass}
                                    >
                                      {String.fromCharCode(65 + oIdx)}. {opt}
                                    </button>
                                  )
                                })}
                              </div>
                              
                              {showQuizResult && (
                                <div className={clsx(
                                  "mt-4 p-4 rounded-xl text-sm",
                                  quizAnswers[qIdx] === q.correct_index 
                                    ? "bg-success-50 text-success-800 dark:bg-success-500/10 dark:text-success-400"
                                    : "bg-danger-50 text-danger-800 dark:bg-danger-500/10 dark:text-danger-400"
                                )}>
                                  <p className="font-bold mb-1">
                                    {quizAnswers[qIdx] === q.correct_index ? "🎉 Chính xác!" : "❌ Sai rồi!"}
                                  </p>
                                  <p>{q.explanation}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : aiResult.type === 'mindmap' ? (
                        <div className="space-y-4">
                          <p className="text-sm font-medium text-surface-500 mb-2">Sơ đồ tư duy được tự động tạo từ ghi chú của bạn:</p>
                          <MermaidChart chart={aiResult.content} />
                        </div>
                      ) : (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {aiResult.content}
                        </ReactMarkdown>
                      )}
                    </div>
                    <div className="flex items-center gap-3 pt-4 mt-auto shrink-0 border-t border-primary-100 dark:border-primary-500/20">
                      {aiResult.type === 'flashcards' ? (
                        <button 
                          onClick={handleSaveFlashcards}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-brand text-white text-sm font-semibold hover:shadow-glow transition-all"
                        >
                          <Sparkles className="w-4 h-4" /> Lưu {aiResult.content.length} Flashcard
                        </button>
                      ) : aiResult.type === 'quiz' ? (
                        !showQuizResult ? (
                          <button 
                            onClick={() => {
                              if (Object.keys(quizAnswers).length < aiResult.content.length) {
                                toast.error('Vui lòng trả lời tất cả các câu hỏi!')
                                return
                              }
                              setShowQuizResult(true)
                              const score = aiResult.content.reduce((acc: number, q: any, idx: number) => acc + (quizAnswers[idx] === q.correct_index ? 1 : 0), 0)
                              toast.success(`Bạn trả lời đúng ${score}/${aiResult.content.length} câu!`)
                            }}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-brand text-white text-sm font-semibold hover:shadow-glow transition-all"
                          >
                            <CheckSquare className="w-4 h-4" /> Nộp bài
                          </button>
                        ) : (
                          <button 
                            onClick={handleAIGenerateQuiz}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 text-sm font-semibold hover:bg-surface-300 dark:hover:bg-surface-600 transition-all"
                          >
                            Làm bài mới
                          </button>
                        )
                      ) : (
                        <div className="flex items-center gap-3">
                          {aiResult.type === 'tasks' && (
                            <button
                              onClick={async () => {
                                const lines = aiResult.content.split('\n')
                                const taskTitles = lines
                                  .filter((l: string) => l.trim().match(/^[*-]\s|^[0-9]+\.\s/))
                                  .map((l: string) => l.replace(/^[*-]\s|^[0-9]+\.\s/, '').replace(/^\[[ x]\]\s/, '').replace(/\*\*/g, '').trim())
                                  .filter(Boolean)
                                
                                if (taskTitles.length === 0) {
                                  toast.error('Không tìm thấy task hợp lệ nào')
                                  return
                                }

                                try {
                                  for (const title of taskTitles) {
                                    await addTask({
                                      title,
                                      subject_id: newForm.subject_id || undefined,
                                      priority: 'medium'
                                    })
                                  }
                                  toast.success(`Đã lưu ${taskTitles.length} task vào Bảng công việc!`)
                                  setAiResult(null)
                                } catch (e) {
                                  toast.error('Lỗi khi lưu task')
                                }
                              }}
                              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-brand text-white text-sm font-semibold hover:shadow-glow transition-all"
                            >
                              <CheckSquare className="w-4 h-4" /> Lưu vào Bảng Tasks
                            </button>
                          )}
                          <button
                            onClick={() => {
                              const prefix = aiResult.type === 'summary' ? '<h3>📝 Tóm tắt AI</h3>' : '<h3>✅ Task thực hành</h3>'
                              
                              const htmlContent = aiResult.content
                                .replace(/^### (.*$)/gim, '<h4>$1</h4>')
                                .replace(/^## (.*$)/gim, '<h3>$1</h3>')
                                .replace(/^# (.*$)/gim, '<h2>$1</h2>')
                                .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
                                .replace(/\*(.*?)\*/gim, '<em>$1</em>')
                                .replace(/\n\n/gim, '</p><p>')
                                .replace(/\n/gim, '<br>')
                              
                              const appendedContent = editContent + (editContent ? '<br><br>' : '') + prefix + '<p>' + htmlContent + '</p>'
                              
                              handleContentChange(appendedContent)
                              if (editorRef.current) {
                                editorRef.current.innerHTML = appendedContent
                              }
                              
                              setAiResult(null)
                              toast.success('Đã thêm vào ghi chú')
                            }}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 shadow-glow transition-all"
                          >
                            <ArrowDownToLine className="w-4 h-4" /> Thêm vào bên dưới
                          </button>
                        </div>
                      )}
                      
                      <button
                        onClick={() => setAiResult(null)}
                        className="px-5 py-2.5 rounded-xl text-surface-600 dark:text-surface-400 text-sm font-medium hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                      >
                        Bỏ qua
                      </button>
                    </div>
                  </div>
                )}

                {/* Editor Toolbar */}
                <div className="flex flex-wrap items-center gap-1 mb-4 p-1.5 bg-surface-50 dark:bg-surface-800/50 rounded-xl border border-surface-200 dark:border-surface-700 w-full animate-slide-up sticky top-4 z-30 backdrop-blur-md">
                  <button onClick={() => execCmd('formatBlock', 'H1')} className="p-2 text-surface-500 hover:text-surface-900 dark:hover:text-white hover:bg-white dark:hover:bg-surface-700 rounded-lg transition-colors" title="Heading 1"><Heading1 className="w-4 h-4" /></button>
                  <button onClick={() => execCmd('formatBlock', 'H2')} className="p-2 text-surface-500 hover:text-surface-900 dark:hover:text-white hover:bg-white dark:hover:bg-surface-700 rounded-lg transition-colors" title="Heading 2"><Heading2 className="w-4 h-4" /></button>
                  <button onClick={() => execCmd('formatBlock', 'H3')} className="p-2 text-surface-500 hover:text-surface-900 dark:hover:text-white hover:bg-white dark:hover:bg-surface-700 rounded-lg transition-colors" title="Heading 3"><Heading3 className="w-4 h-4" /></button>
                  <div className="w-px h-5 bg-surface-300 dark:bg-surface-600 mx-1" />
                  <button onClick={() => execCmd('bold')} className="p-2 text-surface-500 hover:text-surface-900 dark:hover:text-white hover:bg-white dark:hover:bg-surface-700 rounded-lg transition-colors" title="In đậm"><Bold className="w-4 h-4" /></button>
                  <button onClick={() => execCmd('italic')} className="p-2 text-surface-500 hover:text-surface-900 dark:hover:text-white hover:bg-white dark:hover:bg-surface-700 rounded-lg transition-colors" title="In nghiêng"><Italic className="w-4 h-4" /></button>
                  <div className="w-px h-5 bg-surface-300 dark:bg-surface-600 mx-1" />
                  <button onClick={() => execCmd('insertUnorderedList')} className="p-2 text-surface-500 hover:text-surface-900 dark:hover:text-white hover:bg-white dark:hover:bg-surface-700 rounded-lg transition-colors" title="Danh sách chấm"><List className="w-4 h-4" /></button>
                  <button onClick={() => execCmd('insertOrderedList')} className="p-2 text-surface-500 hover:text-surface-900 dark:hover:text-white hover:bg-white dark:hover:bg-surface-700 rounded-lg transition-colors" title="Danh sách số"><ListOrdered className="w-4 h-4" /></button>
                  <button onClick={() => execCmd('formatBlock', 'BLOCKQUOTE')} className="p-2 text-surface-500 hover:text-surface-900 dark:hover:text-white hover:bg-white dark:hover:bg-surface-700 rounded-lg transition-colors" title="Trích dẫn"><Quote className="w-4 h-4" /></button>
                  <button onClick={insertTable} className="p-2 text-surface-500 hover:text-surface-900 dark:hover:text-white hover:bg-white dark:hover:bg-surface-700 rounded-lg transition-colors" title="Chèn bảng"><Table className="w-4 h-4" /></button>
                </div>

                {/* Editor Area (WYSIWYG) */}
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => handleContentChange(e.currentTarget.innerHTML)}
                  className="w-full min-h-[500px] pb-32 focus:outline-none text-surface-800 dark:text-surface-200 text-lg leading-[1.8]
                             empty:before:content-[attr(data-placeholder)] empty:before:text-surface-400 empty:before:pointer-events-none empty:before:block
                             [&>ul]:list-disc [&>ul]:pl-6 [&>ul>li]:pl-1 [&>ul]:mb-4
                             [&>ol]:list-decimal [&>ol]:pl-6 [&>ol>li]:pl-1 [&>ol]:mb-4
                             [&>h1]:text-3xl [&>h1]:font-black [&>h1]:mb-6 [&>h1]:mt-8
                             [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:mb-4 [&>h2]:mt-8
                             [&>h3]:text-xl [&>h3]:font-bold [&>h3]:mb-3 [&>h3]:mt-6
                             [&>p]:mb-4
                             [&>blockquote]:border-l-4 [&>blockquote]:border-primary-500 [&>blockquote]:pl-5 [&>blockquote]:italic [&>blockquote]:text-surface-500 [&>blockquote]:my-4
                             [&_table]:w-full [&_table]:mb-6 [&_table]:border-collapse
                             [&_td]:border [&_td]:border-surface-200 [&_td]:dark:border-surface-700 [&_td]:p-3"
                  data-placeholder="Bắt đầu viết nội dung ở đây..."
                />
              </div>

              {/* Floating Table of Contents (Right Sidebar) */}
              <div className="hidden xl:block w-64 shrink-0 pt-16 pr-8 relative z-30">
                {extractHeadings(editContent).length > 0 && (
                  <div 
                    className={clsx(
                      "sticky top-8 transition-all duration-300 ease-in-out cursor-pointer",
                      isTocExpanded 
                        ? "w-full bg-surface-50/90 dark:bg-surface-800/90 backdrop-blur-xl border border-surface-200/50 dark:border-surface-700/50 p-4 rounded-2xl shadow-sm" 
                        : "w-8 right-0 ml-auto flex flex-col items-center py-4 gap-2 opacity-40 hover:opacity-100 bg-surface-50/50 dark:bg-surface-800/50 backdrop-blur-sm rounded-full"
                    )}
                    onMouseEnter={handleTocEnter}
                    onMouseLeave={handleTocLeave}
                    onClick={() => setIsTocExpanded(true)}
                  >
                    {isTocExpanded ? (
                      <>
                        <h4 className="text-xs font-extrabold text-surface-400 dark:text-surface-500 uppercase tracking-widest mb-4">Mục lục</h4>
                        <ul className="space-y-3 text-sm max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                          {extractHeadings(editContent).map((h, i) => (
                            <li 
                              key={i} 
                              className="text-surface-600 dark:text-surface-400 hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer truncate transition-colors leading-relaxed" 
                              style={{ paddingLeft: `${(h.level - 1) * 16}px` }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (editorRef.current) {
                                  editorRef.current.focus()
                                }
                              }}
                            >
                              {h.text}
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <>
                        {extractHeadings(editContent).map((h, i) => (
                          <div 
                            key={i}
                            className={clsx(
                              "h-0.5 rounded-full bg-surface-400 dark:bg-surface-500 transition-all",
                              h.level === 1 ? "w-6" : h.level === 2 ? "w-4" : "w-2"
                            )}
                          />
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-surface-400 gap-3">
            <FileText className="w-16 h-16 opacity-20" />
            <p className="font-medium">Chọn ghi chú để xem</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-all"
            >
              <Plus className="w-4 h-4" />Tạo ghi chú mới
            </button>
          </div>
        )}
      </div>
      )}

      {/* Add Note Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white dark:bg-surface-900 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-5">Tạo ghi chú mới</h3>
            <form onSubmit={handleAddNote} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Tiêu đề *</label>
                <input
                  className="input"
                  placeholder="Ví dụ: React Hooks"
                  value={newForm.title}
                  onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))}
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Môn học</label>
                <select
                  className="input"
                  value={newForm.subject_id ?? ''}
                  onChange={e => setNewForm(f => ({ ...f, subject_id: e.target.value || null }))}
                >
                  <option value="">Không thuộc môn nào</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {adding && <Loader2 className="w-4 h-4 animate-spin" />}
                  {adding ? 'Đang tạo...' : 'Tạo ghi chú'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload File Modal */}
      {showUploadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => !filesUploading && setShowUploadModal(false)}
        >
          <div
            className="bg-white dark:bg-surface-900 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-surface-900 dark:text-white">Đính kèm tài liệu</h3>
              <button 
                onClick={() => !filesUploading && setShowUploadModal(false)}
                className="text-surface-400 hover:text-surface-600"
              >
                &times;
              </button>
            </div>
            
            <DocumentUploader onFiles={handleUploadFiles} uploading={filesUploading} />
          </div>
        </div>
      )}
    </div>
  )
}

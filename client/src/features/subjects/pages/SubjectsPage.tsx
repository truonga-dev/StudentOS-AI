import { useState } from 'react'
import { BookOpen, Plus, Search, MoreHorizontal, Loader2, Trash2, AlertCircle, Globe, Copy, Edit2 } from 'lucide-react'
import { clsx } from 'clsx'
import { useSubjects } from '@/hooks/useSubjects'
import toast from 'react-hot-toast'
import type { CreateSubjectInput, Subject } from '@/types'

// Bảng màu cho subject cards
const COLOR_OPTIONS = [
  { label: 'Tím', value: '#6366f1' },
  { label: 'Xanh', value: '#06b6d4' },
  { label: 'Xanh lá', value: '#22c55e' },
  { label: 'Cam', value: '#f59e0b' },
  { label: 'Đỏ', value: '#ef4444' },
  { label: 'Hồng', value: '#ec4899' },
]

export function SubjectsPage() {
  const { subjects, loading, error, addSubject, removeSubject, editSubject } = useSubjects()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<CreateSubjectInput>({
    title: '', color: '#6366f1', credits: 3, semester: '1',
  })
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const filtered = subjects.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setAdding(true)
    try {
      await addSubject(form)
      setShowModal(false)
      setForm({ title: '', color: '#6366f1', credits: 3, semester: '1' })
    } catch (err) {
      console.error(err)
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa môn học này? Các task và ghi chú liên quan sẽ bị tách rời.')) return
    await removeSubject(id)
    setOpenMenuId(null)
  }

  const handleShare = async (subject: Subject) => {
    try {
      if (!subject.is_public) {
        await editSubject(subject.id, { is_public: true })
        toast.success('Đã bật chia sẻ môn học!')
      }
      
      const shareUrl = `${window.location.origin}/shared/subject/${subject.id}`
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Đã copy link chia sẻ!')
    } catch (err: any) {
      toast.error('Lỗi khi chia sẻ môn học')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="section-title text-xl">Môn học của tôi</h2>
          <p className="section-subtitle mt-0.5">
            {filtered.length} môn học
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-brand text-white text-sm font-semibold shadow-glow-sm hover:shadow-glow hover:opacity-90 transition-all duration-150"
        >
          <Plus className="w-4 h-4" />Thêm môn học
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-danger-50 dark:bg-danger-500/10 border border-danger-200 dark:border-danger-500/30 text-danger-600 dark:text-danger-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input
          className="input pl-10"
          placeholder="Tìm môn học..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 mt-8 rounded-3xl border border-dashed border-surface-200 dark:border-surface-700/50 bg-surface-50/50 dark:bg-surface-800/20">
          <BookOpen className="w-16 h-16 text-surface-300 dark:text-surface-600 mb-4" strokeWidth={1} />
          <h3 className="text-xl font-semibold text-surface-900 dark:text-white mb-2">Chưa có môn học nào</h3>
          <p className="text-surface-500 text-center max-w-sm mb-6">Bạn chưa có môn học nào, hoặc không tìm thấy kết quả phù hợp. Hãy tạo môn học mới để bắt đầu lưu trữ nhé!</p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-brand text-white font-medium hover:shadow-glow transition-all"
          >
            <Plus className="w-5 h-5" /> Thêm Môn Học
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
          <div key={s.id} className="card-hover p-5 cursor-pointer group relative">
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: s.color }}
              >
                <BookOpen className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === s.id ? null : s.id) }}
                  className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center justify-center transition-all"
                >
                  <MoreHorizontal className="w-4 h-4 text-surface-400" />
                </button>
                {openMenuId === s.id && (
                  <div className="absolute right-0 top-9 z-10 w-48 bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 shadow-lg overflow-hidden">
                    <button
                      onClick={() => handleShare(s)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
                    >
                      {s.is_public ? <Copy className="w-3.5 h-3.5 text-blue-500" /> : <Globe className="w-3.5 h-3.5" />}
                      {s.is_public ? 'Copy link chia sẻ' : 'Bật chia sẻ'}
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />Xóa môn học
                    </button>
                  </div>
                )}
              </div>
            </div>
            <h3 className="font-semibold text-surface-900 dark:text-white text-sm mb-1 line-clamp-2">
              {s.title}
            </h3>
            <p className="text-xs text-surface-500 mb-3">
              HK{s.semester} · {s.credits} tín chỉ
            </p>
            <div className="flex gap-2">
              <span className="badge-neutral">HK {s.semester}</span>
              <span className="badge-neutral">{s.credits} TC</span>
            </div>
          </div>
        ))}

        {/* Add new card */}
        <button
          onClick={() => setShowModal(true)}
          className="card border-2 border-dashed border-surface-300 dark:border-surface-600 p-5
                     hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-500/5
                     transition-all duration-200 flex flex-col items-center justify-center gap-3 min-h-[180px] group"
        >
          <div className="w-10 h-10 rounded-xl bg-surface-100 dark:bg-surface-800 group-hover:bg-primary-100 dark:group-hover:bg-primary-500/20 flex items-center justify-center transition-colors">
            <Plus className="w-5 h-5 text-surface-400 group-hover:text-primary-500 transition-colors" />
          </div>
          <span className="text-sm font-medium text-surface-500 group-hover:text-primary-500 transition-colors">Thêm môn học</span>
        </button>
      </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white dark:bg-surface-900 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-5">Thêm môn học mới</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Tên môn học *</label>
                <input
                  className="input"
                  placeholder="Ví dụ: Lập trình Web"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                  autoFocus
                />
              </div>

              {/* Credits + Semester */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Số tín chỉ</label>
                  <input
                    type="number" min={1} max={10}
                    className="input"
                    value={form.credits}
                    onChange={e => setForm(f => ({ ...f, credits: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Học kỳ</label>
                  <select
                    className="input"
                    value={form.semester}
                    onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}
                  >
                    {['1','2','3','4','5','6','7','8'].map(s => (
                      <option key={s} value={s}>HK {s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Color */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Màu sắc</label>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, color: c.value }))}
                      className={clsx(
                        'w-8 h-8 rounded-lg transition-all duration-150',
                        form.color === c.value && 'ring-2 ring-offset-2 ring-surface-900 dark:ring-white scale-110'
                      )}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
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
                  {adding ? 'Đang thêm...' : 'Thêm môn học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

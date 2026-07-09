import { useState } from 'react'
import { Plus, CheckSquare, Square, Search, Filter, Loader2, AlertCircle, Trash2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { clsx } from 'clsx'
import { useTasks } from '@/hooks/useTasks'
import { useSubjects } from '@/hooks/useSubjects'
import { breakdownTask } from '@/services/ai'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { CreateTaskInput } from '@/types'

const STATUSES = ['Tất cả', 'Đang làm', 'Hoàn thành'] as const

const priorityConfig = {
  high:   { label: 'Khẩn',        cls: 'badge-danger'  },
  medium: { label: 'Bình thường', cls: 'badge-warning' },
  low:    { label: 'Thấp',        cls: 'badge-success' },
}

function formatDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function TasksPage() {
  const { tasks, loading, error, completed, total, addTask, toggle, removeTask, editTask } = useTasks()
  const { subjects } = useSubjects()
  const [activeStatus, setActiveStatus] = useState<typeof STATUSES[number]>('Tất cả')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<CreateTaskInput>({
    title: '', priority: 'medium', subject_id: null, due_date: null,
  })
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState<string | null>(null)

  const filtered = tasks.filter(t => {
    const matchStatus =
      activeStatus === 'Tất cả' ||
      (activeStatus === 'Hoàn thành' && t.completed) ||
      (activeStatus === 'Đang làm' && !t.completed)
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setAdding(true)
    try {
      await addTask(form)
      setShowModal(false)
      setForm({ title: '', priority: 'medium', subject_id: null, due_date: null })
    } catch (err) {
      console.error(err)
    } finally {
      setAdding(false)
    }
  }

  const handleAIBreakdown = async (task: any, e: React.MouseEvent) => {
    e.stopPropagation()
    if (aiLoading === task.id) return
    setAiLoading(task.id)
    try {
      const subtasks = await breakdownTask(task.title)
      const newDescription = task.description ? `${task.description}\n\n### AI Phân tích:\n${subtasks}` : `### AI Phân tích:\n${subtasks}`
      await editTask(task.id, { description: newDescription })
      setExpandedTask(task.id) // open to see
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Lỗi gọi AI')
    } finally {
      setAiLoading(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="section-title text-xl">Công việc</h2>
          <p className="section-subtitle mt-0.5">{completed}/{total} hoàn thành</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-brand text-white text-sm font-semibold shadow-glow-sm hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" />Thêm công việc
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-danger-50 dark:bg-danger-500/10 border border-danger-200 dark:border-danger-500/30 text-danger-600 dark:text-danger-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Filter + Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex bg-surface-100 dark:bg-surface-800 p-1 rounded-xl gap-1">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setActiveStatus(s)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
                activeStatus === s
                  ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-sm'
                  : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300',
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            className="input pl-9 w-48"
            placeholder="Tìm kiếm..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 text-sm text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
          <Filter className="w-3.5 h-3.5" />Lọc
        </button>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && !loading && (
        <div className="text-center py-16 text-surface-400">
          <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Chưa có công việc nào</p>
          <p className="text-sm mt-1">Nhấn "Thêm công việc" để bắt đầu!</p>
        </div>
      )}

      {/* Task list */}
      <div className="space-y-2">
        {filtered.map(task => {
          const done = task.completed
          const subjectName = task.subjects?.title
          const isExpanded = expandedTask === task.id
          
          return (
            <div key={task.id} className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 hover:shadow-card-hover transition-all duration-200 overflow-hidden group">
              <div
                className={clsx(
                  'p-4 flex items-center gap-4 cursor-pointer',
                  done && 'opacity-60'
                )}
                onClick={() => setExpandedTask(isExpanded ? null : task.id)}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); toggle(task.id); }}
                  className="shrink-0 text-surface-400 hover:text-primary-500 transition-colors"
                >
                  {done
                    ? <CheckSquare className="w-5 h-5 text-success-500" />
                    : <Square className="w-5 h-5" />
                  }
                </button>

                <div className="flex-1 min-w-0">
                  <p className={clsx('text-sm font-medium text-surface-800 dark:text-surface-200', done && 'line-through text-surface-400')}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {subjectName && <span className="badge-neutral text-2xs">{subjectName}</span>}
                    {task.due_date && (
                      <span className="text-xs text-surface-400">{formatDate(task.due_date)}</span>
                    )}
                  </div>
                </div>

                <span className={clsx('badge shrink-0', priorityConfig[task.priority].cls)}>
                  {priorityConfig[task.priority].label}
                </span>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => handleAIBreakdown(task, e)}
                    disabled={aiLoading === task.id}
                    className="opacity-0 group-hover:opacity-100 px-2 py-1.5 rounded-lg border border-primary-200 dark:border-primary-500/30 text-primary-600 dark:text-primary-400 text-xs font-semibold hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-all disabled:opacity-50 flex items-center gap-1"
                  >
                    {aiLoading === task.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">Phân tích</span>
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); removeTask(task.id); }}
                    className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-500/10 flex items-center justify-center text-surface-400 hover:text-danger-500 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  
                  <div className="w-8 h-8 flex items-center justify-center text-surface-400">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>
              
              {/* Expanded Area */}
              {isExpanded && (
                <div className="px-14 pb-4 pt-1">
                  <div className="p-3 bg-surface-50 dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 text-sm text-surface-700 dark:text-surface-300">
                    {task.description ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none 
                                   [&>ul]:list-disc [&>ul]:pl-4 [&>ul>li]:pl-1
                                   [&>ol]:list-decimal [&>ol]:pl-4 [&>ol>li]:pl-1
                                   [&>h3]:text-base [&>h3]:font-bold [&>h3]:mb-2 [&>h3]:mt-3 first:[&>h3]:mt-0">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {task.description}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <span className="italic text-surface-400">Không có mô tả</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

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
            <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-5">Thêm công việc mới</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Tên công việc *</label>
                <input
                  className="input"
                  placeholder="Ví dụ: Nộp bài tập lớn"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Mức độ ưu tiên</label>
                  <select
                    className="input"
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value as 'low' | 'medium' | 'high' }))}
                  >
                    <option value="high">Khẩn</option>
                    <option value="medium">Bình thường</option>
                    <option value="low">Thấp</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Deadline</label>
                  <input
                    type="datetime-local"
                    className="input"
                    onChange={e => setForm(f => ({ ...f, due_date: e.target.value || null }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Môn học</label>
                <select
                  className="input"
                  value={form.subject_id ?? ''}
                  onChange={e => setForm(f => ({ ...f, subject_id: e.target.value || null }))}
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
                  {adding ? 'Đang thêm...' : 'Thêm công việc'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

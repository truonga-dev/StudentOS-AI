import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  BookOpen, CheckSquare, FileText, Layers, Paperclip, Search, Trash2, Eye, ExternalLink,
} from 'lucide-react'
import { adminApi, type ContentType, type ContentItem } from '../services/adminApi'
import {
  Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, Modal, PageHeader, Spinner, fmtDate, fmtNum, inputCls, td, th,
} from '../components/ui'

const CONTENT_TABS = [
  { key: 'subjects' as ContentType, label: 'Môn học', icon: BookOpen },
  { key: 'tasks' as ContentType, label: 'Nhiệm vụ (Tasks)', icon: CheckSquare },
  { key: 'notes' as ContentType, label: 'Ghi chú (Notes)', icon: FileText },
  { key: 'flashcards' as ContentType, label: 'Flashcards', icon: Layers },
  { key: 'files' as ContentType, label: 'Tệp đính kèm (Files)', icon: Paperclip },
]

export function AdminContentPage() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<ContentType>('subjects')
  const [search, setSearch] = useState('')
  const [delItem, setDelItem] = useState<ContentItem | null>(null)
  const [viewItem, setViewItem] = useState<ContentItem | null>(null)

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin', 'content', activeTab, search],
    queryFn: () => adminApi.content(activeTab, { search: search.trim() || undefined }),
  })

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'content', activeTab] })

  const delMut = useMutation({
    mutationFn: (item: ContentItem) => adminApi.deleteContent(activeTab, item.id),
    onSuccess: () => {
      toast.success('Đã xóa nội dung thành công')
      setDelItem(null)
      refresh()
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const getItemTitle = (item: ContentItem) => {
    if (activeTab === 'flashcards') return (item.question as string) || 'Không có câu hỏi'
    if (activeTab === 'files') return (item.name as string) || 'Tệp không tên'
    return (item.title as string) || (item.name as string) || 'Không có tiêu đề'
  }

  return (
    <>
      <PageHeader
        title="Quản lý nội dung học tập"
        subtitle="Giám sát và kiểm duyệt toàn bộ dữ liệu học tập của học viên trên hệ thống."
      />

      <div className="flex flex-wrap gap-1.5 mb-5 p-1 rounded-2xl bg-white/[0.03] border border-white/5 w-fit">
        {CONTENT_TABS.map(t => {
          const Icon = t.icon
          const active = activeTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key); setSearch('') }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition ${
                active
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-950/40'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-b border-white/[0.04]">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              className={`${inputCls} pl-9`}
              placeholder={`Tìm kiếm ${CONTENT_TABS.find(t => t.key === activeTab)?.label.toLowerCase()}…`}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="text-xs text-zinc-500 self-start sm:self-auto">
            Tổng: <span className="font-semibold text-white">{fmtNum(items.length)}</span> bản ghi
          </div>
        </div>

        {isLoading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState
            title="Không có dữ liệu phù hợp"
            hint="Chưa có nội dung nào được tạo hoặc không tìm thấy kết quả tìm kiếm."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/[0.04]">
                <tr>
                  <th className={th}>Nội dung</th>
                  <th className={th}>Tác giả / Sở hữu</th>
                  <th className={th}>Chi tiết</th>
                  <th className={th}>Ngày tạo</th>
                  <th className={`${th} text-right`}>Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className={td}>
                      <div className="max-w-[320px]">
                        <p className="text-white font-medium truncate">{getItemTitle(item)}</p>
                        {activeTab === 'flashcards' && Boolean(item.answer) && (
                          <p className="text-xs text-zinc-500 truncate mt-0.5">Đ/A: {String(item.answer)}</p>
                        )}
                        {activeTab === 'tasks' && (
                          <p className="text-xs text-zinc-500 truncate mt-0.5">
                            Hạn: {item.due_date ? fmtDate(item.due_date as string) : 'Không có'}
                          </p>
                        )}
                        {activeTab === 'files' && Boolean(item.size_bytes) && (
                          <p className="text-xs text-zinc-500 truncate mt-0.5">
                            Dung lượng: {Math.round((Number(item.size_bytes) / 1024 / 1024) * 100) / 100} MB
                          </p>
                        )}
                      </div>
                    </td>
                    <td className={td}>
                      <div className="flex items-center gap-2">
                        <Avatar
                          src={item.owner?.avatar_url}
                          name={item.owner?.full_name || item.owner?.email}
                          size={28}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-white truncate max-w-[180px]">
                            {item.owner?.full_name || '—'}
                          </p>
                          <p className="text-[11px] text-zinc-500 truncate max-w-[180px]">
                            {item.owner?.email || String(item.user_id).slice(0, 8)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className={td}>
                      {activeTab === 'tasks' && (
                        item.completed ? <Badge tone="green">Đã xong</Badge> : <Badge tone="amber">Chưa xong</Badge>
                      )}
                      {activeTab === 'subjects' && (
                        <div className="flex items-center gap-1.5">
                          {Boolean(item.color) && (
                            <span className="w-3 h-3 rounded-full border border-white/20" style={{ background: String(item.color) }} />
                          )}
                          <span className="text-xs text-zinc-400">{item.code ? String(item.code) : '—'}</span>
                        </div>
                      )}
                      {activeTab === 'flashcards' && (
                        item.is_memorized ? <Badge tone="green">Thuộc</Badge> : <Badge tone="gray">Đang học</Badge>
                      )}
                      {activeTab === 'files' && Boolean(item.file_url) && (
                        <a
                          href={String(item.file_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200"
                        >
                          Mở file <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {activeTab === 'notes' && (
                        <span className="text-xs text-zinc-500">
                          {String(item.content || '').length} ký tự
                        </span>
                      )}
                    </td>
                    <td className={td}>{fmtDate(item.created_at)}</td>
                    <td className={`${td} text-right`}>
                      <div className="inline-flex gap-1">
                        <button
                          title="Xem chi tiết"
                          onClick={() => setViewItem(item)}
                          className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          title="Xóa nội dung"
                          onClick={() => setDelItem(item)}
                          className="p-2 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* View Item Modal */}
      <Modal
        open={Boolean(viewItem)}
        onClose={() => setViewItem(null)}
        title={`Chi tiết: ${CONTENT_TABS.find(t => t.key === activeTab)?.label}`}
        width="max-w-2xl"
      >
        {viewItem && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Tiêu đề / Tên</p>
              <p className="text-base font-medium text-white mt-1">{getItemTitle(viewItem)}</p>
            </div>

            {viewItem.owner && (
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 flex items-center gap-3">
                <Avatar src={viewItem.owner.avatar_url} name={viewItem.owner.full_name || viewItem.owner.email} size={36} />
                <div>
                  <p className="text-sm font-medium text-white">{viewItem.owner.full_name || 'Học viên'}</p>
                  <p className="text-xs text-zinc-500">{viewItem.owner.email}</p>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">Dữ liệu thô (JSON)</p>
              <pre className="rounded-xl border border-white/5 bg-black/40 p-3 text-xs text-zinc-300 font-mono overflow-x-auto max-h-64">
                {JSON.stringify(viewItem, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setViewItem(null)}>Đóng</Button>
              <Button variant="danger" onClick={() => { const it = viewItem; setViewItem(null); setDelItem(it) }}>
                <Trash2 className="w-4 h-4" /> Xóa bản ghi
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        open={Boolean(delItem)}
        onClose={() => setDelItem(null)}
        loading={delMut.isPending}
        title="Xác nhận xóa nội dung?"
        message={
          <>
            Bạn có chắc muốn xóa bản ghi <b className="text-white">{delItem ? getItemTitle(delItem) : ''}</b>?
            Thao tác này sẽ xóa vĩnh viễn dữ liệu khỏi hệ thống.
          </>
        }
        confirmText="Xác nhận xóa"
        onConfirm={() => delItem && delMut.mutate(delItem)}
      />
    </>
  )
}

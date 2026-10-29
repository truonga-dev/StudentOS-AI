import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Megaphone, Send, Info, CheckCircle, AlertTriangle, AlertCircle, History, ExternalLink,
} from 'lucide-react'
import { adminApi, type Broadcast } from '../services/adminApi'
import {
  Badge, Button, Card, EmptyState, PageHeader, Spinner, fmtDate, fmtNum, inputCls, td, th,
} from '../components/ui'

const TYPE_CONFIG = {
  info: { label: 'Thông tin (Info)', icon: Info, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
  success: { label: 'Thành công (Success)', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  warning: { label: 'Cảnh báo (Warning)', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  error: { label: 'Khẩn cấp / Lỗi (Error)', icon: AlertCircle, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
}

export function AdminBroadcastPage() {
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState<'info' | 'success' | 'warning' | 'error'>('info')
  const [link, setLink] = useState('')
  const [target, setTarget] = useState<'all' | 'users' | 'admins'>('all')

  const { data: broadcasts = [], isLoading } = useQuery({
    queryKey: ['admin', 'broadcasts'],
    queryFn: adminApi.broadcasts,
  })

  const sendMut = useMutation({
    mutationFn: () => adminApi.broadcast({
      title: title.trim(),
      message: message.trim(),
      type,
      link: link.trim() || undefined,
      target,
    }),
    onSuccess: res => {
      toast.success(`Đã gửi thông báo thành công tới ${fmtNum(res.sent_count)} người dùng!`)
      setTitle('')
      setMessage('')
      setLink('')
      qc.invalidateQueries({ queryKey: ['admin', 'broadcasts'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const CurrIcon = TYPE_CONFIG[type].icon

  return (
    <>
      <PageHeader
        title="Thông báo hệ thống (System Broadcast)"
        subtitle="Phát thông báo đẩy tức thì tới hộp thư của toàn bộ học viên hoặc nhóm người dùng."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Left: Compose Form */}
        <div className="lg:col-span-7">
          <Card title="Soạn thông báo mới">
            <form
              onSubmit={e => {
                e.preventDefault()
                if (!title.trim() || !message.trim()) {
                  toast.error('Vui lòng điền tiêu đề và nội dung')
                  return
                }
                sendMut.mutate()
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Đối tượng nhận thông báo
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'all', label: 'Tất cả học viên' },
                    { id: 'users', label: 'Chỉ học viên thường' },
                    { id: 'admins', label: 'Chỉ ban quản trị' },
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTarget(t.id as typeof target)}
                      className={`py-2 px-3 rounded-xl text-xs font-medium border transition ${
                        target === t.id
                          ? 'border-violet-500 bg-violet-500/15 text-white'
                          : 'border-white/5 bg-white/[0.02] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Mức độ / Loại thông báo</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(TYPE_CONFIG) as (keyof typeof TYPE_CONFIG)[]).map(k => {
                    const cfg = TYPE_CONFIG[k]
                    const Icon = cfg.icon
                    const selected = type === k
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setType(k)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition ${
                          selected
                            ? `${cfg.bg} text-white`
                            : 'border-white/5 bg-white/[0.02] text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                        <span>{cfg.label.split(' ')[0]}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="broadcast-title" className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Tiêu đề thông báo *
                </label>
                <input
                  id="broadcast-title"
                  className={inputCls}
                  placeholder="Vd: Bảo trì hệ thống định kỳ / Tính năng mới…"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={120}
                  required
                />
              </div>

              <div>
                <label htmlFor="broadcast-msg" className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Nội dung chi tiết *
                </label>
                <textarea
                  id="broadcast-msg"
                  rows={4}
                  className={inputCls}
                  placeholder="Nhập nội dung thông báo gửi tới người dùng…"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="broadcast-link" className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Liên kết đính kèm (tùy chọn)
                </label>
                <input
                  id="broadcast-link"
                  className={inputCls}
                  placeholder="https://… hoặc /community hoặc /focus"
                  value={link}
                  onChange={e => setLink(e.target.value)}
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button loading={sendMut.isPending} disabled={!title.trim() || !message.trim()}>
                  <Send className="w-4 h-4" />
                  Phát thông báo ngay
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right: Live Preview */}
        <div className="lg:col-span-5">
          <Card title="Xem trước giao diện người dùng">
            <p className="text-xs text-zinc-500 mb-4">
              Đây là hình thức thông báo sẽ hiển thị trong dropdown chuông thông báo của học viên:
            </p>

            <div className={`rounded-2xl border p-4 ${TYPE_CONFIG[type].bg} backdrop-blur-md`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl bg-black/40 ring-1 ring-white/10 ${TYPE_CONFIG[type].color}`}>
                  <CurrIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white truncate">
                      {title.trim() || 'Tiêu đề thông báo mẫu'}
                    </p>
                    <span className="text-[10px] text-zinc-400 shrink-0">Vừa xong</span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-1 whitespace-pre-line leading-relaxed">
                    {message.trim() || 'Nội dung thông báo mẫu sẽ xuất hiện tại đây khi bạn nhập vào biểu mẫu.'}
                  </p>
                  {link.trim() && (
                    <div className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium text-violet-300 hover:underline">
                      Xem chi tiết <ExternalLink className="w-3 h-3" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-white/[0.02] border border-white/5 p-3 text-xs text-zinc-400 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-violet-400 shrink-0" />
              <span>
                Mỗi lượt phát sẽ tạo một bản ghi thông báo trong cơ sở dữ liệu và lưu vào lịch sử phát sóng.
              </span>
            </div>
          </Card>
        </div>
      </div>

      {/* Broadcast History */}
      <Card title="Lịch sử thông báo đã phát">
        {isLoading ? (
          <Spinner />
        ) : broadcasts.length === 0 ? (
          <EmptyState
            title="Chưa có thông báo nào được phát"
            hint="Các thông báo bạn gửi sẽ được lưu lại lịch sử tại đây."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/[0.04]">
                <tr>
                  <th className={th}>Tiêu đề & Nội dung</th>
                  <th className={th}>Loại</th>
                  <th className={th}>Đối tượng</th>
                  <th className={th}>Số lượng gửi</th>
                  <th className={th}>Thời gian phát</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {broadcasts.map((b: Broadcast) => (
                  <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className={td}>
                      <div className="max-w-[360px]">
                        <p className="text-white font-medium truncate">{b.title}</p>
                        <p className="text-xs text-zinc-500 truncate mt-0.5">{b.message}</p>
                      </div>
                    </td>
                    <td className={td}>
                      <Badge
                        tone={
                          b.type === 'error'
                            ? 'red'
                            : b.type === 'warning'
                            ? 'amber'
                            : b.type === 'success'
                            ? 'green'
                            : 'blue'
                        }
                      >
                        {b.type}
                      </Badge>
                    </td>
                    <td className={td}>
                      <span className="text-xs text-zinc-300 font-medium capitalize">
                        {b.target === 'all' ? 'Tất cả' : b.target === 'admins' ? 'Admin' : 'Học viên'}
                      </span>
                    </td>
                    <td className={td}>
                      <span className="font-semibold text-white">{fmtNum(b.sent_count)}</span> người nhận
                    </td>
                    <td className={td}>{fmtDate(b.created_at, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}

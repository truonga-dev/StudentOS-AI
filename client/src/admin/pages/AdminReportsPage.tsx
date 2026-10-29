import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CheckCircle2, XCircle, Trash2, MessageSquareX, Ban, RotateCcw } from 'lucide-react'
import { adminApi } from '../services/adminApi'
import type { Report } from '@/types'
import { Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, PageHeader, Spinner, fmtDate } from '../components/ui'

const TABS = [
  { key: 'pending', label: 'Chờ xử lý' },
  { key: 'resolved', label: 'Đã xử lý' },
  { key: 'dismissed', label: 'Đã bỏ qua' },
  { key: 'all', label: 'Tất cả' },
] as const

const statusBadge = (s: Report['status']) =>
  s === 'pending' ? <Badge tone="amber">Chờ xử lý</Badge> : s === 'resolved' ? <Badge tone="green">Đã xử lý</Badge> : <Badge>Đã bỏ qua</Badge>

export function AdminReportsPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('pending')
  const [delId, setDelId] = useState<string | null>(null)
  const [opts, setOpts] = useState<Record<string, { del: boolean; ban: boolean }>>({})

  const { data: reports = [], isLoading } = useQuery({ queryKey: ['admin', 'reports', tab], queryFn: () => adminApi.reports(tab) })

  const refresh = () => { qc.invalidateQueries({ queryKey: ['admin', 'reports'] }); qc.invalidateQueries({ queryKey: ['admin', 'stats'] }) }

  const resolve = useMutation({
    mutationFn: (p: { id: string; status: Report['status']; delete_message?: boolean; ban_reported_user?: boolean }) =>
      adminApi.resolveReport(p.id, p),
    onSuccess: () => { toast.success('Đã cập nhật báo cáo'); refresh() },
    onError: (e: Error) => toast.error(e.message),
  })
  const del = useMutation({
    mutationFn: (id: string) => adminApi.deleteReport(id),
    onSuccess: () => { toast.success('Đã xóa báo cáo'); setDelId(null); refresh() },
    onError: (e: Error) => toast.error(e.message),
  })

  const o = (id: string) => opts[id] ?? { del: false, ban: false }
  const setO = (id: string, patch: Partial<{ del: boolean; ban: boolean }>) => setOpts(s => ({ ...s, [id]: { ...o(id), ...patch } }))

  return (
    <>
      <PageHeader title="Báo cáo vi phạm" subtitle="Kiểm duyệt nội dung bị người dùng báo cáo trong cộng đồng." />

      <div className="flex gap-1 mb-4 p-1 rounded-xl bg-white/[0.03] w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3.5 py-1.5 rounded-lg text-sm transition ${tab === t.key ? 'bg-violet-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}>{t.label}</button>
        ))}
      </div>

      {isLoading ? <Spinner /> : !reports.length ? <Card><EmptyState title="Không có báo cáo nào" hint="Cộng đồng đang rất văn minh 🎉" /></Card> : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {reports.map(r => (
            <Card key={r.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  {statusBadge(r.status)} <span>{fmtDate(r.created_at, true)}</span>
                </div>
                <button onClick={() => setDelId(r.id)} className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-4 h-4" /></button>
              </div>

              <p className="mt-3 text-sm text-white"><span className="text-zinc-500">Lý do:</span> {r.reason}</p>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <Person label="Người báo cáo" p={r.reporter} />
                <Person label="Người bị báo cáo" p={r.reported_user} banned={r.reported_user?.is_banned} />
              </div>

              {r.message && (
                <div className="mt-4 rounded-xl border border-white/5 bg-black/30 p-3">
                  <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">Tin nhắn bị báo cáo</p>
                  <p className={`text-sm whitespace-pre-wrap break-words ${r.message.is_deleted ? 'text-zinc-500 italic' : 'text-zinc-200'}`}>{r.message.content}</p>
                </div>
              )}

              {r.status === 'pending' ? (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="flex flex-wrap gap-4 text-xs text-zinc-300 mb-3">
                    {r.message_id && !r.message?.is_deleted && (
                      <label className="inline-flex items-center gap-2 cursor-pointer"><input type="checkbox" className="accent-violet-500" checked={o(r.id).del} onChange={e => setO(r.id, { del: e.target.checked })} /><MessageSquareX className="w-3.5 h-3.5" /> Xóa tin nhắn</label>
                    )}
                    {r.reported_user_id && !r.reported_user?.is_banned && (
                      <label className="inline-flex items-center gap-2 cursor-pointer"><input type="checkbox" className="accent-violet-500" checked={o(r.id).ban} onChange={e => setO(r.id, { ban: e.target.checked })} /><Ban className="w-3.5 h-3.5" /> Khóa người vi phạm</label>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1" loading={resolve.isPending && resolve.variables?.id === r.id && resolve.variables?.status === 'resolved'}
                      onClick={() => resolve.mutate({ id: r.id, status: 'resolved', delete_message: o(r.id).del, ban_reported_user: o(r.id).ban })}>
                      <CheckCircle2 className="w-4 h-4" /> Xử lý
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => resolve.mutate({ id: r.id, status: 'dismissed' })}>
                      <XCircle className="w-4 h-4" /> Bỏ qua
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 pt-4 border-t border-white/5 flex justify-end">
                  <Button variant="ghost" onClick={() => resolve.mutate({ id: r.id, status: 'pending' })}><RotateCcw className="w-4 h-4" /> Mở lại</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} loading={del.isPending}
        title="Xóa báo cáo?" message="Bản ghi báo cáo sẽ bị xóa khỏi hệ thống." onConfirm={() => delId && del.mutate(delId)} />
    </>
  )
}

function Person({ label, p, banned }: { label: string; p?: { email: string; full_name: string | null; avatar_url: string | null } | null; banned?: boolean }) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/5 p-2.5">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">{label}</p>
      {p ? (
        <div className="flex items-center gap-2">
          <Avatar src={p.avatar_url} name={p.full_name || p.email} size={26} />
          <div className="min-w-0">
            <p className="text-xs text-white truncate">{p.full_name || '—'} {banned && <Badge tone="red">Khóa</Badge>}</p>
            <p className="text-[11px] text-zinc-500 truncate">{p.email}</p>
          </div>
        </div>
      ) : <p className="text-xs text-zinc-500">—</p>}
    </div>
  )
}

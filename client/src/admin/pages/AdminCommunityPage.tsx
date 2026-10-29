import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Hash, Globe, Archive, ArchiveRestore, Trash2, Pencil, Search, Users, MessageSquare } from 'lucide-react'
import { adminApi, type AdminChannel } from '../services/adminApi'
import {
  Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, Modal, PageHeader, Spinner, Toggle, fmtDate, fmtNum, inputCls, td, th,
} from '../components/ui'

export function AdminCommunityPage() {
  const [tab, setTab] = useState<'channels' | 'messages'>('channels')
  return (
    <>
      <PageHeader title="Quản lý cộng đồng" subtitle="Kênh chat, tin nhắn và hoạt động của cộng đồng." />
      <div className="flex gap-1 mb-4 p-1 rounded-xl bg-white/[0.03] w-fit">
        {([['channels', 'Kênh chat', Hash], ['messages', 'Tin nhắn', MessageSquare]] as const).map(([k, l, I]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm transition ${tab === k ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'}`}>
            <I className="w-4 h-4" />{l}
          </button>
        ))}
      </div>
      {tab === 'channels' ? <ChannelsTab /> : <MessagesTab />}
    </>
  )
}

function ChannelsTab() {
  const qc = useQueryClient()
  const { data: channels = [], isLoading } = useQuery({ queryKey: ['admin', 'channels'], queryFn: adminApi.channels })
  const [edit, setEdit] = useState<AdminChannel | null>(null)
  const [del, setDel] = useState<AdminChannel | null>(null)
  const [filter, setFilter] = useState('')

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'channels'] })
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof adminApi.updateChannel>[1] }) => adminApi.updateChannel(id, body),
    onSuccess: () => { toast.success('Đã cập nhật kênh'); refresh(); setEdit(null) },
    onError: (e: Error) => toast.error(e.message),
  })
  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteChannel(id),
    onSuccess: () => { toast.success('Đã xóa kênh'); refresh(); setDel(null) },
    onError: (e: Error) => toast.error(e.message),
  })

  const list = channels.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()))

  return (
    <Card>
      <div className="p-4 border-b border-white/[0.04]">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input className={`${inputCls} pl-9`} placeholder="Lọc kênh…" value={filter} onChange={e => setFilter(e.target.value)} />
        </div>
      </div>
      {isLoading ? <Spinner /> : !list.length ? <EmptyState title="Chưa có kênh nào" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/[0.04]"><tr>
              <th className={th}>Kênh</th><th className={th}>Người tạo</th><th className={th}>Thành viên</th>
              <th className={th}>Tin nhắn</th><th className={th}>Trạng thái</th><th className={th}>Ngày tạo</th><th className={`${th} text-right`}>Thao tác</th>
            </tr></thead>
            <tbody className="divide-y divide-white/[0.03]">
              {list.map(c => (
                <tr key={c.id} className="hover:bg-white/[0.02]">
                  <td className={td}>
                    <div className="flex items-center gap-3">
                      {c.logo_url ? <img src={c.logo_url} className="w-9 h-9 rounded-xl object-cover" alt="" /> :
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 grid place-items-center"><Hash className="w-4 h-4 text-violet-200" /></div>}
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate max-w-[200px]">{c.name}</p>
                        <p className="text-xs text-zinc-500 truncate max-w-[200px]">{c.description || c.category || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className={td}>{c.owner?.full_name || c.owner?.email || '—'}</td>
                  <td className={td}><span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5 text-zinc-500" />{fmtNum(c.chat_members?.[0]?.count)}</span></td>
                  <td className={td}>{fmtNum(c.community_messages?.[0]?.count)}</td>
                  <td className={td}>
                    <div className="flex gap-1">
                      {c.is_global && <Badge tone="blue"><Globe className="w-3 h-3" />Global</Badge>}
                      {c.is_archived ? <Badge tone="amber">Lưu trữ</Badge> : <Badge tone="green">Hoạt động</Badge>}
                    </div>
                  </td>
                  <td className={td}>{fmtDate(c.created_at)}</td>
                  <td className={`${td} text-right`}>
                    <div className="inline-flex gap-1">
                      <button title="Sửa" onClick={() => setEdit(c)} className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5"><Pencil className="w-4 h-4" /></button>
                      <button title={c.is_archived ? 'Khôi phục' : 'Lưu trữ'} onClick={() => update.mutate({ id: c.id, body: { is_archived: !c.is_archived } })}
                        className="p-2 rounded-lg text-zinc-500 hover:text-amber-300 hover:bg-amber-500/10">
                        {c.is_archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                      </button>
                      <button title="Xóa" onClick={() => setDel(c)} className="p-2 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EditChannelModal channel={edit} onClose={() => setEdit(null)} saving={update.isPending}
        onSave={body => edit && update.mutate({ id: edit.id, body })} />
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} loading={remove.isPending} title="Xóa kênh?"
        message={<>Kênh <b className="text-zinc-200">{del?.name}</b> cùng toàn bộ tin nhắn sẽ bị xóa vĩnh viễn.</>}
        onConfirm={() => del && remove.mutate(del.id)} />
    </Card>
  )
}

function EditChannelModal({ channel, onClose, onSave, saving }: {
  channel: AdminChannel | null; onClose: () => void; saving: boolean
  onSave: (b: { name: string; description: string; category: string; is_global: boolean }) => void
}) {
  const [f, setF] = useState({ name: '', description: '', category: '', is_global: false })
  useEffect(() => {
    if (channel) setF({ name: channel.name, description: channel.description || '', category: channel.category || '', is_global: channel.is_global })
  }, [channel])
  return (
    <Modal open={!!channel} onClose={onClose} title="Chỉnh sửa kênh">
      <div className="space-y-3">
        <label className="block"><span className="text-xs text-zinc-400">Tên kênh</span><input className={`${inputCls} mt-1.5`} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>
        <label className="block"><span className="text-xs text-zinc-400">Mô tả</span><textarea rows={3} className={`${inputCls} mt-1.5`} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></label>
        <label className="block"><span className="text-xs text-zinc-400">Danh mục</span><input className={`${inputCls} mt-1.5`} value={f.category} onChange={e => setF({ ...f, category: e.target.value })} /></label>
        <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5">
          <div><p className="text-sm text-white">Kênh toàn cầu</p><p className="text-xs text-zinc-500">Mọi người dùng đều thấy kênh này</p></div>
          <Toggle checked={f.is_global} onChange={v => setF({ ...f, is_global: v })} />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <Button variant="ghost" onClick={onClose}>Hủy</Button>
        <Button loading={saving} disabled={!f.name.trim()} onClick={() => onSave(f)}>Lưu</Button>
      </div>
    </Modal>
  )
}

function MessagesTab() {
  const qc = useQueryClient()
  const [channelId, setChannelId] = useState('')
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  useEffect(() => { const t = setTimeout(() => setQ(search), 350); return () => clearTimeout(t) }, [search])

  const { data: channels = [] } = useQuery({ queryKey: ['admin', 'channels'], queryFn: adminApi.channels })
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['admin', 'messages', channelId, q],
    queryFn: () => adminApi.messages({ channel_id: channelId || undefined, search: q || undefined }),
  })
  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteMessage(id),
    onSuccess: () => { toast.success('Đã ẩn tin nhắn'); qc.invalidateQueries({ queryKey: ['admin', 'messages'] }) },
    onError: (e: Error) => toast.error(e.message),
  })
  const chName = (id: string) => channels.find(c => c.id === id)?.name || '—'

  return (
    <Card>
      <div className="flex flex-col md:flex-row gap-3 p-4 border-b border-white/[0.04]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input className={`${inputCls} pl-9`} placeholder="Tìm nội dung tin nhắn…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className={`${inputCls} md:w-64`} value={channelId} onChange={e => setChannelId(e.target.value)}>
          <option value="">Tất cả kênh</option>
          {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {isLoading ? <Spinner /> : !messages.length ? <EmptyState title="Không có tin nhắn" /> : (
        <ul className="divide-y divide-white/[0.03]">
          {messages.map(m => (
            <li key={m.id} className="flex gap-3 px-4 py-3 hover:bg-white/[0.02] group">
              <Avatar src={m.owner?.avatar_url} name={m.owner?.full_name || m.owner?.email} size={34} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-medium text-white">{m.owner?.full_name || m.owner?.email || 'Ẩn danh'}</span>
                  <Badge tone="violet"># {chName(m.channel_id)}</Badge>
                  <span className="text-zinc-500">{fmtDate(m.created_at, true)}</span>
                  {m.is_deleted && <Badge tone="red">Đã xóa</Badge>}
                </div>
                <p className={`text-sm mt-1 whitespace-pre-wrap break-words ${m.is_deleted ? 'text-zinc-500 italic' : 'text-zinc-300'}`}>{m.content}</p>
              </div>
              {!m.is_deleted && (
                <button title="Ẩn tin nhắn" onClick={() => remove.mutate(m.id)}
                  className="self-start p-2 rounded-lg text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-rose-400 hover:bg-rose-500/10 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Search, Shield, ShieldOff, Ban, Unlock, Trash2, Eye, Download, Save } from 'lucide-react'
import { adminApi } from '../services/adminApi'
import type { Profile } from '@/types'
import {
  Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, Modal, PageHeader, Spinner, fmtDate, fmtNum, inputCls, td, th,
} from '../components/ui'

type Confirm = { kind: 'delete' | 'ban' | 'unban' | 'promote' | 'demote'; user: Profile } | null

function useDebounced<T>(v: T, ms = 350) {
  const [d, setD] = useState(v)
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t) }, [v, ms])
  return d
}

function exportCsv(users: Profile[]) {
  const head = ['id', 'email', 'full_name', 'role', 'is_banned', 'xp', 'level', 'rank_tier', 'points', 'created_at']
  const rows = users.map(u => head.map(k => JSON.stringify((u as unknown as Record<string, unknown>)[k] ?? '')).join(','))
  const blob = new Blob(['\uFEFF' + [head.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
}

export function AdminUsersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('all')
  const [state, setState] = useState<'all' | 'active' | 'banned'>('all')
  const [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const q = useDebounced(search)
  const PAGE = 15

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin', 'users', q, role, state],
    queryFn: () => adminApi.users({ search: q, role, banned: state === 'all' ? undefined : state === 'banned' }),
  })
  useEffect(() => setPage(1), [q, role, state])

  const pages = Math.max(1, Math.ceil(users.length / PAGE))
  const visible = useMemo(() => users.slice((page - 1) * PAGE, page * PAGE), [users, page])

  const invalidate = () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); qc.invalidateQueries({ queryKey: ['admin', 'stats'] }) }

  const mut = useMutation({
    mutationFn: async (c: NonNullable<Confirm>) => {
      if (c.kind === 'delete') return adminApi.deleteUser(c.user.id)
      if (c.kind === 'ban') return adminApi.updateUser(c.user.id, { is_banned: true })
      if (c.kind === 'unban') return adminApi.updateUser(c.user.id, { is_banned: false })
      if (c.kind === 'promote') return adminApi.updateUser(c.user.id, { role: 'admin' })
      return adminApi.updateUser(c.user.id, { role: 'user' })
    },
    onSuccess: (_, c) => {
      toast.success({ delete: 'Đã xóa người dùng', ban: 'Đã khóa tài khoản', unban: 'Đã mở khóa', promote: 'Đã cấp quyền Admin', demote: 'Đã thu hồi quyền Admin' }[c.kind])
      setConfirm(null); invalidate()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const confirmText: Record<NonNullable<Confirm>['kind'], [string, string]> = {
    delete: ['Xóa người dùng?', 'Toàn bộ dữ liệu của người dùng sẽ bị xóa vĩnh viễn. Không thể hoàn tác.'],
    ban: ['Khóa tài khoản?', 'Người dùng sẽ không thể sử dụng hệ thống cho đến khi được mở khóa.'],
    unban: ['Mở khóa tài khoản?', 'Người dùng sẽ có thể truy cập lại hệ thống.'],
    promote: ['Cấp quyền Quản trị viên?', 'Người dùng này sẽ truy cập được toàn bộ Admin Console.'],
    demote: ['Thu hồi quyền Admin?', 'Người dùng sẽ trở về quyền thường.'],
  }

  return (
    <>
      <PageHeader title="Quản lý người dùng" subtitle={`${fmtNum(users.length)} người dùng phù hợp bộ lọc`}
        actions={<Button variant="outline" onClick={() => exportCsv(users)}><Download className="w-4 h-4" /> Xuất CSV</Button>} />

      <Card>
        <div className="flex flex-col md:flex-row gap-3 p-4 border-b border-white/[0.04]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input id="admin-user-search" className={`${inputCls} pl-9`} placeholder="Tìm theo email hoặc tên…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className={`${inputCls} md:w-40`} value={role} onChange={e => setRole(e.target.value)}>
            <option value="all">Mọi vai trò</option><option value="user">User</option><option value="admin">Admin</option>
          </select>
          <select className={`${inputCls} md:w-40`} value={state} onChange={e => setState(e.target.value as typeof state)}>
            <option value="all">Mọi trạng thái</option><option value="active">Hoạt động</option><option value="banned">Bị khóa</option>
          </select>
        </div>

        {isLoading ? <Spinner /> : !users.length ? <EmptyState title="Không tìm thấy người dùng" /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/[0.04]"><tr>
                <th className={th}>Người dùng</th><th className={th}>Vai trò</th><th className={th}>Trạng thái</th>
                <th className={th}>Cấp / XP</th><th className={th}>Ngày tham gia</th><th className={`${th} text-right`}>Thao tác</th>
              </tr></thead>
              <tbody className="divide-y divide-white/[0.03]">
                {visible.map(u => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className={td}>
                      <div className="flex items-center gap-3">
                        <Avatar src={u.avatar_url} name={u.full_name || u.email} size={34} />
                        <div className="min-w-0">
                          <p className="text-white font-medium truncate max-w-[220px]">{u.full_name || '—'}</p>
                          <p className="text-xs text-zinc-500 truncate max-w-[220px]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className={td}>{u.role === 'admin' ? <Badge tone="violet"><Shield className="w-3 h-3" />Admin</Badge> : <Badge>User</Badge>}</td>
                    <td className={td}>{u.is_banned ? <Badge tone="red">Bị khóa</Badge> : <Badge tone="green">Hoạt động</Badge>}</td>
                    <td className={td}><span className="text-white">Lv {u.level ?? 1}</span> <span className="text-zinc-500">· {fmtNum(u.xp)} XP</span></td>
                    <td className={td}>{fmtDate(u.created_at)}</td>
                    <td className={`${td} text-right`}>
                      <div className="inline-flex gap-1">
                        <IconBtn title="Chi tiết" onClick={() => setDetailId(u.id)}><Eye className="w-4 h-4" /></IconBtn>
                        {u.role === 'admin'
                          ? <IconBtn title="Thu hồi Admin" onClick={() => setConfirm({ kind: 'demote', user: u })}><ShieldOff className="w-4 h-4" /></IconBtn>
                          : <IconBtn title="Cấp Admin" onClick={() => setConfirm({ kind: 'promote', user: u })}><Shield className="w-4 h-4" /></IconBtn>}
                        {u.is_banned
                          ? <IconBtn title="Mở khóa" onClick={() => setConfirm({ kind: 'unban', user: u })} tone="green"><Unlock className="w-4 h-4" /></IconBtn>
                          : <IconBtn title="Khóa" onClick={() => setConfirm({ kind: 'ban', user: u })} tone="amber"><Ban className="w-4 h-4" /></IconBtn>}
                        <IconBtn title="Xóa" onClick={() => setConfirm({ kind: 'delete', user: u })} tone="red"><Trash2 className="w-4 h-4" /></IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.04] text-xs text-zinc-400">
            <span>Trang {page} / {pages}</span>
            <div className="flex gap-1">
              <Button variant="outline" className="!py-1" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Trước</Button>
              <Button variant="outline" className="!py-1" disabled={page === pages} onClick={() => setPage(p => p + 1)}>Sau</Button>
            </div>
          </div>
        )}
      </Card>

      {confirm && (
        <ConfirmDialog open onClose={() => setConfirm(null)} loading={mut.isPending}
          danger={['delete', 'ban', 'demote'].includes(confirm.kind)}
          title={confirmText[confirm.kind][0]}
          message={<><b className="text-zinc-200">{confirm.user.email}</b><br />{confirmText[confirm.kind][1]}</>}
          onConfirm={() => mut.mutate(confirm)} />
      )}

      <UserDetailModal id={detailId} onClose={() => setDetailId(null)} onSaved={invalidate} />
    </>
  )
}

function IconBtn({ children, tone, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'red' | 'amber' | 'green' }) {
  const c = tone === 'red' ? 'hover:text-rose-400 hover:bg-rose-500/10' : tone === 'amber' ? 'hover:text-amber-300 hover:bg-amber-500/10' : tone === 'green' ? 'hover:text-emerald-300 hover:bg-emerald-500/10' : 'hover:text-white hover:bg-white/5'
  return <button {...rest} className={`p-2 rounded-lg text-zinc-500 transition ${c}`}>{children}</button>
}

function UserDetailModal({ id, onClose, onSaved }: { id: string | null; onClose: () => void; onSaved: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'user', id], queryFn: () => adminApi.user(id!), enabled: !!id })
  const [form, setForm] = useState({ full_name: '', xp: 0, level: 1, points: 0, rank_tier: '' })

  useEffect(() => {
    if (data) setForm({
      full_name: data.profile.full_name || '', xp: data.profile.xp ?? 0, level: data.profile.level ?? 1,
      points: data.profile.points ?? 0, rank_tier: data.profile.rank_tier || '',
    })
  }, [data])

  const save = useMutation({
    mutationFn: () => adminApi.updateUser(id!, form),
    onSuccess: () => { toast.success('Đã lưu thay đổi'); onSaved() },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Modal open={!!id} onClose={onClose} title="Chi tiết người dùng" width="max-w-2xl">
      {isLoading || !data ? <Spinner /> : (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar src={data.profile.avatar_url} name={data.profile.full_name || data.profile.email} size={56} />
            <div>
              <p className="text-lg font-semibold text-white">{data.profile.full_name || '—'}</p>
              <p className="text-sm text-zinc-400">{data.profile.email}</p>
              <div className="flex gap-1.5 mt-1.5">
                {data.profile.role === 'admin' ? <Badge tone="violet">Admin</Badge> : <Badge>User</Badge>}
                {data.profile.is_banned ? <Badge tone="red">Bị khóa</Badge> : <Badge tone="green">Hoạt động</Badge>}
                <Badge tone="blue">Tham gia {fmtDate(data.profile.created_at)}</Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {([
              ['Môn học', data.stats.subjects], ['Task', data.stats.tasks], ['Ghi chú', data.stats.notes], ['Flashcard', data.stats.flashcards],
              ['File', data.stats.files], ['Tin nhắn', data.stats.messages], ['Bị báo cáo', data.stats.reports_against], ['Phút học', data.stats.study_minutes],
            ] as const).map(([l, v]) => (
              <div key={l} className="rounded-xl bg-white/[0.03] border border-white/5 px-3 py-2.5">
                <p className="text-lg font-semibold text-white tabular-nums">{fmtNum(v)}</p>
                <p className="text-[11px] text-zinc-500">{l}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Họ tên"><input className={inputCls} value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></Field>
            <Field label="Rank tier"><input className={inputCls} value={form.rank_tier} onChange={e => setForm(f => ({ ...f, rank_tier: e.target.value }))} /></Field>
            <Field label="XP"><input type="number" className={inputCls} value={form.xp} onChange={e => setForm(f => ({ ...f, xp: +e.target.value }))} /></Field>
            <Field label="Level"><input type="number" min={1} className={inputCls} value={form.level} onChange={e => setForm(f => ({ ...f, level: +e.target.value }))} /></Field>
            <Field label="Điểm"><input type="number" className={inputCls} value={form.points} onChange={e => setForm(f => ({ ...f, points: +e.target.value }))} /></Field>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Đóng</Button>
            <Button loading={save.isPending} onClick={() => save.mutate()}><Save className="w-4 h-4" /> Lưu thay đổi</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-xs text-zinc-400 mb-1.5">{label}</span>{children}</label>
}

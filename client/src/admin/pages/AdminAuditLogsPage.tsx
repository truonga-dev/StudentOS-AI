import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ScrollText, Filter, Eye, Shield, User, MessageSquare, Megaphone, Settings, Trash2,
} from 'lucide-react'
import { adminApi, type AuditLog } from '../services/adminApi'
import {
  Badge, Button, Card, EmptyState, Modal, PageHeader, Spinner, fmtDate, inputCls, td, th,
} from '../components/ui'

const ACTION_CATEGORIES = [
  { id: '', label: 'Tất cả thao tác' },
  { id: 'user', label: 'Người dùng (user.*)' },
  { id: 'report', label: 'Báo cáo (report.*)' },
  { id: 'channel', label: 'Kênh chat (channel.*)' },
  { id: 'message', label: 'Tin nhắn (message.*)' },
  { id: 'content', label: 'Nội dung (content.*)' },
  { id: 'broadcast', label: 'Thông báo (broadcast.*)' },
  { id: 'settings', label: 'Cài đặt (settings.*)' },
]

export function AdminAuditLogsPage() {
  const [actionFilter, setActionFilter] = useState('')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['admin', 'audit-logs', actionFilter],
    queryFn: () => adminApi.auditLogs(actionFilter || undefined),
  })

  const getActionBadge = (action: string) => {
    if (action.includes('delete') || action.includes('ban')) {
      return <Badge tone="red">{action}</Badge>
    }
    if (action.includes('promote') || action.includes('unban') || action.includes('resolved')) {
      return <Badge tone="green">{action}</Badge>
    }
    if (action.includes('broadcast') || action.includes('send')) {
      return <Badge tone="violet">{action}</Badge>
    }
    if (action.includes('update') || action.includes('settings')) {
      return <Badge tone="amber">{action}</Badge>
    }
    return <Badge tone="blue">{action}</Badge>
  }

  const getTargetIcon = (targetType?: string | null) => {
    switch (targetType) {
      case 'user': return <User className="w-3.5 h-3.5 text-violet-400" />
      case 'report': return <Shield className="w-3.5 h-3.5 text-rose-400" />
      case 'channel':
      case 'message': return <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
      case 'broadcast': return <Megaphone className="w-3.5 h-3.5 text-fuchsia-400" />
      case 'settings': return <Settings className="w-3.5 h-3.5 text-amber-400" />
      default: return <ScrollText className="w-3.5 h-3.5 text-zinc-400" />
    }
  }

  return (
    <>
      <PageHeader
        title="Nhật ký hoạt động Quản trị (Audit Logs)"
        subtitle="Theo dõi và kiểm toán toàn bộ thao tác can thiệp hệ thống của các quản trị viên."
      />

      <Card>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-b border-white/[0.04]">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-zinc-500 shrink-0" />
            <select
              className={`${inputCls} sm:w-64`}
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
            >
              {ACTION_CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="text-xs text-zinc-500">
            Tổng cộng: <span className="font-semibold text-white">{logs.length}</span> nhật ký ghi nhận
          </div>
        </div>

        {isLoading ? (
          <Spinner />
        ) : logs.length === 0 ? (
          <EmptyState
            title="Chưa có nhật ký hoạt động nào"
            hint="Các thao tác can thiệp của Quản trị viên (khóa tài khoản, xử lý báo cáo, gửi thông báo) sẽ được lưu lại tự động."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/[0.04]">
                <tr>
                  <th className={th}>Thời gian</th>
                  <th className={th}>Admin thực hiện</th>
                  <th className={th}>Hành động (Action)</th>
                  <th className={th}>Đối tượng (Target)</th>
                  <th className={th}>Mã đối tượng (ID)</th>
                  <th className={`${th} text-right`}>Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {logs.map((log: AuditLog) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className={td}>
                      <span className="font-mono text-xs text-zinc-400">{fmtDate(log.created_at, true)}</span>
                    </td>
                    <td className={td}>
                      <span className="text-white font-medium text-xs">
                        {log.admin_email || (log.admin_id ? log.admin_id.slice(0, 8) : 'System')}
                      </span>
                    </td>
                    <td className={td}>{getActionBadge(log.action)}</td>
                    <td className={td}>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                        {getTargetIcon(log.target_type)}
                        <span className="capitalize">{log.target_type || '—'}</span>
                      </div>
                    </td>
                    <td className={td}>
                      <span className="font-mono text-[11px] text-zinc-500">
                        {log.target_id ? log.target_id.slice(0, 16) : '—'}
                      </span>
                    </td>
                    <td className={`${td} text-right`}>
                      <button
                        title="Xem chi tiết JSON"
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-violet-300 hover:text-white hover:bg-violet-600/20 transition"
                      >
                        <Eye className="w-3.5 h-3.5" /> Xem
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* JSON Details Modal */}
      <Modal
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="Chi tiết thao tác kiểm toán (Audit Detail)"
        width="max-w-xl"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <span className="text-zinc-500 block mb-1">Admin</span>
                <span className="text-white font-medium">{selectedLog.admin_email || selectedLog.admin_id}</span>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <span className="text-zinc-500 block mb-1">Hành động</span>
                <span className="text-white font-medium">{selectedLog.action}</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                Dữ liệu đính kèm (Details JSON)
              </p>
              <pre className="rounded-xl border border-white/5 bg-black/40 p-3 text-xs text-zinc-300 font-mono overflow-x-auto max-h-72">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="ghost" onClick={() => setSelectedLog(null)}>Đóng</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

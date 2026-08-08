import { useState } from 'react'
import { Download, HardDrive, Globe, UserX, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { exportUserData } from '@/services/profiles'
import { useProfile } from '@/hooks/useProfile'
import { clsx } from 'clsx'

export function DataPrivacyTab() {
  const { profile, updateProfile } = useProfile()
  const [exporting, setExporting] = useState(false)
  const [privacyPublic, setPrivacyPublic] = useState(true)
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(true)
  const [allowFriendReq, setAllowFriendReq] = useState(true)

  const handleExport = async () => {
    setExporting(true)
    try {
      toast.loading('Đang chuẩn bị dữ liệu...', { id: 'export' })
      const blob = await exportUserData()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `student-os-export-${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Đã tải xuống dữ liệu!', { id: 'export' })
    } catch (e: any) {
      toast.error(e.message || 'Lỗi export dữ liệu', { id: 'export' })
    } finally {
      setExporting(false)
    }
  }

  const ToggleRow = ({ label, desc, on, onChange }: { label: string; desc: string; on: boolean; onChange: () => void }) => (
    <div className="flex items-center justify-between p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50">
      <div className="flex-1 pr-4">
        <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{label}</p>
        <p className="text-xs text-surface-500 mt-0.5">{desc}</p>
      </div>
      <button onClick={onChange}
        className={clsx('w-11 h-6 rounded-full transition-colors duration-200 relative shrink-0', on ? 'bg-primary-500' : 'bg-surface-200 dark:bg-surface-700')}>
        <div className={clsx('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200', on ? 'left-[calc(100%-22px)]' : 'left-0.5')} />
      </button>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* ── Export ───────────────────────────────────────────────────────── */}
      <div>
        <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-1 flex items-center gap-2">
          <Download className="w-4 h-4 text-primary-500" /> Xuất dữ liệu
        </h4>
        <p className="text-xs text-surface-500 mb-4">Tải về toàn bộ dữ liệu học tập của bạn dưới dạng file ZIP (JSON).</p>

        <div className="card p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Profile & Settings', icon: '👤', desc: 'Thông tin cơ bản' },
              { label: 'Subjects & Tasks', icon: '✅', desc: 'Môn học & công việc' },
              { label: 'Notes', icon: '📝', desc: 'Tất cả ghi chú' },
              { label: 'Flashcards', icon: '🃏', desc: 'Bộ thẻ ghi nhớ' },
              { label: 'Calendar Events', icon: '📅', desc: 'Lịch học & sự kiện' },
              { label: 'Study Sessions', icon: '⏱️', desc: 'Lịch sử học tập' },
            ].map(item => (
              <div key={item.label} className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50 flex items-center gap-2">
                <span className="text-xl">{item.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-surface-700 dark:text-surface-300">{item.label}</p>
                  <p className="text-[10px] text-surface-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-60"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? 'Đang xuất dữ liệu...' : 'Tải xuống ZIP'}
          </button>
        </div>
      </div>

      {/* ── Privacy ──────────────────────────────────────────────────────── */}
      <div>
        <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-1 flex items-center gap-2">
          <Globe className="w-4 h-4 text-success-500" /> Quyền riêng tư
        </h4>
        <p className="text-xs text-surface-500 mb-4">Kiểm soát thông tin bạn chia sẻ với người dùng khác.</p>
        <div className="space-y-2">
          <ToggleRow
            label="Hồ sơ công khai"
            desc="Người dùng khác có thể xem hồ sơ của bạn"
            on={privacyPublic}
            onChange={() => setPrivacyPublic(v => !v)}
          />
          <ToggleRow
            label="Hiển thị trên Leaderboard"
            desc="Xuất hiện trong bảng xếp hạng XP toàn cộng đồng"
            on={showOnLeaderboard}
            onChange={() => setShowOnLeaderboard(v => !v)}
          />
          <ToggleRow
            label="Cho phép lời mời kết bạn"
            desc="Người dùng khác có thể gửi lời mời kết bạn cho bạn"
            on={allowFriendReq}
            onChange={() => setAllowFriendReq(v => !v)}
          />
        </div>
      </div>

      {/* ── Storage stats ─────────────────────────────────────────────────── */}
      <div>
        <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-1 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-surface-400" /> Bộ nhớ đang sử dụng
        </h4>
        <p className="text-xs text-surface-500 mb-4">Ước tính dung lượng dữ liệu bạn đang lưu trên hệ thống.</p>
        <div className="card p-4">
          <div className="space-y-3">
            {[
              { label: 'Ảnh đại diện & Bìa', size: '~2 MB', pct: 15 },
              { label: 'Tệp đính kèm', size: '~8 MB', pct: 55 },
              { label: 'Ghi chú & Flashcard', size: '~1 MB', pct: 10 },
              { label: 'Bộ nhớ trống', size: '~100 MB', pct: 20, muted: true },
            ].map(item => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className={item.muted ? 'text-surface-400' : 'text-surface-600 dark:text-surface-300'}>{item.label}</span>
                  <span className="font-medium text-surface-500">{item.size}</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.pct}%`, background: item.muted ? 'rgba(100,116,139,0.3)' : 'linear-gradient(90deg, #6B4EFF, #06b6d4)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

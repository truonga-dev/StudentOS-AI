import { useState } from 'react'
import { clsx } from 'clsx'

interface ToggleItem {
  key: string
  label: string
  desc: string
  defaultOn: boolean
  group: string
}

const ITEMS: ToggleItem[] = [
  // Học tập
  { key: 'deadline', label: 'Nhắc Deadline', desc: 'Nhận thông báo trước 1 ngày khi deadline đến gần', defaultOn: true, group: 'study' },
  { key: 'schedule', label: 'Nhắc Lịch học', desc: 'Thông báo trước 30 phút khi có tiết học', defaultOn: true, group: 'study' },
  { key: 'flashcard', label: 'Nhắc ôn Flashcard', desc: 'Nhắc nhở ôn thẻ ghi nhớ hàng ngày theo Spaced Repetition', defaultOn: true, group: 'study' },
  // AI
  { key: 'weekly_report', label: 'Báo cáo AI hàng tuần', desc: 'Nhận phân tích học tập cá nhân hóa mỗi cuối tuần', defaultOn: true, group: 'ai' },
  { key: 'ai_suggest', label: 'Gợi ý AI học tập', desc: 'AI gợi ý môn học và tài liệu phù hợp với tiến độ của bạn', defaultOn: false, group: 'ai' },
  { key: 'monthly_analysis', label: 'Phân tích tháng', desc: 'Báo cáo tổng kết hiệu suất học tập hàng tháng', defaultOn: false, group: 'ai' },
  // Cộng đồng
  { key: 'community_msg', label: 'Tin nhắn cộng đồng', desc: 'Thông báo khi có tin nhắn mới trong các kênh bạn tham gia', defaultOn: true, group: 'community' },
  { key: 'friend_req', label: 'Lời mời kết bạn', desc: 'Thông báo khi có người muốn kết bạn với bạn', defaultOn: true, group: 'community' },
]

const GROUPS: { key: string; label: string; emoji: string }[] = [
  { key: 'study', label: 'Học tập', emoji: '📚' },
  { key: 'ai', label: 'AI & Báo cáo', emoji: '🤖' },
  { key: 'community', label: 'Cộng đồng', emoji: '🌐' },
]

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={clsx('w-11 h-6 rounded-full transition-colors duration-200 relative shrink-0', on ? 'bg-primary-500' : 'bg-surface-200 dark:bg-surface-700')}
    >
      <div className={clsx('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200', on ? 'left-[calc(100%-22px)]' : 'left-0.5')} />
    </button>
  )
}

export function NotificationsTab() {
  const [states, setStates] = useState<Record<string, boolean>>(
    () => Object.fromEntries(ITEMS.map(i => [i.key, i.defaultOn]))
  )
  const [delivery, setDelivery] = useState<'push' | 'email' | 'both'>('push')

  const toggle = (key: string) => setStates(s => ({ ...s, [key]: !s[key] }))

  return (
    <div className="space-y-6">
      {GROUPS.map(group => (
        <div key={group.key}>
          <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
            <span>{group.emoji}</span> {group.label}
          </h4>
          <div className="space-y-2">
            {ITEMS.filter(i => i.group === group.key).map(item => (
              <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-100 dark:border-surface-700/50">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{item.label}</p>
                  <p className="text-xs text-surface-500 mt-0.5">{item.desc}</p>
                </div>
                <Toggle on={states[item.key]} onChange={() => toggle(item.key)} />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Delivery method */}
      <div>
        <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
          <span>📬</span> Kênh nhận thông báo
        </h4>
        <div className="flex gap-2 flex-wrap">
          {([
            { id: 'push', label: '🔔 Push notification' },
            { id: 'email', label: '📧 Email' },
            { id: 'both', label: '🔔📧 Cả hai' },
          ] as const).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setDelivery(id)}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all',
                delivery === id
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
                  : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:border-surface-300',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

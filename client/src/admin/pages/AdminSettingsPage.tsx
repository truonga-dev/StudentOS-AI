import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Settings, Save, AlertTriangle, ShieldCheck, UserCheck, MessageSquare, Bot, Server,
  CheckCircle2, HardDrive, RefreshCw,
} from 'lucide-react'
import { adminApi, type SystemSettings } from '../services/adminApi'
import {
  Button, Card, PageHeader, Spinner, Toggle, inputCls,
} from '../components/ui'

export function AdminSettingsPage() {
  const qc = useQueryClient()
  const { data: serverSettings = {}, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: adminApi.settings,
  })

  const [form, setForm] = useState<SystemSettings>({
    maintenance_mode: false,
    registration_enabled: true,
    community_enabled: true,
    ai_enabled: true,
    announcement_banner: '',
    ai_daily_limit: 50,
    max_upload_mb: 20,
  })

  useEffect(() => {
    if (serverSettings && Object.keys(serverSettings).length > 0) {
      setForm(prev => ({ ...prev, ...serverSettings }))
    }
  }, [serverSettings])

  const saveMut = useMutation({
    mutationFn: () => adminApi.saveSettings(form),
    onSuccess: () => {
      toast.success('Đã lưu cấu hình hệ thống thành công!')
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) return <Spinner />

  return (
    <>
      <PageHeader
        title="Cấu hình hệ thống (System Settings)"
        subtitle="Quản lý các cờ tính năng, giới hạn tài nguyên và chế độ vận hành của toàn bộ nền tảng."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className="w-4 h-4" /> Làm mới
            </Button>
            <Button loading={saveMut.isPending} onClick={() => saveMut.mutate()}>
              <Save className="w-4 h-4" /> Lưu cấu hình
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Feature Toggles */}
        <div className="lg:col-span-7 space-y-6">
          <Card title="Tính năng cốt lõi & Chế độ hoạt động">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Chế độ bảo trì (Maintenance Mode)</p>
                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                      Khi bật, chỉ Quản trị viên mới có thể truy cập hệ thống. Người dùng thường sẽ thấy màn hình bảo trì.
                    </p>
                  </div>
                </div>
                <Toggle
                  checked={Boolean(form.maintenance_mode)}
                  onChange={v => setForm(f => ({ ...f, maintenance_mode: v }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 mt-0.5">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Cho phép đăng ký tài khoản mới</p>
                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                      Tắt tùy chọn này nếu bạn muốn tạm thời đóng cổng đăng ký học viên mới.
                    </p>
                  </div>
                </div>
                <Toggle
                  checked={Boolean(form.registration_enabled)}
                  onChange={v => setForm(f => ({ ...f, registration_enabled: v }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 mt-0.5">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Tính năng Cộng đồng & Chat nhóm</p>
                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                      Bật/tắt toàn bộ kênh chat cộng đồng và thảo luận học tập.
                    </p>
                  </div>
                </div>
                <Toggle
                  checked={Boolean(form.community_enabled)}
                  onChange={v => setForm(f => ({ ...f, community_enabled: v }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 mt-0.5">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Trợ lý AI & Tóm tắt tài liệu</p>
                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                      Bật/tắt tính năng gọi LLM AI (Google Gemini / OpenAI) cho học viên.
                    </p>
                  </div>
                </div>
                <Toggle
                  checked={Boolean(form.ai_enabled)}
                  onChange={v => setForm(f => ({ ...f, ai_enabled: v }))}
                />
              </div>
            </div>
          </Card>

          <Card title="Biểu ngữ thông báo toàn trang (Announcement Banner)">
            <p className="text-xs text-zinc-400 mb-3">
              Văn bản hiển thị nổi bật ở đỉnh trang web cho tất cả học viên (để trống nếu không muốn hiển thị).
            </p>
            <input
              className={inputCls}
              placeholder="Vd: 🚀 Ra mắt tính năng Pomodoro & Phòng tập trung mới!"
              value={String(form.announcement_banner || '')}
              onChange={e => setForm(f => ({ ...f, announcement_banner: e.target.value }))}
            />
          </Card>
        </div>

        {/* Right Column: Resource Limits & System Health */}
        <div className="lg:col-span-5 space-y-6">
          <Card title="Giới hạn tài nguyên học viên">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Giới hạn số yêu cầu AI mỗi ngày / user
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    max={500}
                    className={inputCls}
                    value={Number(form.ai_daily_limit || 50)}
                    onChange={e => setForm(f => ({ ...f, ai_daily_limit: Number(e.target.value) }))}
                  />
                  <span className="text-xs text-zinc-500 shrink-0">lượt / ngày</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Dung lượng tải lên tối đa mỗi tệp
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className={inputCls}
                    value={Number(form.max_upload_mb || 20)}
                    onChange={e => setForm(f => ({ ...f, max_upload_mb: Number(e.target.value) }))}
                  />
                  <span className="text-xs text-zinc-500 shrink-0">MB</span>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Thông tin môi trường & Máy chủ">
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-zinc-500 flex items-center gap-2">
                  <Server className="w-4 h-4 text-violet-400" /> Backend API
                </span>
                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> FastAPI (v0.1.0)
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-zinc-500 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-sky-400" /> Database & Auth
                </span>
                <span className="text-zinc-200 font-mono">Supabase PostgreSQL</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-zinc-500 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-fuchsia-400" /> Admin Guard
                </span>
                <span className="text-zinc-200">Server-side Verified</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-zinc-500">Môi trường</span>
                <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-mono">
                  {import.meta.env.MODE || 'development'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}

import { useState, useRef } from 'react'
import { Camera, Loader2, GraduationCap, Github, Linkedin, ImageIcon, Zap, Flame } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/lib/supabase'
import { uploadCoverPhoto } from '@/services/profiles'
import { clsx } from 'clsx'

import { RANK_CONFIG } from '@/lib/ranks'

export function ProfileTab() {
  const { user } = useAuth()
  const { profile, updateProfile, uploadAvatar, addXp } = useProfile()
  const metadata = user?.user_metadata || {}

  const [form, setForm] = useState({
    full_name: profile?.full_name || metadata.full_name || '',
    bio: profile?.bio || '',
    school: profile?.school || metadata.school || '',
    major: profile?.major || metadata.major || '',
    study_year: profile?.study_year?.toString() || '',
    target_gpa: profile?.target_gpa?.toString() || '',
    github_url: profile?.github_url || '',
    linkedin_url: profile?.linkedin_url || '',
  })
  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)

  const coverInputRef = useRef<HTMLInputElement>(null)
  const initial = form.full_name ? form.full_name.charAt(0).toUpperCase() : (user?.email?.charAt(0).toUpperCase() || 'U')

  // Gamification helpers
  const level = profile?.level ?? 1
  const xp = profile?.xp ?? 0
  const rankColor = RANK_CONFIG[profile?.rank_tier ?? 'Bronze']?.color ?? '#cd7f32'
  const currentLevelXpStart = level === 1 ? 0 : ((level - 1) * level / 2) * 100
  const nextLevelXpStart = (level * (level + 1) / 2) * 100
  const xpNeeded = nextLevelXpStart - currentLevelXpStart
  const xpProgress = Math.max(0, xp - currentLevelXpStart)
  const progressPct = Math.min(100, Math.round((xpProgress / xpNeeded) * 100))

  const handleSave = async () => {
    setLoading(true)
    try {
      await supabase.auth.updateUser({
        data: { full_name: form.full_name, school: form.school, major: form.major }
      })
      await updateProfile({
        full_name: form.full_name,
        bio: form.bio || null,
        school: form.school || null,
        major: form.major || null,
        study_year: form.study_year ? parseInt(form.study_year) : null,
        target_gpa: form.target_gpa ? parseFloat(form.target_gpa) : null,
        github_url: form.github_url || null,
        linkedin_url: form.linkedin_url || null,
      })
      toast.success('Đã cập nhật hồ sơ!')
    } catch (e: any) {
      toast.error(e.message || 'Lỗi cập nhật hồ sơ')
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Vui lòng chọn file hình ảnh')
    setUploadingAvatar(true)
    try {
      await uploadAvatar(file)
      toast.success('Đã cập nhật ảnh đại diện')
    } catch (e: any) {
      toast.error(e.message || 'Không thể tải ảnh lên')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Vui lòng chọn file hình ảnh')
    setUploadingCover(true)
    try {
      const url = await uploadCoverPhoto(file)
      await updateProfile({ cover_url: url })
      toast.success('Đã cập nhật ảnh bìa')
    } catch (e: any) {
      toast.error(e.message || 'Không thể tải ảnh bìa lên')
    } finally {
      setUploadingCover(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* ── Cover Photo + Avatar ─────────────────────────────────────────── */}
      <div>
        {/* Cover */}
        <div className="relative h-36 rounded-2xl overflow-hidden group">
          {profile?.cover_url ? (
            <img src={profile.cover_url} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full"
              style={{ background: `linear-gradient(135deg, ${rankColor}33 0%, #6B4EFF22 50%, #06b6d422 100%)` }}
            />
          )}
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
            <button
              onClick={() => coverInputRef.current?.click()}
              className="opacity-0 group-hover:opacity-100 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/90 text-surface-800 text-sm font-semibold transition-all shadow"
            >
              {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
              {uploadingCover ? 'Đang tải...' : 'Đổi ảnh bìa'}
            </button>
          </div>
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
        </div>

        {/* Avatar overlapping cover */}
        <div className="flex items-end gap-4 -mt-10 px-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl ring-4 ring-white dark:ring-surface-800 overflow-hidden shadow-lg">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-2xl font-black"
                  style={{ background: `linear-gradient(135deg, ${rankColor}, ${rankColor}88)` }}>
                  {initial}
                </div>
              )}
            </div>
            <label className="cursor-pointer absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-white dark:bg-surface-700 border border-surface-200 dark:border-surface-600 flex items-center justify-center shadow hover:bg-surface-50 transition-colors">
              {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 text-surface-500 animate-spin" /> : <Camera className="w-3.5 h-3.5 text-surface-500" />}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={uploadingAvatar} />
            </label>
          </div>
          <div className="mb-1">
            <h3 className="font-bold text-surface-900 dark:text-white">{form.full_name || 'Người dùng'}</h3>
            <p className="text-xs text-surface-500">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* ── Gamification Preview ─────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
        <p className="text-xs font-semibold text-surface-500 uppercase tracking-widest mb-3">Tiến độ Gamification</p>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${rankColor}20` }}>
              <Zap className="w-4 h-4" style={{ color: rankColor }} />
            </div>
            <div>
              <p className="text-xs text-surface-500">Level</p>
              <p className="text-sm font-bold text-surface-900 dark:text-white">Lv {level}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-100 dark:bg-orange-500/10">
              <Flame className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-surface-500">Streak</p>
              <p className="text-sm font-bold text-surface-900 dark:text-white">{profile?.current_streak ?? 0} ngày</p>
            </div>
          </div>
          <div className="flex-1 min-w-40">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-surface-500">{xp.toLocaleString()} XP</span>
              <span className="font-semibold" style={{ color: rankColor }}>{progressPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${rankColor}cc, ${rankColor})` }} />
            </div>
            <p className="text-[10px] text-surface-400 mt-1">Còn {Math.max(0, xpNeeded - xpProgress).toLocaleString()} XP lên Lv {level + 1}</p>
          </div>
        </div>
      </div>

      {/* ── Form ─────────────────────────────────────────────────────────── */}
      <div className="space-y-5">
        <h4 className="text-sm font-semibold text-surface-700 dark:text-surface-300 flex items-center gap-2">
          Thông tin cơ bản
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Họ và tên</label>
            <input className="input" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Email</label>
            <input className="input opacity-60" type="email" value={user?.email || ''} disabled />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Giới thiệu bản thân <span className="text-surface-400 font-normal">({form.bio.length}/160)</span></label>
          <textarea
            className="input resize-none"
            rows={3}
            maxLength={160}
            placeholder="Viết vài dòng về bản thân, mục tiêu học tập..."
            value={form.bio}
            onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Trường học</label>
            <input className="input" value={form.school} placeholder="Đại học Bách Khoa..." onChange={e => setForm(f => ({ ...f, school: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Ngành học</label>
            <input className="input" value={form.major} placeholder="Khoa học máy tính..." onChange={e => setForm(f => ({ ...f, major: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Năm học</label>
            <select className="input" value={form.study_year} onChange={e => setForm(f => ({ ...f, study_year: e.target.value }))}>
              <option value="">-- Chọn năm --</option>
              {[1, 2, 3, 4, 5, 6].map(y => <option key={y} value={y}>Năm {y}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Mục tiêu GPA</label>
            <input className="input" type="number" step="0.1" min="0" max="4" value={form.target_gpa} placeholder="VD: 3.5" onChange={e => setForm(f => ({ ...f, target_gpa: e.target.value }))} />
          </div>
        </div>

        {/* Social Links */}
        <div>
          <h4 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3">Liên kết mạng xã hội</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700 dark:text-surface-300 flex items-center gap-1.5">
                <Github className="w-3.5 h-3.5" /> GitHub
              </label>
              <input className="input" placeholder="https://github.com/username" value={form.github_url} onChange={e => setForm(f => ({ ...f, github_url: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700 dark:text-surface-300 flex items-center gap-1.5">
                <Linkedin className="w-3.5 h-3.5" /> LinkedIn
              </label>
              <input className="input" placeholder="https://linkedin.com/in/username" value={form.linkedin_url} onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))} />
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="px-6 py-2.5 rounded-xl bg-gradient-brand text-white text-sm font-semibold shadow-glow-sm hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-60"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Lưu thay đổi
      </button>
    </div>
  )
}

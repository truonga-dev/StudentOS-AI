import { supabase } from '@/lib/supabase'
import type { FileRecord, CreateFileInput } from '@/types'

const BUCKET = import.meta.env.VITE_STORAGE_BUCKET ?? 'student-files'

// ── Upload file lên Supabase Storage + lưu metadata vào DB ───────────────────
export async function uploadFile(
  file: File,
  subjectId?: string | null,
): Promise<FileRecord> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Chưa đăng nhập')

  // Đường dẫn: <user_id>/<timestamp>_<filename>
  const ext = file.name.split('.').pop() ?? ''
  const storagePath = `${user.id}/${Date.now()}_${file.name}`

  // 1. Upload lên Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { upsert: false })

  if (uploadError) throw uploadError

  // 2. Lấy public URL (nếu bucket public) hoặc sẽ dùng signed URL khi hiển thị
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  const fileUrl = urlData?.publicUrl ?? ''

  // 3. Insert metadata vào DB
  const input: CreateFileInput = {
    name: file.name,
    file_url: fileUrl,
    storage_path: storagePath,
    size_bytes: file.size,
    mime_type: file.type,
    subject_id: subjectId ?? null,
  }

  const { data, error } = await supabase
    .from('files')
    .insert({ ...input, user_id: user.id })
    .select('*, subjects(title, color)')
    .single()

  if (error) {
    // Rollback: xóa file vừa upload nếu insert DB thất bại
    await supabase.storage.from(BUCKET).remove([storagePath])
    throw error
  }

  // 4. Xử lý RAG cho PDF
  if (file.type === 'application/pdf') {
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const { data: { session } } = await supabase.auth.getSession()
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
      
      fetch(`${API_URL}/files/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: formData
      }).catch(e => console.error('Lỗi gọi API xử lý PDF:', e))
    } catch (e) {
      console.error('Lỗi chuẩn bị dữ liệu RAG PDF:', e)
    }
  }

  return data
}

// ── Lấy danh sách file của user ───────────────────────────────────────────────
export async function getFiles(subjectId?: string): Promise<FileRecord[]> {
  let query = supabase
    .from('files')
    .select('*, subjects(title, color)')
    .order('created_at', { ascending: false })

  if (subjectId) {
    query = query.eq('subject_id', subjectId)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

// ── Lấy signed URL để download (cho private bucket) ──────────────────────────
export async function getSignedUrl(storagePath: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn)

  if (error) throw error
  return data.signedUrl
}

// ── Xóa file (DB record + Storage object) ────────────────────────────────────
export async function deleteFile(id: string, storagePath: string): Promise<void> {
  // Xóa DB record trước
  const { error: dbError } = await supabase.from('files').delete().eq('id', id)
  if (dbError) throw dbError

  // Xóa file trong Storage
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([storagePath])
  if (storageError) console.warn('Không xóa được file storage:', storageError.message)
}

// ── Helpers ────────────────────────────────────────────────────────────────────
export function formatFileSize(bytes: number | null): string {
  if (!bytes) return 'N/A'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getMimeIcon(mimeType: string | null): string {
  if (!mimeType) return '📄'
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType === 'application/pdf') return '📕'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) return '📊'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📑'
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return '🗜️'
  if (mimeType.startsWith('video/')) return '🎬'
  if (mimeType.startsWith('audio/')) return '🎵'
  if (mimeType.startsWith('text/')) return '📄'
  return '📦'
}

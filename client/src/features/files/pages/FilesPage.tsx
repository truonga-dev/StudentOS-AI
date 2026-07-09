import { useState, useCallback, useRef } from 'react'
import { Upload, Trash2, Download, FileText, Image, X, Loader2, AlertCircle, Filter, MessageSquareText } from 'lucide-react'
import { clsx } from 'clsx'
import { useFiles } from '@/hooks/useFiles'
import { useSubjects } from '@/hooks/useSubjects'
import { getMimeIcon, formatFileSize, getSignedUrl } from '@/services/files'
import { DocumentChat } from '../components/DocumentChat'
import { DocumentUploader } from '../components/DocumentUploader'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}


// ── File Card Component ────────────────────────────────────────────────────────
function FileCard({
  file,
  onDelete,
}: {
  file: ReturnType<typeof useFiles>['files'][0]
  onDelete: () => void
}) {
  const [downloading, setDownloading] = useState(false)
  const isImage = file.mime_type?.startsWith('image/')

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const url = await getSignedUrl(file.storage_path)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
    } catch {
      // fallback to direct URL
      window.open(file.file_url, '_blank')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="card p-4 group flex flex-col gap-3 hover:shadow-card-hover transition-all duration-200">
      {/* Preview / Icon */}
      <div className="w-full aspect-video rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center overflow-hidden">
        {isImage ? (
          <img
            src={file.file_url}
            alt={file.name}
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <span className="text-4xl select-none">{getMimeIcon(file.mime_type)}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-surface-900 dark:text-white truncate" title={file.name}>
          {file.name}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {file.subjects && (
            <span
              className="badge-neutral text-2xs"
              style={{ borderLeftColor: file.subjects.color, borderLeftWidth: 2 }}
            >
              {file.subjects.title}
            </span>
          )}
          <span className="text-2xs text-surface-400">{formatFileSize(file.size_bytes)}</span>
          <span className="text-2xs text-surface-400 ml-auto">{formatDate(file.created_at)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-medium hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors disabled:opacity-60"
        >
          {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Tải xuống
        </button>
        <button
          onClick={onDelete}
          className="w-8 h-8 rounded-lg flex items-center justify-center bg-danger-50 dark:bg-danger-500/10 text-danger-500 hover:bg-danger-100 dark:hover:bg-danger-500/20 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function FilesPage() {
  const [filterSubject, setFilterSubject] = useState<string>('')
  const { files, loading, uploading, error, uploadFile, deleteFile } = useFiles()
  const { subjects } = useSubjects()
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)

  const handleFiles = useCallback(async (fileList: File[]) => {
    setUploadError(null)
    for (const file of fileList) {
      if (file.size > 50 * 1024 * 1024) {
        setUploadError(`File "${file.name}" vượt quá 50MB`)
        continue
      }
      try {
        await uploadFile(file, filterSubject || null)
      } catch (e: unknown) {
        setUploadError(e instanceof Error ? e.message : 'Upload thất bại')
      }
    }
  }, [uploadFile, filterSubject])

  const handleDelete = useCallback(async (id: string, storagePath: string) => {
    if (!confirm('Xóa file này? Không thể hoàn tác!')) return
    await deleteFile(id, storagePath)
  }, [deleteFile])

  const filteredFiles = filterSubject
    ? files.filter(f => f.subject_id === filterSubject)
    : files

  // Tính stats
  const totalSize = files.reduce((sum, f) => sum + (f.size_bytes ?? 0), 0)
  const imageCount = files.filter(f => f.mime_type?.startsWith('image/')).length
  const docCount = files.length - imageCount

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="section-title text-xl">Tài liệu</h2>
          <p className="section-subtitle mt-0.5">
            {files.length} file · {formatFileSize(totalSize)} đã dùng
          </p>
        </div>
        {/* Stats pills */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-medium">
            <Image className="w-3.5 h-3.5" />{imageCount} ảnh
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 text-xs font-medium">
            <FileText className="w-3.5 h-3.5" />{docCount} tài liệu
          </span>
          <button
            onClick={() => setIsChatOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-medium hover:bg-primary-600 transition-colors shadow-sm ml-2"
          >
            <MessageSquareText className="w-4 h-4" /> Hỏi đáp Tài liệu
          </button>
        </div>
      </div>

      {/* Error */}
      {(error || uploadError) && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-danger-50 dark:bg-danger-500/10 border border-danger-200 dark:border-danger-500/30 text-danger-600 dark:text-danger-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {uploadError || error}
          <button onClick={() => setUploadError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload zone */}
      <DocumentUploader onFiles={handleFiles} uploading={uploading} />

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-surface-400 shrink-0" />
        <button
          onClick={() => setFilterSubject('')}
          className={clsx(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
            filterSubject === ''
              ? 'bg-primary-500 text-white'
              : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700',
          )}
        >
          Tất cả
        </button>
        {subjects.map(s => (
          <button
            key={s.id}
            onClick={() => setFilterSubject(s.id === filterSubject ? '' : s.id)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5',
              filterSubject === s.id
                ? 'bg-primary-500 text-white'
                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700',
            )}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: s.color }}
            />
            {s.title}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center py-20 text-surface-400">
          <div className="text-6xl mb-4">📂</div>
          <p className="font-medium">Chưa có file nào</p>
          <p className="text-sm mt-1">Kéo thả hoặc click vùng upload để thêm tài liệu</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredFiles.map(file => (
            <FileCard
              key={file.id}
              file={file}
              onDelete={() => handleDelete(file.id, file.storage_path)}
            />
          ))}
        </div>
      )}

      {isChatOpen && (
        <>
          {/* Backdrop for mobile */}
          <div 
            className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 sm:hidden"
            onClick={() => setIsChatOpen(false)}
          />
          <DocumentChat onClose={() => setIsChatOpen(false)} files={files} />
        </>
      )}
    </div>
  )
}

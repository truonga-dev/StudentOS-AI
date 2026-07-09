import { useState, useRef } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

export interface DocumentUploaderProps {
  onFiles: (files: File[]) => void
  uploading: boolean
  className?: string
}

export function DocumentUploader({
  onFiles,
  uploading,
  className
}: DocumentUploaderProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = Array.from(e.dataTransfer.files)
    if (dropped.length) onFiles(dropped)
  }

  return (
    <div
      onDragEnter={() => setDragging(true)}
      onDragLeave={() => setDragging(false)}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      className={clsx(
        'border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200',
        dragging
          ? 'border-primary-400 bg-primary-50 dark:bg-primary-500/10 scale-[1.01]'
          : 'border-surface-200 dark:border-surface-700 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-surface-50 dark:hover:bg-surface-800/50',
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={e => {
          const fs = Array.from(e.target.files ?? [])
          if (fs.length) onFiles(fs)
          e.target.value = ''
        }}
      />
      {uploading ? (
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
      ) : (
        <div className={clsx(
          'w-14 h-14 rounded-2xl flex items-center justify-center transition-colors',
          dragging ? 'bg-primary-500 text-white' : 'bg-primary-50 dark:bg-primary-500/10 text-primary-500',
        )}>
          <Upload className="w-7 h-7" />
        </div>
      )}
      <div className="text-center">
        <p className="text-sm font-semibold text-surface-700 dark:text-surface-300">
          {uploading ? 'Đang tải lên...' : 'Kéo thả file vào đây'}
        </p>
        <p className="text-xs text-surface-400 mt-1">
          hoặc <span className="text-primary-500 font-medium">click để chọn file</span> · Tối đa 50MB
        </p>
      </div>
    </div>
  )
}

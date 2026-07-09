import { useState, useEffect, useCallback } from 'react'
import * as fileService from '@/services/files'
import type { FileRecord } from '@/types'

export function useFiles(subjectId?: string) {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fileService.getFiles(subjectId)
      setFiles(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lỗi tải file')
    } finally {
      setLoading(false)
    }
  }, [subjectId])

  useEffect(() => { load() }, [load])

  const uploadFile = useCallback(async (file: File, subjId?: string | null) => {
    setUploading(true)
    setError(null)
    try {
      const created = await fileService.uploadFile(file, subjId ?? subjectId)
      setFiles(prev => [created, ...prev])
      return created
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Upload thất bại'
      setError(msg)
      throw e
    } finally {
      setUploading(false)
    }
  }, [subjectId])

  const deleteFile = useCallback(async (id: string, storagePath: string) => {
    // Optimistic remove
    setFiles(prev => prev.filter(f => f.id !== id))
    try {
      await fileService.deleteFile(id, storagePath)
    } catch (e: unknown) {
      // Rollback
      await load()
      setError(e instanceof Error ? e.message : 'Xóa thất bại')
      throw e
    }
  }, [load])

  return {
    files,
    loading,
    uploading,
    error,
    uploadFile,
    deleteFile,
    refresh: load,
  }
}

import { useState, useEffect, useCallback } from 'react'
import * as profileService from '@/services/profiles'
import type { Profile } from '@/types'

export function useLeaderboard(limit = 50) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await profileService.getTopProfiles(limit)
      setProfiles(data)
    } catch (e: any) {
      setError(e.message || 'Lỗi tải bảng xếp hạng')
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    load()
  }, [load])

  return { profiles, loading, error, refresh: load }
}

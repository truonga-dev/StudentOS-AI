import { useState, useEffect } from 'react'
import { getProfile, recordActivity as apiRecordActivity, updateProfile as apiUpdateProfile, uploadAvatar as apiUploadAvatar } from '@/services/profiles'
import type { Profile } from '@/types'
import { supabase } from '@/lib/supabase'

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async () => {
    try {
      const p = await getProfile()
      setProfile(p)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        loadProfile()
      } else {
        setProfile(null)
      }
    })

    loadProfile()

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const addPoints = async (points: number) => {
    try {
      const p = await apiRecordActivity({ pointsToAdd: points })
      setProfile(p)
    } catch (err) {
      console.error(err)
    }
  }

  const addXp = async (xp: number) => {
    try {
      const p = await apiRecordActivity({ xpToAdd: xp })
      setProfile(p)
    } catch (err) {
      console.error(err)
    }
  }

  const recordActivity = async (xpToAdd: number, pointsToAdd: number) => {
    try {
      const p = await apiRecordActivity({ xpToAdd, pointsToAdd })
      setProfile(p)
    } catch (err) {
      console.error(err)
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    const p = await apiUpdateProfile(updates)
    setProfile(p)
    return p
  }

  const uploadAvatar = async (file: File) => {
    const url = await apiUploadAvatar(file)
    const p = await apiUpdateProfile({ avatar_url: url })
    setProfile(p)
    return p
  }

  return {
    profile,
    loading,
    addPoints,
    addXp,
    recordActivity,
    updateProfile,
    uploadAvatar,
    refreshProfile: loadProfile
  }
}

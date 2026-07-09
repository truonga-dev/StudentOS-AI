import { useState, useEffect } from 'react'
import { getProfile, addPointsAndUpdateStreak, updateProfile as apiUpdateProfile, uploadAvatar as apiUploadAvatar, addXp as apiAddXp } from '@/services/profiles'
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
      const p = await addPointsAndUpdateStreak(points)
      setProfile(p)
    } catch (err) {
      console.error(err)
    }
  }

  const addXp = async (xp: number) => {
    try {
      const p = await apiAddXp(xp)
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
    updateProfile,
    uploadAvatar,
    refreshProfile: loadProfile
  }
}

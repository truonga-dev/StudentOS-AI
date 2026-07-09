import { useState, useEffect, useCallback } from 'react'
import * as sessionService from '@/services/studySessions'
import type { StudySession, WeeklyData, CreateSessionInput } from '@/types'

export function useStudySessions() {
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([])
  const [todayMinutes, setTodayMinutes] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [todaySessions, weekly, minutes] = await Promise.all([
        sessionService.getTodaySessions(),
        sessionService.getWeeklyData(),
        sessionService.getTodayMinutes(),
      ])
      setSessions(todaySessions)
      setWeeklyData(weekly)
      setTodayMinutes(minutes)
    } catch (e) {
      console.error('useStudySessions load error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const logSession = useCallback(async (input: CreateSessionInput) => {
    const created = await sessionService.createSession(input)
    setSessions(prev => [created, ...prev])
    // Cập nhật stats
    setTodayMinutes(prev => prev + input.duration_minutes)
    setWeeklyData(prev => {
      const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
      const dayLabel = dayLabels[new Date().getDay()]
      return prev.map(d =>
        d.day === dayLabel
          ? { ...d, hours: Math.round((d.hours + input.duration_minutes / 60) * 10) / 10 }
          : d
      )
    })
    return created
  }, [])

  // Format "2h 35m"
  const formatTodayTime = () => {
    const h = Math.floor(todayMinutes / 60)
    const m = todayMinutes % 60
    if (h === 0) return `${m}m`
    return m === 0 ? `${h}h` : `${h}h ${m}m`
  }

  const totalWeeklyHours = weeklyData.reduce((sum, d) => sum + d.hours, 0)

  return {
    sessions,
    weeklyData,
    todayMinutes,
    todayTimeFormatted: formatTodayTime(),
    totalWeeklyHours: Math.round(totalWeeklyHours * 10) / 10,
    loading,
    logSession,
    refresh: load,
  }
}

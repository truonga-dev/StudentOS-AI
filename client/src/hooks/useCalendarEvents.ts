import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import type { CalendarEvent, CreateEventInput } from '@/types'
import { getEventsForMonth, createEvent, deleteEvent } from '@/services/calendarEvents'

export function useCalendarEvents(year: number, month: number) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const data = await getEventsForMonth(year, month)
      setEvents(data)
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tải sự kiện')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [year, month])

  const addEvent = async (input: CreateEventInput) => {
    try {
      const newEvent = await createEvent(input)
      setEvents(prev => [...prev, newEvent])
      toast.success('Đã thêm sự kiện')
      return newEvent
    } catch (err: any) {
      toast.error(err.message || 'Lỗi thêm sự kiện')
      throw err
    }
  }

  const removeEvent = async (id: string) => {
    try {
      await deleteEvent(id)
      setEvents(prev => prev.filter(e => e.id !== id))
      toast.success('Đã xóa sự kiện')
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xóa sự kiện')
      throw err
    }
  }

  return {
    events,
    loading,
    addEvent,
    removeEvent,
    refresh: fetchEvents,
  }
}

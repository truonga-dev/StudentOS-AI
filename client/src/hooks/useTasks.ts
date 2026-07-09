import { useState, useEffect, useCallback } from 'react'
import * as taskService from '@/services/tasks'
import type { Task, CreateTaskInput, UpdateTaskInput } from '@/types'
import { useProfile } from './useProfile'
import toast from 'react-hot-toast'

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await taskService.getTasks()
      setTasks(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lỗi tải công việc')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const addTask = useCallback(async (input: CreateTaskInput) => {
    const created = await taskService.createTask(input)
    setTasks(prev => [created, ...prev])
    return created
  }, [])

  const { addXp } = useProfile()

  const toggle = useCallback(async (id: string) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
    try {
      const current = tasks.find(t => t.id === id)
      await taskService.toggleTask(id, !current?.completed)
      
      // Nếu task vừa được hoàn thành -> +10 XP
      if (!current?.completed) {
        addXp(10)
        toast.success('+10 XP! Hoàn thành công việc', { icon: '✨' })
      }
    } catch {
      // Rollback nếu lỗi
      setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
    }
  }, [tasks, addXp])

  const editTask = useCallback(async (id: string, input: UpdateTaskInput) => {
    const updated = await taskService.updateTask(id, input)
    setTasks(prev => prev.map(t => t.id === id ? updated : t))
    return updated
  }, [])

  const removeTask = useCallback(async (id: string) => {
    await taskService.deleteTask(id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }, [])

  const completed = tasks.filter(t => t.completed).length

  return { tasks, loading, error, completed, total: tasks.length, addTask, toggle, editTask, removeTask, refresh: load }
}

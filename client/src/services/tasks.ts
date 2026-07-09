import { backendApi } from '@/services/api'
import type { Task, CreateTaskInput, UpdateTaskInput } from '@/types'

// ── Lấy danh sách tasks (kèm tên subject) ────────────────────────────────────
export async function getTasks(): Promise<Task[]> {
  return await backendApi.getTasks() as Task[]
}

// ── Lấy tasks sắp tới (chưa hoàn thành, có due_date) ────────────────────────
export async function getUpcomingTasks(limit = 5): Promise<Task[]> {
  return await backendApi.getUpcoming(limit) as Task[]
}

// ── Tạo task mới ─────────────────────────────────────────────────────────────
export async function createTask(input: CreateTaskInput): Promise<Task> {
  return await backendApi.createTask(input) as Task
}

// ── Toggle complete ───────────────────────────────────────────────────────────
export async function toggleTask(id: string, completed: boolean): Promise<Task> {
  return await backendApi.updateTask(id, { completed }) as Task
}

// ── Cập nhật task ────────────────────────────────────────────────────────────
export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  return await backendApi.updateTask(id, input) as Task
}

// ── Xóa task ─────────────────────────────────────────────────────────────────
export async function deleteTask(id: string): Promise<void> {
  await backendApi.deleteTask(id)
}

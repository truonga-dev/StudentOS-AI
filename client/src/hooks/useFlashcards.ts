import { useState, useEffect } from 'react'
import { getFlashcards, createFlashcard, updateFlashcard, deleteFlashcard, bulkCreateFlashcards } from '@/services/flashcards'
import type { Flashcard, CreateFlashcardInput, UpdateFlashcardInput } from '@/types'
import toast from 'react-hot-toast'

export function useFlashcards() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFlashcards = async () => {
    try {
      setLoading(true)
      const data = await getFlashcards()
      setFlashcards(data)
      setError(null)
    } catch (err: any) {
      setError(err.message)
      toast.error('Lỗi tải danh sách flashcard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFlashcards()
  }, [])

  const addFlashcard = async (input: CreateFlashcardInput) => {
    try {
      const created = await createFlashcard(input)
      setFlashcards([created, ...flashcards])
      toast.success('Đã thêm flashcard')
      return created
    } catch (err: any) {
      toast.error(err.message)
      throw err
    }
  }

  const editFlashcard = async (id: string, input: UpdateFlashcardInput) => {
    try {
      const updated = await updateFlashcard(id, input)
      setFlashcards(flashcards.map(f => f.id === id ? updated : f))
      return updated
    } catch (err: any) {
      toast.error(err.message)
      throw err
    }
  }

  const removeFlashcard = async (id: string) => {
    try {
      await deleteFlashcard(id)
      setFlashcards(flashcards.filter(f => f.id !== id))
      toast.success('Đã xóa flashcard')
    } catch (err: any) {
      toast.error(err.message)
      throw err
    }
  }

  const addMultipleFlashcards = async (inputs: CreateFlashcardInput[]) => {
    try {
      const createdItems = await bulkCreateFlashcards(inputs)
      setFlashcards(prev => [...createdItems, ...prev])
      toast.success(`Đã thêm ${createdItems.length} flashcard`)
      return createdItems
    } catch (err: any) {
      toast.error(err.message)
      throw err
    }
  }

  return {
    flashcards,
    loading,
    error,
    addFlashcard,
    addMultipleFlashcards,
    editFlashcard,
    removeFlashcard,
    refresh: fetchFlashcards
  }
}

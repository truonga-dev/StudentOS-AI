import { useState, useEffect } from 'react'
import { getChats, getChatMessages, createChat, createChatMessage, deleteChat, updateChat } from '@/services/aiChat'
import type { AiChat, AiChatMessage } from '@/types'
import toast from 'react-hot-toast'

export function useAiChat() {
  const [chats, setChats] = useState<AiChat[]>([])
  const [loadingChats, setLoadingChats] = useState(true)

  useEffect(() => {
    fetchChats()
  }, [])

  const fetchChats = async () => {
    try {
      setLoadingChats(true)
      const data = await getChats()
      setChats(data)
    } catch (err: any) {
      toast.error('Lỗi tải danh sách chat: ' + err.message)
    } finally {
      setLoadingChats(false)
    }
  }

  const addChat = async (title: string) => {
    try {
      const chat = await createChat({ title })
      setChats([chat, ...chats])
      return chat
    } catch (err: any) {
      toast.error('Lỗi tạo chat: ' + err.message)
      throw err
    }
  }

  const removeChat = async (id: string) => {
    try {
      await deleteChat(id)
      setChats(chats.filter(c => c.id !== id))
    } catch (err: any) {
      toast.error('Lỗi xóa chat: ' + err.message)
      throw err
    }
  }

  const renameChat = async (id: string, title: string) => {
    try {
      const updatedChat = await updateChat(id, title)
      setChats(chats.map(c => c.id === id ? updatedChat : c))
      return updatedChat
    } catch (err: any) {
      toast.error('Lỗi đổi tên chat: ' + err.message)
      throw err
    }
  }

  return {
    chats,
    loadingChats,
    addChat,
    removeChat,
    renameChat,
    refreshChats: fetchChats
  }
}

import { supabase } from '@/lib/supabase'
import type { AiChat, AiChatMessage, CreateAiChatInput, CreateAiChatMessageInput } from '@/types'

export async function getChats() {
  const { data, error } = await supabase
    .from('ai_chats')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data as AiChat[]
}

export async function getChatMessages(chatId: string) {
  const { data, error } = await supabase
    .from('ai_chat_messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as AiChatMessage[]
}

export async function createChat(input: CreateAiChatInput) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('ai_chats')
    .insert({ ...input, user_id: user.id })
    .select('*')
    .single()

  if (error) throw error
  return data as AiChat
}

export async function createChatMessage(input: CreateAiChatMessageInput) {
  const { data, error } = await supabase
    .from('ai_chat_messages')
    .insert(input)
    .select('*')
    .single()

  if (error) throw error
  return data as AiChatMessage
}

export async function deleteChat(chatId: string) {
  const { error } = await supabase
    .from('ai_chats')
    .delete()
    .eq('id', chatId)

  if (error) throw error
}

export async function updateChat(chatId: string, title: string) {
  const { data, error } = await supabase
    .from('ai_chats')
    .update({ title })
    .eq('id', chatId)
    .select('*')
    .single()

  if (error) throw error
  return data as AiChat
}

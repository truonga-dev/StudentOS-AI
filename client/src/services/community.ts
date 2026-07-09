import { supabase } from '@/lib/supabase'
import type { ChatChannel, CommunityMessage } from '@/types'

export async function getChannels() {
  const { data, error } = await supabase
    .from('chat_channels')
    .select('*, chat_members(user_id, profile:profiles(id, full_name, avatar_url))')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as ChatChannel[]
}

export async function createChannel(name: string, description: string, isGlobal: boolean, logoFile: File | null) {
  const { data: userAuth } = await supabase.auth.getUser()
  if (!userAuth.user) throw new Error('Not logged in')

  let logo_url = null
  if (logoFile) {
    logo_url = await uploadChatAttachment(logoFile)
  }

  const { data, error } = await supabase
    .from('chat_channels')
    .insert([
      { 
        name, 
        description, 
        is_global: isGlobal, 
        logo_url, 
        creator_id: userAuth.user.id 
      }
    ])
    .select()
    .single()

  if (error) throw error
  return data as ChatChannel
}

export async function getMessages(channelId: string, limit = 50, cursor?: string) {
  let query = supabase
    .from('community_messages')
    .select('*, profile:profiles(id, full_name, avatar_url, rank_tier, level)')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data, error } = await query

  if (error) throw error
  return data as CommunityMessage[]
}

export async function sendMessage(channelId: string, content: string, attachments: any[] | null = null, replyTo: string | null = null) {
  const { data: userAuth } = await supabase.auth.getUser()
  if (!userAuth.user) throw new Error('Not logged in')

  const { data, error } = await supabase
    .from('community_messages')
    .insert([{ channel_id: channelId, content, user_id: userAuth.user.id, attachments, reply_to: replyTo }])
    .select('*, profile:profiles(id, full_name, avatar_url, rank_tier, level)')
    .single()

  if (error) throw error
  return data as CommunityMessage
}

export async function pinMessage(messageId: string, isPinned: boolean) {
  const { data, error } = await supabase
    .from('community_messages')
    .update({ is_pinned: isPinned })
    .eq('id', messageId)
    .select()
    .single()
  
  if (error) throw error
  return data as CommunityMessage
}

export async function updateMessage(messageId: string, content: string) {
  const { data, error } = await supabase
    .from('community_messages')
    .update({ content, is_edited: true })
    .eq('id', messageId)

  if (error) throw error
  return data
}

export async function unsendMessage(messageId: string) {
  const { data, error } = await supabase
    .from('community_messages')
    .update({ is_deleted: true, content: '', attachments: null })
    .eq('id', messageId)

  if (error) throw error
  return data
}

export async function deleteMessageForMe(messageId: string, currentDeletedForUsers: string[], userId: string) {
  const newArr = [...(currentDeletedForUsers || []), userId]
  const { data, error } = await supabase
    .from('community_messages')
    .update({ deleted_for_users: newArr })
    .eq('id', messageId)

  if (error) throw error
  return data
}

export async function submitReport(reported_user_id: string | null, message_id: string | null, reason: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('reports')
    .insert([{
      reporter_id: user.id,
      reported_user_id,
      message_id,
      reason
    }])

  if (error) throw error
  return data
}

export async function updateChannel(channelId: string, name: string, description: string, logoUrl: string | null) {
  const payload: any = { name, description }
  if (logoUrl !== undefined) payload.logo_url = logoUrl

  const { data, error } = await supabase
    .from('chat_channels')
    .update(payload)
    .eq('id', channelId)

  if (error) throw error
  return data
}

export async function deleteChannel(channelId: string) {
  const { data, error } = await supabase
    .from('chat_channels')
    .delete()
    .eq('id', channelId)

  if (error) throw error
  return data
}

export async function uploadChatAttachment(file: File): Promise<string> {
  const { data: userAuth } = await supabase.auth.getUser()
  if (!userAuth.user) throw new Error('Not logged in')

  const BUCKET = import.meta.env.VITE_STORAGE_BUCKET ?? 'student-files'
  const ext = file.name.split('.').pop() ?? 'png'
  const storagePath = `${userAuth.user.id}/chat/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { upsert: true })

  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  return urlData.publicUrl
}

export async function getMembers(channelId: string) {
  const { data, error } = await supabase
    .from('chat_members')
    .select('*, profile:profiles(id, full_name, avatar_url, rank_tier, level)')
    .eq('channel_id', channelId)
    .order('joined_at', { ascending: true })

  if (error) throw error
  return data
}

export async function kickMember(channelId: string, userId: string) {
  const { error } = await supabase
    .from('chat_members')
    .delete()
    .eq('channel_id', channelId)
    .eq('user_id', userId)

  if (error) throw error
}

export async function addMember(channelId: string, userId: string) {
  const { error } = await supabase
    .from('chat_members')
    .insert([{ channel_id: channelId, user_id: userId, role: 'member' }])

  if (error) throw error
}

export async function toggleMessageReaction(messageId: string, emoji: string) {
  const { error } = await supabase.rpc('toggle_message_reaction', {
    msg_id: messageId,
    emoji_char: emoji
  })

  if (error) throw error
}

import { supabase } from '@/lib/supabase'
import type { Friendship, Profile } from '@/types'

// Send friend request
export async function sendFriendRequest(userId2: string) {
  const { data: userAuth } = await supabase.auth.getUser()
  if (!userAuth.user) throw new Error('Not logged in')

  const userId1 = userAuth.user.id

  const { data, error } = await supabase
    .from('friendships')
    .insert([
      { user_id_1: userId1, user_id_2: userId2, status: 'pending' }
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

// Accept friend request
export async function acceptFriendRequest(friendshipId: string) {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', friendshipId)

  if (error) throw error
}

// Cancel or Unfriend or Reject
export async function deleteFriendship(friendshipId: string) {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId)

  if (error) throw error
}

// Get friendship status between current user and target user
export async function getFriendshipStatus(targetUserId: string) {
  const { data: userAuth } = await supabase.auth.getUser()
  if (!userAuth.user) return null

  const myId = userAuth.user.id

  // Could be either me sending to them or them sending to me
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .or(`and(user_id_1.eq.${myId},user_id_2.eq.${targetUserId}),and(user_id_1.eq.${targetUserId},user_id_2.eq.${myId})`)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') throw error
  return data as Friendship | null
}

export async function getFriends() {
  const { data: userAuth } = await supabase.auth.getUser()
  if (!userAuth.user) throw new Error('Not logged in')

  const myId = userAuth.user.id

  // Fetch all accepted friendships where current user is involved
  const { data, error } = await supabase
    .from('friendships')
    .select('*, user1:profiles!friendships_user_id_1_fkey(*), user2:profiles!friendships_user_id_2_fkey(*)')
    .eq('status', 'accepted')
    .or(`user_id_1.eq.${myId},user_id_2.eq.${myId}`)

  if (error) throw error

  // Format the result to return the profile of the friend (not us)
  return data.map((f: any) => {
    return f.user_id_1 === myId ? f.user2 : f.user1
  })
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data as Profile
}

export async function updateProfile(updates: Partial<Profile>) {
  const { data: userAuth } = await supabase.auth.getUser()
  if (!userAuth.user) throw new Error('Not logged in')

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userAuth.user.id)
    .select()
    .single()

  if (error) throw error
  return data as Profile
}

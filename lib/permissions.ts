import { supabase } from '@/lib/supabase'

/**
 * Resolves which user_id to use for fetching data in a given section.
 * - Admin → own userId
 * - User with permission → admin's userId (sees admin's data)
 * - No permission → null
 */
export async function resolveDataUserId(requestingUserId: string, section: string): Promise<string | null> {
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', requestingUserId)
    .single()

  if (!user) return null
  if (user.role === 'admin') return requestingUserId

  const { data: perm } = await supabase
    .from('user_permissions')
    .select('id')
    .eq('user_id', requestingUserId)
    .eq('section', section)
    .single()

  if (!perm) return null

  const { data: admin } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'admin')
    .single()

  return admin?.id ?? null
}

export async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase.from('users').select('role').eq('id', userId).single()
  return data?.role === 'admin'
}

import { supabase } from '@/lib/supabase'

export async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase.from('users').select('role').eq('id', userId).single()
  return data?.role === 'admin'
}

/**
 * Returns true if the user is admin or has explicit permission for the section.
 */
export async function hasPermission(userId: string, section: string): Promise<boolean> {
  const { data: user } = await supabase.from('users').select('role').eq('id', userId).single()
  if (!user) return false
  if (user.role === 'admin') return true

  const { data: perm } = await supabase
    .from('user_permissions')
    .select('id')
    .eq('user_id', userId)
    .eq('section', section)
    .single()

  return !!perm
}

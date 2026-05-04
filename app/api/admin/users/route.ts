import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/jwt'
import { isAdmin } from '@/lib/permissions'

async function getUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    if (!token) return null
    return verifyToken(token).userId
  } catch {
    return null
  }
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) return Response.json({ error: 'Não autorizado' }, { status: 401 })
  if (!(await isAdmin(userId))) return Response.json({ error: 'Acesso negado' }, { status: 403 })

  const { data: users } = await supabase
    .from('users')
    .select('id, name, email, created_at')
    .eq('role', 'user')
    .order('created_at', { ascending: false })

  if (!users) return Response.json({ users: [] })

  const { data: perms } = await supabase
    .from('user_permissions')
    .select('user_id, section')

  const result = users.map(u => ({
    ...u,
    permissions: perms?.filter(p => p.user_id === u.id).map(p => p.section) ?? [],
  }))

  return Response.json({ users: result })
}

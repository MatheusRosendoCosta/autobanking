import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/jwt'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    if (!token) return Response.json({ error: 'Não autorizado' }, { status: 401 })

    const { userId } = verifyToken(token)

    const { data: user } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('id', userId)
      .single()

    if (!user) return Response.json({ error: 'Usuário não encontrado' }, { status: 404 })

    let permissions: string[] = []
    if (user.role !== 'admin') {
      const { data: perms } = await supabase
        .from('user_permissions')
        .select('section')
        .eq('user_id', userId)
      permissions = perms?.map((p: { section: string }) => p.section) ?? []
    }

    return Response.json({ user: { ...user, permissions } })
  } catch {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }
}

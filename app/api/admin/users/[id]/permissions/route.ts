import { NextRequest } from 'next/server'
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

const VALID_SECTIONS = ['cobranca', 'administrativo']

// Replace all permissions for a user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId()
  if (!userId) return Response.json({ error: 'Não autorizado' }, { status: 401 })
  if (!(await isAdmin(userId))) return Response.json({ error: 'Acesso negado' }, { status: 403 })

  const { id: targetUserId } = await params
  const { sections } = await request.json() as { sections: string[] }

  const validSections = (sections ?? []).filter(s => VALID_SECTIONS.includes(s))

  // Delete existing permissions and reinsert
  await supabase.from('user_permissions').delete().eq('user_id', targetUserId)

  if (validSections.length > 0) {
    const rows = validSections.map(section => ({ user_id: targetUserId, section }))
    const { error } = await supabase.from('user_permissions').insert(rows)
    if (error) return Response.json({ error: 'Erro ao salvar permissões.' }, { status: 500 })
  }

  return Response.json({ permissions: validSections })
}

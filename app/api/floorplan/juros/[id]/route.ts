import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/jwt'
import { hasPermission } from '@/lib/permissions'

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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId()
  if (!userId) return Response.json({ error: 'Não autorizado' }, { status: 401 })
  if (!(await hasPermission(userId, 'floorplan'))) return Response.json({ error: 'Acesso negado' }, { status: 403 })

  const { id } = await params

  const { data: boletos } = await supabase
    .from('juros_boletos')
    .select('bucket_path')
    .eq('card_id', id)

  if (boletos && boletos.length > 0) {
    await supabase.storage.from('floorplan-juros').remove(boletos.map(b => b.bucket_path))
  }

  const { error } = await supabase.from('juros_cards').delete().eq('id', id)
  if (error) return Response.json({ error: 'Erro ao deletar card.' }, { status: 500 })

  return Response.json({ ok: true })
}

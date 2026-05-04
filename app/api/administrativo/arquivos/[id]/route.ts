import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/jwt'

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

  const { id } = await params

  const { data: arquivo } = await supabase
    .from('administrativo_arquivos')
    .select('id, bucket_path, card_id, administrativo_cards!inner(user_id)')
    .eq('id', id)
    .single()

  if (!arquivo) return Response.json({ error: 'Arquivo não encontrado.' }, { status: 404 })

  const card = (arquivo.administrativo_cards as unknown as { user_id: string } | null)
  if (!card || card.user_id !== userId) {
    return Response.json({ error: 'Não autorizado.' }, { status: 403 })
  }

  await supabase.storage.from('administrativo').remove([arquivo.bucket_path])

  const { error } = await supabase.from('administrativo_arquivos').delete().eq('id', id)
  if (error) return Response.json({ error: 'Erro ao deletar arquivo.' }, { status: 500 })

  return Response.json({ ok: true })
}

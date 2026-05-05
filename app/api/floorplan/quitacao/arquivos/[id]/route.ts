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

  const { data: arquivo } = await supabase
    .from('quitacao_arquivos')
    .select('id, bucket_path')
    .eq('id', id)
    .single()

  if (!arquivo) return Response.json({ error: 'Arquivo não encontrado.' }, { status: 404 })

  await supabase.storage.from('floorplan-quitacao').remove([arquivo.bucket_path])

  const { error } = await supabase.from('quitacao_arquivos').delete().eq('id', id)
  if (error) return Response.json({ error: 'Erro ao deletar arquivo.' }, { status: 500 })
  return Response.json({ ok: true })
}

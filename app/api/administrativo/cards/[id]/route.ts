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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId()
  if (!userId) return Response.json({ error: 'Não autorizado' }, { status: 401 })
  if (!(await hasPermission(userId, 'administrativo'))) return Response.json({ error: 'Acesso negado' }, { status: 403 })

  const { id } = await params
  const body = await request.json() as { enviado_carne?: boolean }

  const { data: updated, error } = await supabase
    .from('administrativo_cards')
    .update({ enviado_carne: body.enviado_carne ?? false })
    .eq('id', id)
    .select('*, arquivos:administrativo_arquivos(*)')
    .single()

  if (error) return Response.json({ error: 'Erro ao atualizar card.' }, { status: 500 })

  return Response.json({ card: updated })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId()
  if (!userId) return Response.json({ error: 'Não autorizado' }, { status: 401 })
  if (!(await hasPermission(userId, 'administrativo'))) return Response.json({ error: 'Acesso negado' }, { status: 403 })

  const { id } = await params

  const { data: arquivos } = await supabase
    .from('administrativo_arquivos')
    .select('bucket_path')
    .eq('card_id', id)

  if (arquivos && arquivos.length > 0) {
    const paths = arquivos.map((a: { bucket_path: string }) => a.bucket_path)
    await supabase.storage.from('administrativo').remove(paths)
  }

  const { error } = await supabase
    .from('administrativo_cards')
    .delete()
    .eq('id', id)

  if (error) return Response.json({ error: 'Erro ao deletar card.' }, { status: 500 })

  return Response.json({ ok: true })
}

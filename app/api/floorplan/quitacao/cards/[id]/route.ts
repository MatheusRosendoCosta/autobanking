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
  if (!(await hasPermission(userId, 'floorplan'))) return Response.json({ error: 'Acesso negado' }, { status: 403 })

  const { id } = await params
  const body = await request.json() as { observacao?: string; nome?: string }

  const updates: Record<string, string> = {}
  if (body.observacao !== undefined) updates.observacao = body.observacao
  if (body.nome !== undefined) {
    if (!body.nome.trim()) return Response.json({ error: 'Nome não pode ser vazio.' }, { status: 400 })
    updates.nome = body.nome.trim()
  }

  const { data, error } = await supabase
    .from('quitacao_cards')
    .update(updates)
    .eq('id', id)
    .select('id, observacao, nome')
    .single()

  if (error) return Response.json({ error: 'Erro ao atualizar.' }, { status: 500 })
  return Response.json({ card: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId()
  if (!userId) return Response.json({ error: 'Não autorizado' }, { status: 401 })
  if (!(await hasPermission(userId, 'floorplan'))) return Response.json({ error: 'Acesso negado' }, { status: 403 })

  const { id } = await params

  const { data: arquivos } = await supabase
    .from('quitacao_arquivos')
    .select('bucket_path')
    .eq('card_id', id)

  if (arquivos && arquivos.length > 0) {
    await supabase.storage.from('floorplan-quitacao').remove(arquivos.map((a: { bucket_path: string }) => a.bucket_path))
  }

  const { error } = await supabase.from('quitacao_cards').delete().eq('id', id)
  if (error) return Response.json({ error: 'Erro ao deletar.' }, { status: 500 })
  return Response.json({ ok: true })
}

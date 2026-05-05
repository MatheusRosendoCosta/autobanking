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

const VALID_STATUS = [
  'aguardando_assinatura',
  'aguardando_pagamento',
  'pendente',
  'aguardando_documentos',
  'conciliacao_appsheet',
  'finalizado',
  'pago',
]

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId()
  if (!userId) return Response.json({ error: 'Não autorizado' }, { status: 401 })
  if (!(await hasPermission(userId, 'floorplan'))) return Response.json({ error: 'Acesso negado' }, { status: 403 })

  const { id } = await params
  const body = await request.json() as { status?: string; observacao?: string; nome?: string }

  const updates: Record<string, string> = {}
  if (body.status !== undefined) {
    if (!VALID_STATUS.includes(body.status)) return Response.json({ error: 'Status inválido.' }, { status: 400 })
    updates.status = body.status
  }
  if (body.observacao !== undefined) updates.observacao = body.observacao
  if (body.nome !== undefined) {
    if (!body.nome.trim()) return Response.json({ error: 'Nome não pode ser vazio.' }, { status: 400 })
    updates.nome = body.nome.trim()
  }

  const { data, error } = await supabase
    .from('propostas_cards')
    .update(updates)
    .eq('id', id)
    .select('id, status, observacao, nome')
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
    .from('propostas_arquivos')
    .select('bucket_path')
    .eq('card_id', id)

  if (arquivos && arquivos.length > 0) {
    await supabase.storage.from('floorplan-propostas').remove(arquivos.map(a => a.bucket_path))
  }

  const { error } = await supabase.from('propostas_cards').delete().eq('id', id)
  if (error) return Response.json({ error: 'Erro ao deletar proposta.' }, { status: 500 })

  return Response.json({ ok: true })
}

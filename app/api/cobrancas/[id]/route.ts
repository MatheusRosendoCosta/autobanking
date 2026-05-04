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
  if (!(await hasPermission(userId, 'cobranca'))) return Response.json({ error: 'Acesso negado' }, { status: 403 })

  const { id } = await params
  const { observacao } = (await request.json()) as { observacao?: string }

  const { error } = await supabase
    .from('cobrancas')
    .update({ observacao: observacao?.trim() ?? '' })
    .eq('id', id)

  if (error) return Response.json({ error: 'Erro ao atualizar' }, { status: 500 })

  return Response.json({ message: 'Atualizado.' })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId()
  if (!userId) return Response.json({ error: 'Não autorizado' }, { status: 401 })
  if (!(await hasPermission(userId, 'cobranca'))) return Response.json({ error: 'Acesso negado' }, { status: 403 })

  const { id } = await params

  const { error } = await supabase
    .from('cobrancas')
    .delete()
    .eq('id', id)

  if (error) return Response.json({ error: 'Erro ao excluir' }, { status: 500 })

  return Response.json({ message: 'Cobrança excluída.' })
}

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

async function verifyEmpresaOwnership(empresaId: string, userId: string) {
  const { data } = await supabase
    .from('empresas')
    .select('id')
    .eq('id', empresaId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId()
  if (!userId) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id: empresaId } = await params

  if (!(await verifyEmpresaOwnership(empresaId, userId)))
    return Response.json({ error: 'Empresa não encontrada' }, { status: 404 })

  const { data, error } = await supabase
    .from('lojas')
    .select('id, nome')
    .eq('empresa_id', empresaId)
    .order('nome')

  if (error) return Response.json({ error: 'Erro ao buscar lojas' }, { status: 500 })

  return Response.json({ lojas: data })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId()
  if (!userId) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id: empresaId } = await params

  if (!(await verifyEmpresaOwnership(empresaId, userId)))
    return Response.json({ error: 'Empresa não encontrada' }, { status: 404 })

  const { nome } = (await request.json()) as { nome?: string }
  if (!nome?.trim()) return Response.json({ error: 'Nome é obrigatório' }, { status: 400 })

  const { data, error } = await supabase
    .from('lojas')
    .insert({ empresa_id: empresaId, nome: nome.trim() })
    .select('id, nome')
    .single()

  if (error) {
    if (error.code === '23505')
      return Response.json({ error: 'Loja já existe nesta empresa' }, { status: 409 })
    return Response.json({ error: 'Erro ao criar loja' }, { status: 500 })
  }

  return Response.json({ loja: data }, { status: 201 })
}

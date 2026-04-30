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

export async function GET() {
  const userId = await getUserId()
  if (!userId) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('empresas')
    .select('id, nome')
    .eq('user_id', userId)
    .order('nome')

  if (error) return Response.json({ error: 'Erro ao buscar empresas' }, { status: 500 })

  return Response.json({ empresas: data })
}

export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { nome } = (await request.json()) as { nome?: string }
  if (!nome?.trim()) return Response.json({ error: 'Nome é obrigatório' }, { status: 400 })

  const { data, error } = await supabase
    .from('empresas')
    .insert({ user_id: userId, nome: nome.trim() })
    .select('id, nome')
    .single()

  if (error) {
    if (error.code === '23505') return Response.json({ error: 'Empresa já existe' }, { status: 409 })
    return Response.json({ error: 'Erro ao criar empresa' }, { status: 500 })
  }

  return Response.json({ empresa: data }, { status: 201 })
}

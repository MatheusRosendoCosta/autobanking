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

export async function GET(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) return Response.json({ error: 'Não autorizado' }, { status: 401 })
  if (!(await hasPermission(userId, 'floorplan'))) return Response.json({ error: 'Acesso negado' }, { status: 403 })

  const tipo = new URL(request.url).searchParams.get('tipo')

  const { data, error } = await supabase
    .from('quitacao_cards')
    .select('*, arquivos:quitacao_arquivos(*)')
    .eq('tipo', tipo === 'substituicao' ? 'substituicao' : 'quitacao')
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: 'Erro ao buscar cards.' }, { status: 500 })
  return Response.json({ cards: data })
}

export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) return Response.json({ error: 'Não autorizado' }, { status: 401 })
  if (!(await hasPermission(userId, 'floorplan'))) return Response.json({ error: 'Acesso negado' }, { status: 403 })

  const { tipo, nome } = await request.json() as { tipo?: string; nome?: string }

  if (!tipo || !['quitacao', 'substituicao'].includes(tipo)) {
    return Response.json({ error: 'Tipo inválido.' }, { status: 400 })
  }
  if (!nome?.trim()) {
    return Response.json({ error: 'Nome é obrigatório.' }, { status: 400 })
  }

  const defaultStatus = tipo === 'quitacao' ? 'aguardando_pagamento' : 'aguardando_assinatura'

  const { data: card, error } = await supabase
    .from('quitacao_cards')
    .insert({ user_id: userId, tipo, nome: nome.trim(), status: defaultStatus })
    .select('*, arquivos:quitacao_arquivos(*)')
    .single()

  if (error) return Response.json({ error: 'Erro ao criar card.' }, { status: 500 })
  return Response.json({ card }, { status: 201 })
}

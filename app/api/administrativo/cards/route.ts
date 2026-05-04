import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/jwt'
import { resolveDataUserId } from '@/lib/permissions'

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

  const dataUserId = await resolveDataUserId(userId, 'administrativo')
  if (!dataUserId) return Response.json({ error: 'Acesso negado' }, { status: 403 })

  const { data, error } = await supabase
    .from('administrativo_cards')
    .select('*, arquivos:administrativo_arquivos(*)')
    .eq('user_id', dataUserId)
    .order('data', { ascending: false })

  if (error) return Response.json({ error: 'Erro ao buscar cards.' }, { status: 500 })

  return Response.json({ cards: data })
}

export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { data: dataStr } = await request.json() as { data?: string }

    if (!dataStr) {
      return Response.json({ error: 'Data é obrigatória.' }, { status: 400 })
    }

    const { data: card, error } = await supabase
      .from('administrativo_cards')
      .insert({ user_id: userId, data: dataStr })
      .select('*, arquivos:administrativo_arquivos(*)')
      .single()

    if (error) throw error

    return Response.json({ card }, { status: 201 })
  } catch (err) {
    console.error('[administrativo/cards POST]', err)
    return Response.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 })
  }
}

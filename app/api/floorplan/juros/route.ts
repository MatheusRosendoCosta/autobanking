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

export async function GET() {
  const userId = await getUserId()
  if (!userId) return Response.json({ error: 'Não autorizado' }, { status: 401 })
  if (!(await hasPermission(userId, 'floorplan'))) return Response.json({ error: 'Acesso negado' }, { status: 403 })

  const { data, error } = await supabase
    .from('juros_cards')
    .select('*, boletos:juros_boletos(*)')
    .order('mes', { ascending: false })

  if (error) return Response.json({ error: 'Erro ao buscar cards.' }, { status: 500 })
  return Response.json({ cards: data })
}

export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) return Response.json({ error: 'Não autorizado' }, { status: 401 })
  if (!(await hasPermission(userId, 'floorplan'))) return Response.json({ error: 'Acesso negado' }, { status: 403 })

  try {
    const { mes } = await request.json() as { mes?: string }
    if (!mes) return Response.json({ error: 'Mês é obrigatório.' }, { status: 400 })

    const { data: card, error } = await supabase
      .from('juros_cards')
      .insert({ user_id: userId, mes })
      .select('*, boletos:juros_boletos(*)')
      .single()

    if (error) throw error
    return Response.json({ card }, { status: 201 })
  } catch (err) {
    console.error('[floorplan/juros POST]', err)
    return Response.json({ error: 'Erro interno.' }, { status: 500 })
  }
}

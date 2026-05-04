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
    .from('substituicoes')
    .select('*, arquivos:substituicao_arquivos(*)')
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ substituicoes: data ?? [] })
}

export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json() as { placas_saindo?: string[]; placas_entrando?: string[] }
  const { placas_saindo, placas_entrando } = body

  if (!placas_saindo?.length || !placas_entrando?.length) {
    return Response.json({ error: 'Placas são obrigatórias.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('substituicoes')
    .insert({ user_id: userId, placas_saindo, placas_entrando, status: 'documentos_pendentes' })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ substituicao: data }, { status: 201 })
}

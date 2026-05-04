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
  if (!(await hasPermission(userId, 'cobranca'))) return Response.json({ error: 'Acesso negado' }, { status: 403 })

  const { data, error } = await supabase
    .from('cobrancas')
    .select('*, empresa:empresa_id(id, nome), loja:loja_id(id, nome)')
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: 'Erro ao buscar cobranças' }, { status: 500 })

  return Response.json({ cobrancas: data })
}

export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) return Response.json({ error: 'Não autorizado' }, { status: 401 })
  if (!(await hasPermission(userId, 'cobranca'))) return Response.json({ error: 'Acesso negado' }, { status: 403 })

  try {
    const body = await request.json()
    const { cliente, empresa_id, loja_id, vendedor, observacao } = body as {
      cliente?: string
      empresa_id?: string
      loja_id?: string
      vendedor?: string
      observacao?: string
    }

    if (!cliente?.trim() || !empresa_id || !loja_id || !vendedor?.trim()) {
      return Response.json(
        { error: 'Cliente, Empresa, Loja e Vendedor são obrigatórios' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('cobrancas')
      .insert({
        user_id: userId,
        cliente: cliente.trim(),
        empresa_id,
        loja_id,
        vendedor: vendedor.trim(),
        observacao: observacao?.trim() ?? '',
      })
      .select('*, empresa:empresa_id(id, nome), loja:loja_id(id, nome)')
      .single()

    if (error) throw error

    return Response.json({ cobranca: data }, { status: 201 })
  } catch (err) {
    console.error('[cobrancas POST]', err)
    return Response.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 })
  }
}

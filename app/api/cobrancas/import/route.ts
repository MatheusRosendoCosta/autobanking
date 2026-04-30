import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/jwt'

interface ImportRow {
  cliente: string
  empresa: string
  loja: string
  vendedor: string
  observacao: string
}

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

export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { rows } = (await request.json()) as { rows: ImportRow[] }

  if (!Array.isArray(rows) || rows.length === 0)
    return Response.json({ error: 'Nenhuma linha para importar' }, { status: 400 })

  let imported = 0
  const errors: string[] = []

  const empresaCache = new Map<string, string>()
  const lojaCache = new Map<string, string>()

  for (const [i, row] of rows.entries()) {
    const lineNum = i + 2
    try {
      const empresaNome = row.empresa.trim()
      const lojaNome = row.loja.trim()

      // Find or create empresa
      const empresaKey = empresaNome.toLowerCase()
      let empresaId = empresaCache.get(empresaKey)
      if (!empresaId) {
        const { data: existing } = await supabase
          .from('empresas')
          .select('id')
          .eq('user_id', userId)
          .ilike('nome', empresaNome)
          .maybeSingle()

        if (existing) {
          empresaId = existing.id
        } else {
          const { data: created, error } = await supabase
            .from('empresas')
            .insert({ user_id: userId, nome: empresaNome })
            .select('id')
            .single()
          if (error) throw new Error(`empresa "${empresaNome}": ${error.message}`)
          empresaId = created.id
        }
        empresaCache.set(empresaKey, empresaId)
      }

      // Find or create loja
      const lojaKey = `${empresaId}:${lojaNome.toLowerCase()}`
      let lojaId = lojaCache.get(lojaKey)
      if (!lojaId) {
        const { data: existing } = await supabase
          .from('lojas')
          .select('id')
          .eq('empresa_id', empresaId)
          .ilike('nome', lojaNome)
          .maybeSingle()

        if (existing) {
          lojaId = existing.id
        } else {
          const { data: created, error } = await supabase
            .from('lojas')
            .insert({ empresa_id: empresaId, nome: lojaNome })
            .select('id')
            .single()
          if (error) throw new Error(`loja "${lojaNome}": ${error.message}`)
          lojaId = created.id
        }
        lojaCache.set(lojaKey, lojaId)
      }

      const { error: insertError } = await supabase.from('cobrancas').insert({
        user_id: userId,
        cliente: row.cliente.trim(),
        empresa_id: empresaId,
        loja_id: lojaId,
        vendedor: row.vendedor.trim(),
        observacao: row.observacao?.trim() ?? '',
      })
      if (insertError) throw new Error(insertError.message)

      imported++
    } catch (err) {
      errors.push(`Linha ${lineNum}: ${err instanceof Error ? err.message : 'erro desconhecido'}`)
    }
  }

  return Response.json({ imported, errors })
}

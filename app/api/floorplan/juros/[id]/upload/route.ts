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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId()
  if (!userId) return Response.json({ error: 'Não autorizado' }, { status: 401 })
  if (!(await hasPermission(userId, 'floorplan'))) return Response.json({ error: 'Acesso negado' }, { status: 403 })

  const { id } = await params

  const { data: card } = await supabase
    .from('juros_cards')
    .select('id')
    .eq('id', id)
    .single()

  if (!card) return Response.json({ error: 'Card não encontrado.' }, { status: 404 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const loja = (formData.get('loja') as string | null)?.trim()

  if (!file || !loja) return Response.json({ error: 'Arquivo e loja são obrigatórios.' }, { status: 400 })
  if (file.type !== 'application/pdf') return Response.json({ error: 'Somente PDF.' }, { status: 400 })
  if (file.size > 20 * 1024 * 1024) return Response.json({ error: 'Máximo 20MB.' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const bucketPath = `${id}/${Date.now()}_${safeName}`

  await supabase.storage.createBucket('floorplan-juros', { public: false }).catch(() => {})

  const { error: uploadError } = await supabase.storage
    .from('floorplan-juros')
    .upload(bucketPath, buffer, { contentType: 'application/pdf', upsert: true })

  if (uploadError) return Response.json({ error: uploadError.message }, { status: 500 })

  const { data: boleto, error: dbError } = await supabase
    .from('juros_boletos')
    .insert({ card_id: id, loja, nome: file.name, bucket_path: bucketPath, tamanho: file.size })
    .select()
    .single()

  if (dbError) return Response.json({ error: dbError.message }, { status: 500 })

  return Response.json({ boleto }, { status: 201 })
}

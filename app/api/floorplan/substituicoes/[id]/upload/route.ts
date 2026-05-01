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

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const TIPOS_VALIDOS = [
  'documento_veiculo',
  'laudo_cautelar',
  'ccb',
  'aditamento_template',
  'comprovante',
]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId()
  if (!userId) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params

  const { data: sub } = await supabase
    .from('substituicoes')
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (!sub) return Response.json({ error: 'Substituição não encontrada.' }, { status: 404 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const tipo = formData.get('tipo') as string | null

  if (!file || !tipo) {
    return Response.json({ error: 'Arquivo e tipo são obrigatórios.' }, { status: 400 })
  }

  if (!TIPOS_VALIDOS.includes(tipo)) {
    return Response.json({ error: 'Tipo de documento inválido.' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ error: 'Formato não suportado. Use PDF, JPG, PNG ou DOCX.' }, { status: 400 })
  }

  if (file.size > 15 * 1024 * 1024) {
    return Response.json({ error: 'Arquivo muito grande. Máximo 15MB.' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const bucketPath = `${id}/${tipo}/${Date.now()}_${safeName}`

  await supabase.storage.createBucket('floorplan', { public: false }).catch(() => {})

  const { error: uploadError } = await supabase.storage
    .from('floorplan')
    .upload(bucketPath, buffer, { contentType: file.type, upsert: true })

  if (uploadError) return Response.json({ error: uploadError.message }, { status: 500 })

  const { data: arquivo, error: dbError } = await supabase
    .from('substituicao_arquivos')
    .insert({ substituicao_id: id, tipo, nome: file.name, bucket_path: bucketPath, tamanho: file.size })
    .select()
    .single()

  if (dbError) return Response.json({ error: dbError.message }, { status: 500 })
  return Response.json({ arquivo }, { status: 201 })
}

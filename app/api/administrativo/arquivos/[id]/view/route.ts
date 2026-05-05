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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId()
  if (!userId) return Response.json({ error: 'Não autorizado' }, { status: 401 })
  if (!(await hasPermission(userId, 'administrativo'))) return Response.json({ error: 'Acesso negado' }, { status: 403 })

  const { id } = await params

  const { data: arquivo } = await supabase
    .from('administrativo_arquivos')
    .select('bucket_path, nome')
    .eq('id', id)
    .single()

  if (!arquivo) return Response.json({ error: 'Arquivo não encontrado.' }, { status: 404 })

  const { data, error } = await supabase.storage
    .from('administrativo')
    .createSignedUrl(arquivo.bucket_path, 60 * 5) // 5 min

  if (error || !data) return Response.json({ error: 'Erro ao gerar URL.' }, { status: 500 })

  return Response.json({ url: data.signedUrl, nome: arquivo.nome })
}

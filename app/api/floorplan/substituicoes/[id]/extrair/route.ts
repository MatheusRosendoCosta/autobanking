import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/jwt'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
const IMAGE_TYPES: ImageMediaType[] = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

function buildBlock(base64: string, contentType: string) {
  const mime = contentType as ImageMediaType
  if (IMAGE_TYPES.includes(mime)) {
    return { type: 'image' as const, source: { type: 'base64' as const, media_type: mime, data: base64 } }
  }
  return {
    type: 'document' as const,
    source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: base64 },
  }
}

async function downloadBase64(bucketPath: string, nome: string) {
  const { data: blob, error } = await supabase.storage.from('floorplan').download(bucketPath)
  if (error || !blob) return null
  const buf = Buffer.from(await blob.arrayBuffer())
  const contentType = blob.type || (nome.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')
  return { base64: buf.toString('base64'), contentType }
}

function parseJsonFromText(text: string): Record<string, string> {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const match = trimmed.match(/\{[\s\S]*?\}/)
    if (match) {
      try { return JSON.parse(match[0]) } catch { /* fall through */ }
    }
    return {}
  }
}

async function extractCRLV(base64: string, contentType: string): Promise<Record<string, string>> {
  const block = buildBlock(base64, contentType)
  const prompt = `Leia este CRLV e retorne SOMENTE este JSON, sem texto adicional:
{"placa":"","chassi":"","renavam":"","ano_fabricacao":"","ano_modelo":"","cor":""}
Preencha cada campo com o valor encontrado. Campos ausentes: string vazia.`

  const res = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 512,
    messages: [{ role: 'user', content: [block, { type: 'text', text: prompt }] }],
  })

  const text = res.content[0].type === 'text' ? res.content[0].text : '{}'
  return parseJsonFromText(text)
}

async function extractCCB(base64: string, contentType: string): Promise<Record<string, string>> {
  const block = buildBlock(base64, contentType)
  const prompt = `Leia esta CCB e retorne SOMENTE este JSON, sem texto adicional:
{"numero":"","razao_social_lojista":"","data_emissao":"","valor_credito":"","veiculo_tipo":"","veiculo_placa":"","veiculo_chassi":"","veiculo_renavam":"","veiculo_cor":""}
Preencha cada campo com o valor encontrado. Campos ausentes: string vazia.`

  const res = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 512,
    messages: [{ role: 'user', content: [block, { type: 'text', text: prompt }] }],
  })

  const text = res.content[0].type === 'text' ? res.content[0].text : '{}'
  return parseJsonFromText(text)
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId()
  if (!userId) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params

  const { data: sub } = await supabase
    .from('substituicoes')
    .select('*, arquivos:substituicao_arquivos(*)')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (!sub) return Response.json({ error: 'Substituição não encontrada.' }, { status: 404 })

  type ArqRow = { tipo: string; bucket_path: string; nome: string }
  const arquivos = sub.arquivos as ArqRow[]

  const crlvArq = arquivos.find(a => a.tipo === 'documento_veiculo')
  const ccbArq  = arquivos.find(a => a.tipo === 'ccb')

  if (!crlvArq || !ccbArq) {
    return Response.json({ error: 'CRLV e CCB são obrigatórios para extração.' }, { status: 400 })
  }

  await supabase.from('substituicoes').update({ status: 'extraindo' }).eq('id', id)

  const [crlvFile, ccbFile] = await Promise.all([
    downloadBase64(crlvArq.bucket_path, crlvArq.nome),
    downloadBase64(ccbArq.bucket_path, ccbArq.nome),
  ])

  if (!crlvFile || !ccbFile) {
    await supabase.from('substituicoes').update({ status: 'documentos_pendentes' }).eq('id', id)
    return Response.json({ error: 'Erro ao ler os arquivos do storage.' }, { status: 500 })
  }

  let crlv: Record<string, string> = {}
  let ccb:  Record<string, string> = {}

  try {
    ;[crlv, ccb] = await Promise.all([
      extractCRLV(crlvFile.base64, crlvFile.contentType),
      extractCCB(ccbFile.base64, ccbFile.contentType),
    ])
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[extrair]', msg)
    await supabase.from('substituicoes').update({ status: 'documentos_pendentes' }).eq('id', id)
    return Response.json({ error: `Erro ao processar documentos com IA: ${msg}` }, { status: 500 })
  }

  const dados = { crlv, ccb }

  await supabase
    .from('substituicoes')
    .update({ dados_extraidos: dados, status: 'revisao' })
    .eq('id', id)

  return Response.json({ dados })
}

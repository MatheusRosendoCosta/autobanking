import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/jwt'
import Anthropic from '@anthropic-ai/sdk'
import { sanitizeHtml } from '@/lib/sanitize'

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

export async function POST(
  request: NextRequest,
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

  // Check for uploaded template
  const templateArq = (sub.arquivos as Array<{ tipo: string; bucket_path: string; nome: string }>)
    .find(a => a.tipo === 'aditamento_template')

  let templateContext = ''

  if (templateArq) {
    const { data: blob } = await supabase.storage.from('floorplan').download(templateArq.bucket_path)
    if (blob) {
      const buf = Buffer.from(await blob.arrayBuffer())
      // If PDF, we'll attach it; if text/docx, try as text
      if (templateArq.nome.toLowerCase().endsWith('.docx')) {
        // Basic text extraction from docx XML
        try {
          const text = buf.toString('utf-8')
          const wordText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
          templateContext = `\n\nCONTEÚDO DO TEMPLATE ENVIADO PELO USUÁRIO:\n${wordText.slice(0, 3000)}`
        } catch {
          templateContext = ''
        }
      } else if (blob.type === 'text/plain' || templateArq.nome.endsWith('.txt')) {
        templateContext = `\n\nCONTEÚDO DO TEMPLATE:\n${buf.toString('utf-8').slice(0, 3000)}`
      }
    }
  }

  const dados = sub.dados_extraidos ?? {}
  const placasSaindo = (sub.placas_saindo as string[]).join(', ')
  const placasEntrando = (sub.placas_entrando as string[]).join(', ')
  const dataHoje = new Date().toLocaleDateString('pt-BR')

  const prompt = `Gere um Aditamento Contratual de Substituição de Veículo completo e profissional em HTML formatado para impressão.

DADOS DO PROCESSO:
- Data: ${dataHoje}
- Placa(s) saindo: ${placasSaindo}
- Placa(s) entrando: ${placasEntrando}

DADOS EXTRAÍDOS DOS DOCUMENTOS:
${JSON.stringify(dados, null, 2)}
${templateContext}

Instruções:
- Gere um documento HTML completo com estilo inline adequado para impressão A4
- Inclua cabeçalho, número do aditamento, qualificação das partes, cláusulas, espaço para assinatura
- Use linguagem jurídica formal brasileira
- Campos não preenchidos devem aparecer como [___________] para preenchimento manual
- Retorne apenas o HTML, sem markdown, sem blocos de código`

  let html = ''

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    html = response.content[0].type === 'text' ? sanitizeHtml(response.content[0].text) : ''
  } catch (err) {
    console.error('[aditamento]', err)
    return Response.json({ error: 'Erro ao gerar o aditamento com IA.' }, { status: 500 })
  }

  if (!html) {
    return Response.json({ error: 'Falha ao gerar o conteúdo do aditamento.' }, { status: 500 })
  }

  await supabase
    .from('substituicoes')
    .update({ aditamento_html: html, status: 'aditamento_gerado' })
    .eq('id', id)

  return Response.json({ html })
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId()
  if (!userId) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params

  const { data: sub } = await supabase
    .from('substituicoes')
    .select('aditamento_html')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (!sub?.aditamento_html) return Response.json({ error: 'Aditamento não gerado.' }, { status: 404 })

  return new Response(sub.aditamento_html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

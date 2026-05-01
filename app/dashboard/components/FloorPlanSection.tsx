'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type SubStatus =
  | 'documentos_pendentes'
  | 'extraindo'
  | 'revisao'
  | 'aditamento_pendente'
  | 'aditamento_gerado'
  | 'aguardando_assinatura'
  | 'comprovante_pendente'
  | 'concluido'

interface DadosVeiculo { placa: string; chassi: string; renavam: string; marca: string; modelo: string; ano_fabricacao: string; ano_modelo: string; cor: string; combustivel: string; categoria: string }
interface DadosProprietario { nome: string; cpf_cnpj: string; endereco: string; cidade: string; uf: string; cep: string }
interface DadosLaudo { numero: string; data: string; resultado: string; empresa_responsavel: string; vistoriador: string }
interface DadosCCB { numero: string; instituicao: string; valor: string; taxa_juros: string; prazo_meses: string; data_operacao: string; devedor_nome: string; devedor_cpf_cnpj: string }
interface DadosExtraidos { veiculo?: Partial<DadosVeiculo>; proprietario?: Partial<DadosProprietario>; laudo?: Partial<DadosLaudo>; ccb?: Partial<DadosCCB> }

interface Arquivo { id: string; tipo: string; nome: string; tamanho: number; created_at: string }
interface Substituicao {
  id: string
  placas_saindo: string[]
  placas_entrando: string[]
  status: SubStatus
  dados_extraidos: DadosExtraidos
  aditamento_html: string | null
  created_at: string
  updated_at: string
  arquivos: Arquivo[]
}

interface ToastMsg { msg: string; type: 'success' | 'error' | 'info' }

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<SubStatus, { label: string; color: string; bg: string; border: string }> = {
  documentos_pendentes:  { label: 'Docs Pendentes',       color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  extraindo:             { label: 'Extraindo',             color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)' },
  revisao:               { label: 'Em Revisão',            color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)' },
  aditamento_pendente:   { label: 'Aditamento Pendente',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  aditamento_gerado:     { label: 'Aditamento Gerado',     color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)' },
  aguardando_assinatura: { label: 'Aguardando Assinatura', color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.3)' },
  comprovante_pendente:  { label: 'Comprovante Pendente',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  concluido:             { label: 'Concluído',             color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.3)' },
}

const STEPS = ['Placas', 'Documentos', 'Extração', 'Aditamento', 'Assinatura', 'Comprovantes']

const CAMPOS_EXTRACAO = [
  { group: 'CRLV — Dados do Veículo', key: 'crlv', fields: [
    { key: 'placa', label: 'Placa' }, { key: 'chassi', label: 'Chassi' }, { key: 'renavam', label: 'Renavam' },
    { key: 'ano_fabricacao', label: 'Ano Fab.' }, { key: 'ano_modelo', label: 'Ano Modelo' }, { key: 'cor', label: 'Cor' },
  ]},
  { group: 'CCB — Cédula de Crédito Bancário', key: 'ccb', fields: [
    { key: 'numero', label: 'Número CCB' }, { key: 'razao_social_lojista', label: 'Razão Social Lojista' },
    { key: 'data_emissao', label: 'Data de Emissão' }, { key: 'valor_credito', label: 'Valor do Crédito' },
    { key: 'veiculo_tipo', label: 'Tipo Veículo' }, { key: 'veiculo_placa', label: 'Placa (CCB)' },
    { key: 'veiculo_chassi', label: 'Chassi (CCB)' }, { key: 'veiculo_renavam', label: 'Renavam (CCB)' },
    { key: 'veiculo_cor', label: 'Cor (CCB)' },
  ]},
]

function statusToStep(status: SubStatus): number {
  const map: Record<SubStatus, number> = {
    documentos_pendentes: 2, extraindo: 3, revisao: 3,
    aditamento_pendente: 4, aditamento_gerado: 5, aguardando_assinatura: 5,
    comprovante_pendente: 6, concluido: 6,
  }
  return map[status] ?? 2
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SubStatus }) {
  const cfg = STATUS_CFG[status]
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  )
}

function Toast({ toast }: { toast: ToastMsg | null }) {
  if (!toast) return null
  const colors = {
    success: { color: '#86efac', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)' },
    error:   { color: '#fca5a5', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)' },
    info:    { color: '#a78bfa', bg: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.3)' },
  }[toast.type]
  return (
    <div className="fixed bottom-6 right-6 z-[60] px-4 py-3 rounded-xl text-sm font-medium shadow-xl max-w-sm"
      style={{ color: colors.color, background: colors.bg, border: `1px solid ${colors.border}`, backdropFilter: 'blur(12px)' }}>
      {toast.msg}
    </div>
  )
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-6 overflow-x-auto pb-2">
      {STEPS.map((label, i) => {
        const step = i + 1
        const done = step < current
        const active = step === current
        return (
          <div key={step} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  background: done ? '#7c3aed' : active ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
                  border: active ? '2px solid #7c3aed' : done ? '2px solid #7c3aed' : '2px solid #1e1b4b',
                  color: done || active ? '#a78bfa' : '#4b5563',
                }}
              >
                {done ? '✓' : step}
              </div>
              <span className="text-xs hidden sm:block" style={{ color: active ? '#a78bfa' : done ? '#7c3aed' : '#4b5563' }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-8 md:w-12 h-px mx-1 mt-0 sm:-mt-4"
                style={{ background: done ? '#7c3aed' : '#1e1b4b' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function FileZone({
  label, tipo, uploaded, uploading, accepted, onFile, hint,
}: {
  label: string; tipo: string; uploaded: boolean; uploading: boolean
  accepted: string; onFile: (file: File, tipo: string) => void; hint?: string
}) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const validate = (f: File) => {
    if (f.size > 15 * 1024 * 1024) return 'Arquivo muito grande. Máximo 15MB.'
    return null
  }

  const handle = (f: File) => {
    const err = validate(f)
    if (err) { alert(err); return }
    onFile(f, tipo)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handle(f)
  }, [])

  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#7c6fa0' }}>
        {label}
      </label>
      <div
        className="rounded-xl p-4 text-center cursor-pointer transition-all"
        style={{
          border: `2px dashed ${uploaded ? '#7c3aed' : dragging ? '#a78bfa' : '#1e1b4b'}`,
          background: uploaded ? 'rgba(124,58,237,0.06)' : dragging ? 'rgba(124,58,237,0.04)' : 'transparent',
          opacity: uploading ? 0.7 : 1,
        }}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {uploading ? (
          <p className="text-sm" style={{ color: '#a78bfa' }}>Enviando...</p>
        ) : uploaded ? (
          <p className="text-sm" style={{ color: '#4ade80' }}>✓ Enviado</p>
        ) : (
          <p className="text-sm" style={{ color: '#4b5563' }}>
            <span style={{ color: '#a78bfa' }}>Clique</span> ou arraste aqui
          </p>
        )}
        {hint && <p className="text-xs mt-1" style={{ color: '#2d2b4e' }}>{hint}</p>}
      </div>
      <input ref={inputRef} type="file" accept={accepted} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handle(f) }} />
    </div>
  )
}

// ─── Step Components ──────────────────────────────────────────────────────────

function Step1Placas({ onNext }: { onNext: (id: string) => void }) {
  const [saindo, setSaindo] = useState([''])
  const [entrando, setEntrando] = useState([''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const updatePlaca = (arr: string[], idx: number, val: string, set: (v: string[]) => void) => {
    const next = [...arr]; next[idx] = val.toUpperCase(); set(next)
  }

  const addPlaca = (arr: string[], set: (v: string[]) => void) => set([...arr, ''])
  const removePlaca = (arr: string[], idx: number, set: (v: string[]) => void) => {
    if (arr.length === 1) return
    set(arr.filter((_, i) => i !== idx))
  }

  const handleSubmit = async () => {
    const s = saindo.filter(p => p.trim())
    const e = entrando.filter(p => p.trim())
    if (!s.length || !e.length) { setError('Informe pelo menos uma placa de cada lado.'); return }
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/floorplan/substituicoes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placas_saindo: s, placas_entrando: e }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao criar.'); return }
      onNext(data.substituicao.id)
    } finally {
      setLoading(false)
    }
  }

  const PlacaGroup = ({ label, arr, set }: { label: string; arr: string[]; set: (v: string[]) => void }) => (
    <div className="space-y-2">
      <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: '#7c6fa0' }}>
        {label}
      </label>
      {arr.map((p, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={p}
            maxLength={8}
            onChange={e => updatePlaca(arr, i, e.target.value, set)}
            placeholder="AAA-0000"
            className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white placeholder:text-slate-600 outline-none font-mono tracking-widest"
            style={{ background: '#0d0d1f', border: '1.5px solid #1e1b4b' }}
          />
          {arr.length > 1 && (
            <button onClick={() => removePlaca(arr, i, set)}
              className="w-10 h-10 rounded-xl text-lg cursor-pointer flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}>
              ×
            </button>
          )}
        </div>
      ))}
      <button onClick={() => addPlaca(arr, set)}
        className="text-xs px-3 py-1.5 rounded-lg cursor-pointer"
        style={{ color: '#a78bfa', border: '1px solid rgba(124,58,237,0.25)', background: 'transparent' }}>
        + Adicionar placa
      </button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold mb-1" style={{ color: '#f8fafc' }}>Identificação das Placas</h3>
        <p className="text-sm" style={{ color: '#7c6fa0' }}>Informe as placas que estão saindo e entrando no floor plan.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <PlacaGroup label="Placa(s) Saindo" arr={saindo} set={setSaindo} />
        <PlacaGroup label="Placa(s) Entrando" arr={entrando} set={setEntrando} />
      </div>

      {error && (
        <p className="text-sm px-3 py-2 rounded-lg" style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.1)' }}>{error}</p>
      )}

      <button onClick={handleSubmit} disabled={loading}
        className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}>
        {loading ? 'Criando...' : 'Iniciar Processo →'}
      </button>
    </div>
  )
}

function Step2Documentos({
  subId, arquivos, showToast, onExtrair,
}: { subId: string; arquivos: Arquivo[]; showToast: (m: string, t: ToastMsg['type']) => void; onExtrair: () => void }) {
  const [uploading, setUploading] = useState<string | null>(null)
  const [localArquivos, setLocalArquivos] = useState<Arquivo[]>(arquivos)
  const [extracting, setExtracting] = useState(false)

  const docs = [
    { tipo: 'documento_veiculo', label: 'Documento do Veículo', hint: 'CRLV — PDF ou imagem' },
    { tipo: 'laudo_cautelar',    label: 'Laudo Cautelar',       hint: 'PDF ou imagem' },
    { tipo: 'ccb',               label: 'CCB',                  hint: 'Cédula de Crédito Bancário — PDF' },
  ]

  const isUploaded = (tipo: string) => localArquivos.some(a => a.tipo === tipo)
  const allUploaded = docs.every(d => isUploaded(d.tipo))

  const handleFile = async (file: File, tipo: string) => {
    setUploading(tipo)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('tipo', tipo)
      const res = await fetch(`/api/floorplan/substituicoes/${subId}/upload`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { showToast(data.error ?? 'Erro no upload.', 'error'); return }
      setLocalArquivos(prev => [...prev.filter(a => a.tipo !== tipo), data.arquivo])
      showToast('Arquivo enviado com sucesso.', 'success')
    } finally {
      setUploading(null)
    }
  }

  const handleExtrair = async () => {
    setExtracting(true)
    try {
      const res = await fetch(`/api/floorplan/substituicoes/${subId}/extrair`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { showToast(data.error ?? 'Erro na extração.', 'error'); return }
      showToast('Dados extraídos com sucesso!', 'success')
      onExtrair()
    } finally {
      setExtracting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold mb-1" style={{ color: '#f8fafc' }}>Upload dos Documentos</h3>
        <p className="text-sm" style={{ color: '#7c6fa0' }}>Envie os 3 documentos do novo veículo. A IA extrairá as informações automaticamente.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {docs.map(d => (
          <FileZone key={d.tipo} label={d.label} tipo={d.tipo} hint={d.hint}
            accepted=".pdf,.jpg,.jpeg,.png,.webp"
            uploaded={isUploaded(d.tipo)}
            uploading={uploading === d.tipo}
            onFile={handleFile} />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleExtrair}
          disabled={!allUploaded || extracting}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}
        >
          {extracting ? '🤖 Extraindo dados...' : '🤖 Extrair Dados com IA'}
        </button>
        {!allUploaded && (
          <p className="text-xs" style={{ color: '#4b5563' }}>Envie os 3 documentos para continuar</p>
        )}
      </div>
    </div>
  )
}

function Step3Extracao({
  subId, status, dadosIniciais, showToast, onConfirmar,
}: { subId: string; status: SubStatus; dadosIniciais: DadosExtraidos; showToast: (m: string, t: ToastMsg['type']) => void; onConfirmar: () => void }) {
  const [dados, setDados] = useState<DadosExtraidos>(dadosIniciais ?? {})
  const [saving, setSaving] = useState(false)

  const setField = (group: string, key: string, val: string) => {
    setDados(prev => ({
      ...prev,
      [group]: { ...(prev as Record<string, Record<string, string>>)[group], [key]: val },
    }))
  }

  const handleConfirmar = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/floorplan/substituicoes/${subId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dados_extraidos: dados, status: 'aditamento_pendente' }),
      })
      if (!res.ok) { showToast('Erro ao salvar dados.', 'error'); return }
      showToast('Dados confirmados!', 'success')
      onConfirmar()
    } finally {
      setSaving(false)
    }
  }

  if (status === 'extraindo') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
          style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
          🤖
        </div>
        <p className="font-semibold" style={{ color: '#f8fafc' }}>Extraindo dados com IA...</p>
        <p className="text-sm text-center max-w-sm" style={{ color: '#7c6fa0' }}>
          O Claude está analisando os documentos. Isso pode levar alguns segundos.
        </p>
        <button onClick={onConfirmar}
          className="text-xs px-4 py-2 rounded-lg cursor-pointer mt-2"
          style={{ color: '#a78bfa', border: '1px solid rgba(124,58,237,0.25)' }}>
          Verificar status
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold mb-1" style={{ color: '#f8fafc' }}>Dados Extraídos</h3>
        <p className="text-sm" style={{ color: '#7c6fa0' }}>Revise e corrija os dados extraídos pela IA antes de prosseguir.</p>
      </div>

      {CAMPOS_EXTRACAO.map(grupo => (
        <div key={grupo.key} className="rounded-xl p-4" style={{ background: '#0d0d1f', border: '1px solid #1e1b4b' }}>
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#a78bfa' }}>
            {grupo.group}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {grupo.fields.map(campo => {
              const val = ((dados as Record<string, Record<string, string>>)[grupo.key]?.[campo.key]) ?? ''
              return (
                <div key={campo.key}>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#4b5563' }}>{campo.label}</label>
                  <input
                    value={val}
                    onChange={e => setField(grupo.key, campo.key, e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ background: '#08080f', border: '1px solid #1e1b4b' }}
                    placeholder="—"
                  />
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <button onClick={handleConfirmar} disabled={saving}
        className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}>
        {saving ? 'Salvando...' : 'Confirmar Dados →'}
      </button>
    </div>
  )
}

function Step4Aditamento({
  subId, arquivos, aditamentoHtml, showToast, onGerar, onAvancar,
}: { subId: string; arquivos: Arquivo[]; aditamentoHtml: string | null; showToast: (m: string, t: ToastMsg['type']) => void; onGerar: (html: string) => void; onAvancar: () => void }) {
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [html, setHtml] = useState<string | null>(aditamentoHtml)

  const templateUploaded = arquivos.some(a => a.tipo === 'aditamento_template')

  const handleTemplate = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('tipo', 'aditamento_template')
      const res = await fetch(`/api/floorplan/substituicoes/${subId}/upload`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { showToast(data.error ?? 'Erro no upload.', 'error'); return }
      showToast('Template enviado.', 'success')
    } finally {
      setUploading(false)
    }
  }

  const handleGerar = async () => {
    setGenerating(true)
    try {
      const res = await fetch(`/api/floorplan/substituicoes/${subId}/aditamento`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { showToast(data.error ?? 'Erro ao gerar.', 'error'); return }
      setHtml(data.html)
      onGerar(data.html)
      showToast('Aditamento gerado com sucesso!', 'success')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = () => {
    if (!html) return
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'aditamento_contratual.html'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePreview = () => {
    if (!html) return
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold mb-1" style={{ color: '#f8fafc' }}>Aditamento Contratual</h3>
        <p className="text-sm" style={{ color: '#7c6fa0' }}>
          Opcional: envie seu template. A IA irá preenchê-lo com os dados extraídos e gerar o aditamento.
        </p>
      </div>

      <FileZone label="Template do Aditamento (opcional)" tipo="aditamento_template"
        hint="DOCX, PDF ou TXT — se não enviar, um documento padrão será gerado"
        accepted=".pdf,.docx,.txt"
        uploaded={templateUploaded} uploading={uploading}
        onFile={handleTemplate} />

      <button onClick={handleGerar} disabled={generating}
        className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}>
        {generating ? '🤖 Gerando aditamento...' : '🤖 Gerar Aditamento com IA'}
      </button>

      {html && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)' }}>
          <p className="text-sm font-semibold" style={{ color: '#86efac' }}>✓ Aditamento gerado com sucesso!</p>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handlePreview}
              className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
              style={{ color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)', background: 'transparent' }}>
              Visualizar
            </button>
            <button onClick={handleDownload}
              className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
              style={{ color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)', background: 'transparent' }}>
              Baixar HTML
            </button>
          </div>
          <button onClick={onAvancar}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer block"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}>
            Avançar para Assinatura →
          </button>
        </div>
      )}
    </div>
  )
}

function Step5Assinatura({
  subId, status, aditamentoHtml, showToast, onMarcarAssinado,
}: { subId: string; status: SubStatus; aditamentoHtml: string | null; showToast: (m: string, t: ToastMsg['type']) => void; onMarcarAssinado: () => void }) {
  const [sending, setSending] = useState(false)
  const [marking, setMarking] = useState(false)

  const handlePreview = () => {
    if (!aditamentoHtml) return
    const blob = new Blob([aditamentoHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  const handleDownload = () => {
    if (!aditamentoHtml) return
    const blob = new Blob([aditamentoHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'aditamento_contratual.html'; a.click()
    URL.revokeObjectURL(url)
  }

  const handleEnviar = async () => {
    setSending(true)
    try {
      await fetch(`/api/floorplan/substituicoes/${subId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'aguardando_assinatura' }),
      })
      showToast('Status atualizado para "Aguardando Assinatura".', 'info')
      onMarcarAssinado()
    } finally {
      setSending(false)
    }
  }

  const handleMarcar = async () => {
    setMarking(true)
    try {
      await fetch(`/api/floorplan/substituicoes/${subId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'comprovante_pendente' }),
      })
      showToast('Assinatura confirmada!', 'success')
      onMarcarAssinado()
    } finally {
      setMarking(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold mb-1" style={{ color: '#f8fafc' }}>Envio para Assinatura</h3>
        <p className="text-sm" style={{ color: '#7c6fa0' }}>
          Baixe o aditamento e envie para as partes assinarem. Após a assinatura, confirme abaixo.
        </p>
      </div>

      <div className="rounded-xl p-4 space-y-3" style={{ background: '#0d0d1f', border: '1px solid #1e1b4b' }}>
        <p className="text-sm font-semibold" style={{ color: '#f8fafc' }}>Documento do Aditamento</p>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handlePreview}
            className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
            style={{ color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)', background: 'transparent' }}>
            Visualizar
          </button>
          <button onClick={handleDownload}
            className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
            style={{ color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)', background: 'transparent' }}>
            Baixar HTML
          </button>
        </div>
      </div>

      {status !== 'aguardando_assinatura' ? (
        <button onClick={handleEnviar} disabled={sending}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}>
          {sending ? 'Atualizando...' : 'Marcar como "Aguardando Assinatura"'}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)' }}>
            <span className="text-lg">⏳</span>
            <p className="text-sm font-medium" style={{ color: '#fb923c' }}>
              Aguardando assinatura das partes...
            </p>
          </div>
          <button onClick={handleMarcar} disabled={marking}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}>
            {marking ? 'Confirmando...' : '✓ Confirmar Assinatura Recebida'}
          </button>
        </div>
      )}
    </div>
  )
}

function Step6Comprovantes({
  subId, arquivos, status, showToast, onConcluir,
}: { subId: string; arquivos: Arquivo[]; status: SubStatus; showToast: (m: string, t: ToastMsg['type']) => void; onConcluir: () => void }) {
  const [uploading, setUploading] = useState(false)
  const [localArqs, setLocalArqs] = useState<Arquivo[]>(arquivos.filter(a => a.tipo === 'comprovante'))
  const [concluding, setConcluding] = useState(false)

  const handleFile = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('tipo', 'comprovante')
      const res = await fetch(`/api/floorplan/substituicoes/${subId}/upload`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { showToast(data.error ?? 'Erro no upload.', 'error'); return }
      setLocalArqs(prev => [...prev, data.arquivo])
      showToast('Comprovante enviado.', 'success')
    } finally {
      setUploading(false)
    }
  }

  const inputRef = useRef<HTMLInputElement>(null)
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    Array.from(e.dataTransfer.files).forEach(f => handleFile(f))
  }, [])

  const handleConcluir = async () => {
    setConcluding(true)
    try {
      await fetch(`/api/floorplan/substituicoes/${subId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'concluido' }),
      })
      showToast('Processo concluído com sucesso!', 'success')
      onConcluir()
    } finally {
      setConcluding(false)
    }
  }

  if (status === 'concluido') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="text-4xl">🎉</div>
        <p className="font-bold text-lg" style={{ color: '#f8fafc' }}>Processo Concluído!</p>
        <p className="text-sm text-center" style={{ color: '#7c6fa0' }}>A substituição de veículo foi formalizada com sucesso.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold mb-1" style={{ color: '#f8fafc' }}>Comprovantes da Substituição</h3>
        <p className="text-sm" style={{ color: '#7c6fa0' }}>Anexe os comprovantes que formalizam a substituição do veículo.</p>
      </div>

      <div
        className="rounded-xl p-6 text-center cursor-pointer"
        style={{ border: '2px dashed #1e1b4b', background: 'transparent' }}
        onDragOver={e => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        <p className="text-sm" style={{ color: '#4b5563' }}>
          {uploading ? 'Enviando...' : <><span style={{ color: '#a78bfa' }}>Clique</span> ou arraste os comprovantes</>}
        </p>
        <p className="text-xs mt-1" style={{ color: '#2d2b4e' }}>PDF, JPG ou PNG — múltiplos arquivos aceitos</p>
      </div>
      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple className="hidden"
        onChange={e => Array.from(e.target.files ?? []).forEach(f => handleFile(f))} />

      {localArqs.length > 0 && (
        <div className="space-y-2">
          {localArqs.map(a => (
            <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
              style={{ background: '#0d0d1f', border: '1px solid #1e1b4b' }}>
              <span className="text-sm flex-1 truncate" style={{ color: '#e2e8f0' }}>{a.nome}</span>
              <span className="text-xs flex-shrink-0" style={{ color: '#4b5563' }}>
                {(a.tamanho / 1024).toFixed(0)} KB
              </span>
              <span style={{ color: '#4ade80' }}>✓</span>
            </div>
          ))}
        </div>
      )}

      <button onClick={handleConcluir} disabled={concluding || localArqs.length === 0}
        className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer disabled:opacity-40"
        style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}>
        {concluding ? 'Concluindo...' : '✓ Concluir Processo'}
      </button>
    </div>
  )
}

// ─── Wizard ───────────────────────────────────────────────────────────────────

function SubstituicaoWizard({
  initialSub, onClose, showToast,
}: { initialSub: Substituicao | null; onClose: () => void; showToast: (m: string, t: ToastMsg['type']) => void }) {
  const [sub, setSub] = useState<Substituicao | null>(initialSub)
  const [step, setStep] = useState(initialSub ? statusToStep(initialSub.status) : 1)

  const reload = async (id: string) => {
    const res = await fetch(`/api/floorplan/substituicoes/${id}`)
    const data = await res.json()
    if (res.ok) { setSub(data.substituicao); setStep(statusToStep(data.substituicao.status)) }
  }

  const handlePlacasNext = (id: string) => {
    reload(id)
    setStep(2)
  }

  const handleExtrair = () => { if (sub) reload(sub.id) }
  const handleConfirmar = () => { if (sub) reload(sub.id) }
  const handleGerar = (html: string) => { setSub(prev => prev ? { ...prev, aditamento_html: html } : prev); setStep(5) }
  const handleMarcarAssinado = () => { if (sub) reload(sub.id) }

  const placasLabel = sub ? `${sub.placas_saindo.join(', ')} → ${sub.placas_entrando.join(', ')}` : 'Nova Substituição'

  return (
    <div>
      {/* Wizard header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#f8fafc' }}>Substituição de Veículo</h2>
          {sub && <p className="text-sm font-mono mt-0.5" style={{ color: '#a78bfa' }}>{placasLabel}</p>}
        </div>
        <div className="flex items-center gap-2">
          {sub && <StatusBadge status={sub.status} />}
          <button onClick={onClose}
            className="px-3 py-2 rounded-lg text-sm cursor-pointer"
            style={{ color: '#7c6fa0', border: '1px solid #1e1b4b' }}>
            ← Voltar
          </button>
        </div>
      </div>

      <StepIndicator current={step} />

      <div className="rounded-2xl p-4 sm:p-6" style={{ background: '#0d0d1f', border: '1px solid #1e1b4b' }}>
        {step === 1 && <Step1Placas onNext={handlePlacasNext} />}

        {step === 2 && sub && (
          <Step2Documentos
            subId={sub.id}
            arquivos={sub.arquivos}
            showToast={showToast}
            onExtrair={handleExtrair}
          />
        )}

        {step === 3 && sub && (
          <Step3Extracao
            subId={sub.id}
            status={sub.status}
            dadosIniciais={sub.dados_extraidos}
            showToast={showToast}
            onConfirmar={handleConfirmar}
          />
        )}

        {step === 4 && sub && (
          <Step4Aditamento
            subId={sub.id}
            arquivos={sub.arquivos}
            aditamentoHtml={sub.aditamento_html}
            showToast={showToast}
            onGerar={handleGerar}
            onAvancar={() => setStep(5)}
          />
        )}

        {step === 5 && sub && (
          <Step5Assinatura
            subId={sub.id}
            status={sub.status}
            aditamentoHtml={sub.aditamento_html}
            showToast={showToast}
            onMarcarAssinado={handleMarcarAssinado}
          />
        )}

        {step === 6 && sub && (
          <Step6Comprovantes
            subId={sub.id}
            arquivos={sub.arquivos}
            status={sub.status}
            showToast={showToast}
            onConcluir={onClose}
          />
        )}
      </div>
    </div>
  )
}

// ─── List view ────────────────────────────────────────────────────────────────

function SubstituicaoCard({ sub, onClick }: { sub: Substituicao; onClick: () => void }) {
  const comprovantes = sub.arquivos?.filter(a => a.tipo === 'comprovante').length ?? 0
  const docs = ['documento_veiculo', 'laudo_cautelar', 'ccb'].filter(t =>
    sub.arquivos?.some(a => a.tipo === t)
  ).length

  return (
    <div
      className="rounded-2xl p-4 sm:p-5 cursor-pointer transition-all hover:scale-[1.005]"
      style={{ background: '#0d0d1f', border: '1px solid #1e1b4b' }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-semibold text-sm" style={{ color: '#f8fafc' }}>
              {sub.placas_saindo.join(' · ')}
            </span>
            <span style={{ color: '#4b5563' }}>→</span>
            <span className="font-mono font-semibold text-sm" style={{ color: '#a78bfa' }}>
              {sub.placas_entrando.join(' · ')}
            </span>
          </div>
          <p className="text-xs mt-1" style={{ color: '#4b5563' }}>
            {new Date(sub.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <StatusBadge status={sub.status} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs" style={{ color: '#4b5563' }}>
          <span>{docs}/3 docs</span>
          {comprovantes > 0 && <span>{comprovantes} comprovante{comprovantes > 1 ? 's' : ''}</span>}
        </div>
        <button
          className="text-xs px-3 py-1.5 rounded-lg cursor-pointer"
          style={{ color: '#a78bfa', border: '1px solid rgba(124,58,237,0.25)' }}
          onClick={e => { e.stopPropagation(); onClick() }}
        >
          {sub.status === 'concluido' ? 'Visualizar' : 'Continuar →'}
        </button>
      </div>
    </div>
  )
}

// ─── FloorPlanSection ─────────────────────────────────────────────────────────

export default function FloorPlanSection() {
  const [view, setView] = useState<'list' | 'wizard'>('list')
  const [subs, setSubs] = useState<Substituicao[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSub, setActiveSub] = useState<Substituicao | null>(null)
  const [toast, setToast] = useState<ToastMsg | null>(null)

  const showToast = (msg: string, type: ToastMsg['type'] = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/floorplan/substituicoes')
      const data = await res.json()
      if (res.ok) setSubs(data.substituicoes ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openNew = () => { setActiveSub(null); setView('wizard') }
  const openSub = (sub: Substituicao) => { setActiveSub(sub); setView('wizard') }
  const closeWizard = () => { setView('list'); setActiveSub(null); load() }

  const concluidos = subs.filter(s => s.status === 'concluido').length
  const emAndamento = subs.length - concluidos

  return (
    <div>
      <Toast toast={toast} />

      {view === 'wizard' ? (
        <SubstituicaoWizard initialSub={activeSub} onClose={closeWizard} showToast={showToast} />
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 md:mb-6 gap-3">
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#f8fafc' }}>Substituição de Veículo</h2>
              <p className="text-sm mt-0.5" style={{ color: '#7c6fa0' }}>
                {loading ? 'Carregando...' : subs.length === 0
                  ? 'Nenhum processo iniciado'
                  : `${emAndamento} em andamento · ${concluidos} concluído${concluidos !== 1 ? 's' : ''}`}
              </p>
            </div>
            <button
              onClick={openNew}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer transition-opacity hover:opacity-90 self-start sm:self-auto"
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}
            >
              + Nova Substituição
            </button>
          </div>

          {/* List */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <p className="text-sm" style={{ color: '#4b5563' }}>Carregando...</p>
            </div>
          ) : subs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 md:py-24 gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
                🚗
              </div>
              <div className="text-center">
                <p className="font-semibold mb-1" style={{ color: '#f8fafc' }}>Nenhuma substituição registrada</p>
                <p className="text-sm" style={{ color: '#7c6fa0' }}>Inicie um processo para formalizar a troca de veículo</p>
              </div>
              <button onClick={openNew}
                className="mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}>
                + Nova Substituição
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {subs.map(sub => (
                <SubstituicaoCard key={sub.id} sub={sub} onClick={() => openSub(sub)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

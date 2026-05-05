'use client'

import { useState, useEffect, useRef } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Boleto {
  id: string
  card_id: string
  loja: string
  nome: string
  tamanho: number
  created_at: string
}

interface JurosCard {
  id: string
  mes: string
  created_at: string
  boletos: Boleto[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function formatMes(dateStr: string): string {
  const [year, month] = dateStr.split('-')
  return `${MESES[parseInt(month) - 1]} ${year}`
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── BoletoRow ─────────────────────────────────────────────────────────────────

function BoletoRow({ boleto, onDelete }: { boleto: Boleto; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false)

  const handleView = async () => {
    const res = await fetch(`/api/floorplan/boletos/${boleto.id}/view`)
    const json = await res.json()
    if (json.url) window.open(json.url, '_blank')
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await fetch(`/api/floorplan/boletos/${boleto.id}`, { method: 'DELETE' })
      onDelete(boleto.id)
    } catch { setDeleting(false) }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 9, padding: '9px 12px' }}>
      {/* Ícone PDF */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="#a78bfa" strokeWidth="1.6" fill="none" />
        <path d="M14 2v6h6" stroke="#a78bfa" strokeWidth="1.6" strokeLinecap="round" />
      </svg>

      {/* Loja badge */}
      <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 5, padding: '2px 7px', whiteSpace: 'nowrap', flexShrink: 0 }}>
        {boleto.loja}
      </span>

      {/* Nome arquivo */}
      <span style={{ flex: 1, fontSize: 12, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={boleto.nome}>
        {boleto.nome}
      </span>

      <span style={{ fontSize: 10, color: '#4a4568', whiteSpace: 'nowrap' }}>{formatSize(boleto.tamanho)}</span>

      <button onClick={handleView} title="Visualizar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: '#a78bfa', display: 'flex', alignItems: 'center' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8" fill="none" />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" fill="none" />
        </svg>
      </button>

      <button onClick={handleDelete} disabled={deleting} title="Remover" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: '#fca5a5', display: 'flex', alignItems: 'center', opacity: deleting ? 0.4 : 1 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

// ─── UploadBoleto ──────────────────────────────────────────────────────────────

function UploadBoleto({ cardId, onUploaded }: { cardId: string; onUploaded: (b: Boleto) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [loja, setLoja] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')

  const reset = () => { setOpen(false); setLoja(''); setFile(null); setError('') }

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    if (!loja.trim()) { setError('Informe o nome da loja.'); return }
    if (!file) { setError('Selecione o boleto em PDF.'); return }
    if (file.type !== 'application/pdf') { setError('Somente PDF.'); return }
    if (file.size > 20 * 1024 * 1024) { setError('Máximo 20MB.'); return }

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('loja', loja.trim())
      const res = await fetch(`/api/floorplan/juros/${cardId}/upload`, { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Erro ao enviar.'); return }
      onUploaded(json.boleto)
      reset()
    } catch {
      setError('Erro de conexão.')
    } finally {
      setUploading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px dashed rgba(124,58,237,0.3)', background: 'transparent', color: '#7c6fa0', fontSize: 12, cursor: 'pointer', width: '100%', justifyContent: 'center', transition: 'border-color 0.15s' }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="#a78bfa" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        Adicionar Loja
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 10, padding: '12px 12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <p style={{ fontSize: 12, fontWeight: 600, color: '#a78bfa', margin: 0 }}>Nova Loja</p>

      {/* Campo loja */}
      <div>
        <label style={{ fontSize: 11, color: '#7c6fa0', display: 'block', marginBottom: 3 }}>Nome da Loja</label>
        <input
          type="text"
          placeholder="Ex: Loja Centro"
          value={loja}
          onChange={e => setLoja(e.target.value)}
          autoFocus
          style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #1e1b4b', background: '#08080f', color: '#f8fafc', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {/* Campo arquivo */}
      <div>
        <label style={{ fontSize: 11, color: '#7c6fa0', display: 'block', marginBottom: 3 }}>Boleto de Juros (PDF)</label>
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) setFile(f) }}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `1.5px dashed ${dragging ? '#a78bfa' : file ? 'rgba(124,58,237,0.5)' : 'rgba(124,58,237,0.2)'}`,
            borderRadius: 7,
            padding: '9px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            cursor: 'pointer',
            background: dragging ? 'rgba(124,58,237,0.06)' : file ? 'rgba(124,58,237,0.05)' : 'transparent',
            transition: 'all 0.15s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke={file ? '#a78bfa' : '#4a4568'} strokeWidth="1.6" fill="none" />
            <path d="M14 2v6h6" stroke={file ? '#a78bfa' : '#4a4568'} strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: 12, color: file ? '#f8fafc' : '#7c6fa0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {file ? file.name : 'Clique ou arraste o PDF aqui'}
          </span>
          {file && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setFile(null) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c6fa0', padding: 2, display: 'flex', alignItems: 'center', flexShrink: 0 }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {error && <p style={{ fontSize: 11, color: '#fca5a5', margin: 0 }}>{error}</p>}

      {/* Botões */}
      <div style={{ display: 'flex', gap: 6, paddingTop: 2 }}>
        <button
          type="submit"
          disabled={uploading}
          style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', cursor: uploading ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#7c3aed,#4c1d95)', color: '#f8fafc', fontSize: 12, fontWeight: 600, opacity: uploading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
        >
          {uploading ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2.5" strokeDasharray="28" strokeDashoffset="8" />
              </svg>
              Enviando...
            </>
          ) : 'Adicionar'}
        </button>
        <button
          type="button"
          onClick={reset}
          style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid #1e1b4b', cursor: 'pointer', background: 'transparent', color: '#7c6fa0', fontSize: 12 }}
        >
          Cancelar
        </button>
      </div>

      <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); e.target.value = '' }} />
    </form>
  )
}

// ─── JurosCard ─────────────────────────────────────────────────────────────────

function JurosCard({ card, onDelete, onBoletoChange }: {
  card: JurosCard
  onDelete: (id: string) => void
  onBoletoChange: (cardId: string, boleto: Boleto | null, deletedId?: string) => void
}) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Deletar card de ${formatMes(card.mes)}?`)) return
    setDeleting(true)
    try {
      await fetch(`/api/floorplan/juros/${card.id}`, { method: 'DELETE' })
      onDelete(card.id)
    } catch { setDeleting(false) }
  }

  return (
    <div style={{ background: '#0d0d1f', border: '1px solid #1e1b4b', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#7c3aed,#4c1d95)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="white" strokeWidth="1.8" fill="none" />
              <path d="M3 9h18M8 2v4M16 2v4" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', margin: 0, lineHeight: 1.2 }}>{formatMes(card.mes)}</p>
            <p style={{ fontSize: 11, color: '#4a4568', margin: 0 }}>{card.boletos.length} boleto{card.boletos.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <button onClick={handleDelete} disabled={deleting} title="Deletar card" style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 7, cursor: 'pointer', color: '#fca5a5', display: 'flex', alignItems: 'center', padding: '4px 6px', opacity: deleting ? 0.4 : 1 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Lista de boletos */}
      {card.boletos.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {card.boletos
            .slice()
            .sort((a, b) => a.loja.localeCompare(b.loja))
            .map(b => (
              <BoletoRow
                key={b.id}
                boleto={b}
                onDelete={id => onBoletoChange(card.id, null, id)}
              />
            ))}
        </div>
      )}

      {/* Upload */}
      <UploadBoleto
        cardId={card.id}
        onUploaded={b => onBoletoChange(card.id, b)}
      />
    </div>
  )
}

// ─── CobrancaJuros ─────────────────────────────────────────────────────────────

function CobrancaJuros() {
  const [cards, setCards] = useState<JurosCard[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newMes, setNewMes] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [showForm, setShowForm] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    fetch('/api/floorplan/juros')
      .then(r => r.json())
      .then(d => { if (d.cards) setCards(d.cards) })
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCreateError('')
    if (!newMes) { setCreateError('Selecione o mês.'); return }

    const mesDate = `${newMes}-01`
    if (cards.some(c => c.mes.startsWith(newMes))) { setCreateError('Já existe um card para esse mês.'); return }

    setCreating(true)
    try {
      const res = await fetch('/api/floorplan/juros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mes: mesDate }),
      })
      const json = await res.json()
      if (!res.ok) { setCreateError(json.error ?? 'Erro ao criar.'); return }
      setCards(prev => [json.card, ...prev])
      setShowForm(false)
    } catch {
      setCreateError('Erro de conexão.')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = (id: string) => setCards(prev => prev.filter(c => c.id !== id))

  const handleBoletoChange = (cardId: string, boleto: Boleto | null, deletedId?: string) => {
    setCards(prev => prev.map(c => {
      if (c.id !== cardId) return c
      if (boleto) return { ...c, boletos: [...c.boletos, boleto] }
      if (deletedId) return { ...c, boletos: c.boletos.filter(b => b.id !== deletedId) }
      return c
    }))
  }

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', margin: 0 }}>Cobrança de Juros</h2>
          <p style={{ fontSize: 13, color: '#7c6fa0', margin: '2px 0 0' }}>Boletos por mês</p>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setCreateError('') }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#7c3aed,#4c1d95)', color: '#f8fafc', fontSize: 13, fontWeight: 600 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          Novo Card
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <form onSubmit={handleCreate} style={{ background: '#0d0d1f', border: '1px solid #1e1b4b', borderRadius: 12, padding: 14, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 340 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#a78bfa', margin: 0 }}>Novo Card</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: '#7c6fa0', display: 'block', marginBottom: 4 }}>Mês</label>
              <input
                type="month"
                value={newMes}
                onChange={e => setNewMes(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #1e1b4b', background: '#08080f', color: '#f8fafc', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <button type="submit" disabled={creating} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: creating ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#7c3aed,#4c1d95)', color: '#f8fafc', fontSize: 13, fontWeight: 600, opacity: creating ? 0.7 : 1, whiteSpace: 'nowrap' }}>
              {creating ? 'Criando...' : 'Criar'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #1e1b4b', cursor: 'pointer', background: 'transparent', color: '#7c6fa0', fontSize: 13 }}>✕</button>
          </div>
          {createError && <p style={{ fontSize: 11, color: '#fca5a5', margin: 0 }}>{createError}</p>}
        </form>
      )}

      {/* Grid */}
      {loading ? (
        <p style={{ color: '#7c6fa0', fontSize: 14, textAlign: 'center', padding: 48 }}>Carregando...</p>
      ) : cards.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: '#0d0d1f', border: '1px dashed #1e1b4b', borderRadius: 14 }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }}>
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="#7c6fa0" strokeWidth="1.5" fill="none" />
            <path d="M3 9h18M8 2v4M16 2v4" stroke="#7c6fa0" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p style={{ color: '#7c6fa0', fontSize: 14, margin: 0 }}>Nenhum card criado ainda.</p>
          <p style={{ color: '#4a4568', fontSize: 13, marginTop: 4 }}>Clique em "Novo Card" para começar.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12, alignItems: 'start' }}>
          {cards.map(card => (
            <JurosCard
              key={card.id}
              card={card}
              onDelete={handleDelete}
              onBoletoChange={handleBoletoChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Propostas types & helpers ─────────────────────────────────────────────────

type PropostaStatus = 'aguardando_assinatura' | 'aguardando_pagamento' | 'pendente' | 'aguardando_documentos' | 'conciliacao_appsheet' | 'finalizado' | 'pago'

interface PropostaArquivo {
  id: string
  card_id: string
  tipo: 'crlv_dut' | 'vistoria'
  nome: string
  tamanho: number
  created_at: string
}

interface PropostaCard {
  id: string
  nome: string
  status: PropostaStatus
  observacao: string
  created_at: string
  arquivos: PropostaArquivo[]
}

const STATUS_OPTIONS: { id: PropostaStatus; label: string; color: string; bg: string; border: string }[] = [
  { id: 'aguardando_documentos',  label: 'Aguardando Documentos',   color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)'  },
  { id: 'aguardando_assinatura',  label: 'Aguardando Assinatura',   color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.3)'  },
  { id: 'pendente',               label: 'Pendente',                color: '#a78bfa', bg: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.3)'  },
  { id: 'aguardando_pagamento',   label: 'Aguardando Pagamento',    color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)'  },
  { id: 'pago',                   label: 'Pago',                    color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.3)'  },
  { id: 'conciliacao_appsheet',   label: 'Conciliação AppSheet',    color: '#2dd4bf', bg: 'rgba(45,212,191,0.12)',  border: 'rgba(45,212,191,0.3)'  },
  { id: 'finalizado',             label: 'Finalizado',              color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)'  },
]

function getStatus(id: PropostaStatus) {
  return STATUS_OPTIONS.find(s => s.id === id) ?? STATUS_OPTIONS[0]
}

const PROPOSTA_TIPOS: { id: 'crlv_dut' | 'vistoria'; label: string; color: string; bg: string; border: string }[] = [
  { id: 'crlv_dut',  label: 'CRLV / DUT', color: '#a78bfa', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.20)' },
  { id: 'vistoria',  label: 'Vistoria',    color: '#34d399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.20)' },
]

// ─── PropostaTipoSection ───────────────────────────────────────────────────────

function PropostaTipoSection({ cardId, tipo, arquivos, onUploaded, onDeleted }: {
  cardId: string
  tipo: (typeof PROPOSTA_TIPOS)[number]
  arquivos: PropostaArquivo[]
  onUploaded: (a: PropostaArquivo) => void
  onDeleted: (id: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (file: File) => {
    setError('')
    if (file.type !== 'application/pdf') { setError('Somente PDF.'); return }
    if (file.size > 20 * 1024 * 1024) { setError('Máximo 20MB.'); return }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('tipo', tipo.id)
      const res = await fetch(`/api/floorplan/propostas/${cardId}/upload`, { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Erro ao enviar.'); return }
      onUploaded(json.arquivo)
    } catch {
      setError('Erro de conexão.')
    } finally {
      setUploading(false)
    }
  }

  const handleView = async (arquivoId: string) => {
    const res = await fetch(`/api/floorplan/propostas/arquivos/${arquivoId}/view`)
    const json = await res.json()
    if (json.url) window.open(json.url, '_blank')
  }

  const handleDelete = async (arquivoId: string) => {
    await fetch(`/api/floorplan/propostas/arquivos/${arquivoId}`, { method: 'DELETE' })
    onDeleted(arquivoId)
  }

  return (
    <div style={{ background: tipo.bg, border: `1px solid ${tipo.border}`, borderRadius: 8, padding: '10px 10px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: tipo.color, textTransform: 'uppercase' }}>
          {tipo.label}
        </span>
        {arquivos.length > 0 && (
          <span style={{ fontSize: 10, color: tipo.color, opacity: 0.7 }}>{arquivos.length} arquivo{arquivos.length > 1 ? 's' : ''}</span>
        )}
      </div>

      {arquivos.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {arquivos.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.2)', borderRadius: 7, padding: '6px 8px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke={tipo.color} strokeWidth="1.6" fill="none" />
                <path d="M14 2v6h6" stroke={tipo.color} strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <span style={{ flex: 1, fontSize: 11, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.nome}>{a.nome}</span>
              <span style={{ fontSize: 10, color: '#4a4568', whiteSpace: 'nowrap' }}>{formatSize(a.tamanho)}</span>
              <button onClick={() => handleView(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: tipo.color, display: 'flex', alignItems: 'center' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8" fill="none" /><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" fill="none" /></svg>
              </button>
              <button onClick={() => handleDelete(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#fca5a5', display: 'flex', alignItems: 'center' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        onClick={() => !uploading && inputRef.current?.click()}
        style={{ border: `1.5px dashed ${dragging ? tipo.color : tipo.border}`, borderRadius: 6, padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 6, cursor: uploading ? 'not-allowed' : 'pointer', background: dragging ? tipo.bg : 'transparent', opacity: uploading ? 0.6 : 1, transition: 'border-color 0.15s' }}
      >
        {uploading
          ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}><circle cx="12" cy="12" r="9" stroke={tipo.color} strokeWidth="2.5" strokeDasharray="28" strokeDashoffset="8" /></svg>
          : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M12 5v14M5 12h14" stroke={tipo.color} strokeWidth="2.2" strokeLinecap="round" /></svg>
        }
        <span style={{ fontSize: 11, color: '#7c6fa0' }}>{uploading ? 'Enviando...' : 'Adicionar PDF'}</span>
      </div>

      {error && <p style={{ fontSize: 10, color: '#fca5a5', margin: 0 }}>{error}</p>}
      <input ref={inputRef} type="file" accept="application/pdf" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
    </div>
  )
}

// ─── PropostaCardItem ──────────────────────────────────────────────────────────

function PropostaCardItem({ card, onDelete, onArquivoChange, onCardUpdate }: {
  card: PropostaCard
  onDelete: (id: string) => void
  onArquivoChange: (cardId: string, arquivo: PropostaArquivo | null, deletedId?: string) => void
  onCardUpdate: (cardId: string, fields: Partial<PropostaCard>) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)
  const [observacao, setObservacao] = useState(card.observacao)
  const [savingObs, setSavingObs] = useState(false)
  const obsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const statusAtual = getStatus(card.status)

  const handleDelete = async () => {
    if (!confirm(`Deletar proposta "${card.nome}"?`)) return
    setDeleting(true)
    try {
      await fetch(`/api/floorplan/propostas/${card.id}`, { method: 'DELETE' })
      onDelete(card.id)
    } catch { setDeleting(false) }
  }

  const handleStatusChange = async (newStatus: PropostaStatus) => {
    setShowStatusMenu(false)
    setSavingStatus(true)
    try {
      const res = await fetch(`/api/floorplan/propostas/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (res.ok) onCardUpdate(card.id, { status: json.card.status })
    } finally { setSavingStatus(false) }
  }

  const handleObsChange = (value: string) => {
    setObservacao(value)
    if (obsTimer.current) clearTimeout(obsTimer.current)
    obsTimer.current = setTimeout(async () => {
      setSavingObs(true)
      try {
        const res = await fetch(`/api/floorplan/propostas/${card.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ observacao: value }),
        })
        const json = await res.json()
        if (res.ok) onCardUpdate(card.id, { observacao: json.card.observacao })
      } finally { setSavingObs(false) }
    }, 800)
  }

  return (
    <div style={{ background: '#0d0d1f', border: `1px solid ${card.status === 'finalizado' ? 'rgba(52,211,153,0.25)' : '#1e1b4b'}`, borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#4c1d95)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="white" strokeWidth="1.8" fill="none" />
              <path d="M14 2v6h6M16 13H8M16 17H8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', margin: 0, wordBreak: 'break-word' }}>{card.nome}</p>
            <p style={{ fontSize: 11, color: '#4a4568', margin: 0 }}>{card.arquivos.length} arquivo{card.arquivos.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={handleDelete} disabled={deleting} style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 7, cursor: 'pointer', color: '#fca5a5', display: 'flex', alignItems: 'center', padding: '4px 6px', opacity: deleting ? 0.4 : 1, flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Status */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowStatusMenu(v => !v)}
          disabled={savingStatus}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 7, border: `1px solid ${statusAtual.border}`, background: statusAtual.bg, color: statusAtual.color, fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: savingStatus ? 0.6 : 1 }}
        >
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusAtual.color, flexShrink: 0 }} />
          {statusAtual.label}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 2 }}>
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {showStatusMenu && (
          <div
            style={{ position: 'absolute', top: '110%', left: 0, zIndex: 50, background: '#0d0d1f', border: '1px solid #1e1b4b', borderRadius: 10, padding: 6, minWidth: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
          >
            {STATUS_OPTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => handleStatusChange(s.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', borderRadius: 7, border: 'none', background: card.status === s.id ? s.bg : 'transparent', color: card.status === s.id ? s.color : '#7c6fa0', fontSize: 12, fontWeight: card.status === s.id ? 600 : 400, cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Observação */}
      <div>
        <label style={{ fontSize: 11, color: '#7c6fa0', display: 'block', marginBottom: 3 }}>
          Observação
          {savingObs && <span style={{ marginLeft: 6, color: '#4a4568' }}>salvando...</span>}
        </label>
        <textarea
          value={observacao}
          onChange={e => handleObsChange(e.target.value)}
          rows={2}
          placeholder="Adicione uma observação..."
          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #1e1b4b', background: '#08080f', color: '#f8fafc', fontSize: 12, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
        />
      </div>

      {/* Seções de arquivo */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {PROPOSTA_TIPOS.map(tipo => (
          <PropostaTipoSection
            key={tipo.id}
            cardId={card.id}
            tipo={tipo}
            arquivos={card.arquivos.filter(a => a.tipo === tipo.id)}
            onUploaded={a => onArquivoChange(card.id, a)}
            onDeleted={id => onArquivoChange(card.id, null, id)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── PropostasFloorPlan (Kanban) ───────────────────────────────────────────────

function PropostasFloorPlan() {
  const [cards, setCards] = useState<PropostaCard[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [nome, setNome] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    fetch('/api/floorplan/propostas')
      .then(r => r.json())
      .then(d => { if (d.cards) setCards(d.cards) })
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCreateError('')
    if (!nome.trim()) { setCreateError('Informe o nome da proposta.'); return }
    setCreating(true)
    try {
      const res = await fetch('/api/floorplan/propostas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      })
      const json = await res.json()
      if (!res.ok) { setCreateError(json.error ?? 'Erro ao criar.'); return }
      setCards(prev => [json.card, ...prev])
      setNome('')
      setShowForm(false)
    } catch {
      setCreateError('Erro de conexão.')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = (id: string) => setCards(prev => prev.filter(c => c.id !== id))

  const handleArquivoChange = (cardId: string, arquivo: PropostaArquivo | null, deletedId?: string) => {
    setCards(prev => prev.map(c => {
      if (c.id !== cardId) return c
      if (arquivo) return { ...c, arquivos: [...c.arquivos, arquivo] }
      if (deletedId) return { ...c, arquivos: c.arquivos.filter(a => a.id !== deletedId) }
      return c
    }))
  }

  const handleCardUpdate = (cardId: string, fields: Partial<PropostaCard>) => {
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, ...fields } : c))
  }

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', margin: 0 }}>Propostas Floor Plan</h2>
          <p style={{ fontSize: 13, color: '#7c6fa0', margin: '2px 0 0' }}>{cards.length} proposta{cards.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setCreateError('') }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#7c3aed,#4c1d95)', color: '#f8fafc', fontSize: 13, fontWeight: 600 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          Nova Proposta
        </button>
      </div>

      {/* Formulário nova proposta */}
      {showForm && (
        <form onSubmit={handleCreate} style={{ background: '#0d0d1f', border: '1px solid #1e1b4b', borderRadius: 12, padding: 14, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#a78bfa', margin: 0 }}>Nova Proposta</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: '#7c6fa0', display: 'block', marginBottom: 4 }}>Nome da Proposta</label>
              <input
                type="text"
                placeholder="Ex: Honda Civic - João Silva"
                value={nome}
                onChange={e => setNome(e.target.value)}
                autoFocus
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #1e1b4b', background: '#08080f', color: '#f8fafc', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <button type="submit" disabled={creating} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: creating ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#7c3aed,#4c1d95)', color: '#f8fafc', fontSize: 13, fontWeight: 600, opacity: creating ? 0.7 : 1, whiteSpace: 'nowrap' }}>
              {creating ? 'Criando...' : 'Criar'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #1e1b4b', cursor: 'pointer', background: 'transparent', color: '#7c6fa0', fontSize: 13 }}>✕</button>
          </div>
          {createError && <p style={{ fontSize: 11, color: '#fca5a5', margin: 0 }}>{createError}</p>}
        </form>
      )}

      {/* Kanban Board */}
      {loading ? (
        <p style={{ color: '#7c6fa0', fontSize: 14, textAlign: 'center', padding: 48 }}>Carregando...</p>
      ) : (
        <div
          style={{
            display: 'flex',
            gap: 12,
            overflowX: 'auto',
            paddingBottom: 16,
            alignItems: 'flex-start',
          }}
        >
          {STATUS_OPTIONS.map(status => {
            const colCards = cards.filter(c => c.status === status.id)
            return (
              <div
                key={status.id}
                style={{
                  flexShrink: 0,
                  width: 290,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {/* Cabeçalho da coluna */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: status.bg,
                    border: `1px solid ${status.border}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: status.color }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: status.color, letterSpacing: '0.03em' }}>
                      {status.label}
                    </span>
                  </div>
                  {colCards.length > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: status.color, background: 'rgba(0,0,0,0.2)', borderRadius: 99, padding: '1px 7px' }}>
                      {colCards.length}
                    </span>
                  )}
                </div>

                {/* Cards da coluna */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {colCards.map(card => (
                    <PropostaCardItem
                      key={card.id}
                      card={card}
                      onDelete={handleDelete}
                      onArquivoChange={handleArquivoChange}
                      onCardUpdate={handleCardUpdate}
                    />
                  ))}
                </div>

                {/* Coluna vazia */}
                {colCards.length === 0 && (
                  <div style={{ border: '1px dashed rgba(255,255,255,0.05)', borderRadius: 10, padding: '20px 12px', textAlign: 'center' }}>
                    <p style={{ color: '#2a2a3f', fontSize: 12, margin: 0 }}>Sem propostas</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── QuitacaoSubstituicao ──────────────────────────────────────────────────────

type QSType = 'quitacao' | 'substituicao'

interface QSCard {
  id: string
  tipo: QSType
  nome: string
  created_at: string
}

const QS_CONFIG: Record<QSType, { label: string; color: string; bg: string; border: string; gradient: string }> = {
  quitacao:    { label: 'Quitação',    color: '#fbbf24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.28)',  gradient: 'linear-gradient(135deg,#d97706,#92400e)' },
  substituicao:{ label: 'Substituição',color: '#22d3ee', bg: 'rgba(34,211,238,0.10)',  border: 'rgba(34,211,238,0.28)',  gradient: 'linear-gradient(135deg,#0891b2,#164e63)' },
}

function QSCardItem({ card, onDelete }: { card: QSCard; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false)
  const cfg = QS_CONFIG[card.tipo]

  const handleDelete = () => {
    if (!confirm(`Deletar "${card.nome}"?`)) return
    setDeleting(true)
    onDelete(card.id)
  }

  const dateStr = new Date(card.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <div style={{ background: '#0d0d1f', border: `1px solid ${cfg.border}`, borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: cfg.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {card.tipo === 'quitacao' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M7 16l-4-4 4-4M17 8l4 4-4 4M14 4l-4 16" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', margin: 0, wordBreak: 'break-word', lineHeight: 1.2 }}>{card.nome}</p>
            <p style={{ fontSize: 11, color: '#4a4568', margin: '2px 0 0' }}>{dateStr}</p>
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          title="Deletar"
          style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 7, cursor: 'pointer', color: '#fca5a5', display: 'flex', alignItems: 'center', padding: '4px 6px', opacity: deleting ? 0.4 : 1, flexShrink: 0 }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Badge tipo */}
      <div>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 6, padding: '3px 9px', textTransform: 'uppercase' }}>
          {cfg.label}
        </span>
      </div>
    </div>
  )
}

function QuitacaoSubstituicao() {
  const [cards, setCards] = useState<QSCard[]>([])
  const [creating, setCreating] = useState<QSType | null>(null)
  const [nome, setNome] = useState('')
  const [createError, setCreateError] = useState('')

  const openForm = (tipo: QSType) => {
    setCreating(tipo)
    setNome('')
    setCreateError('')
  }

  const closeForm = () => {
    setCreating(null)
    setNome('')
    setCreateError('')
  }

  const handleCreate = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!nome.trim()) { setCreateError('Informe um nome.'); return }
    const newCard: QSCard = {
      id: crypto.randomUUID(),
      tipo: creating!,
      nome: nome.trim(),
      created_at: new Date().toISOString(),
    }
    setCards(prev => [newCard, ...prev])
    closeForm()
  }

  const handleDelete = (id: string) => setCards(prev => prev.filter(c => c.id !== id))

  const cfg = creating ? QS_CONFIG[creating] : null

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', margin: 0 }}>Quitação e Substituição</h2>
          <p style={{ fontSize: 13, color: '#7c6fa0', margin: '2px 0 0' }}>{cards.length} registro{cards.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => openForm('quitacao')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: QS_CONFIG.quitacao.gradient, color: '#fff', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            Nova Quitação
          </button>
          <button
            onClick={() => openForm('substituicao')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: QS_CONFIG.substituicao.gradient, color: '#fff', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            Nova Substituição
          </button>
        </div>
      </div>

      {/* Formulário de criação */}
      {creating && cfg && (
        <form
          onSubmit={handleCreate}
          style={{ background: '#0d0d1f', border: `1px solid ${cfg.border}`, borderRadius: 12, padding: 14, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400 }}
        >
          <p style={{ fontSize: 13, fontWeight: 600, color: cfg.color, margin: 0 }}>Nova {cfg.label}</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: '#7c6fa0', display: 'block', marginBottom: 4 }}>Nome</label>
              <input
                type="text"
                placeholder={creating === 'quitacao' ? 'Ex: Honda Civic - João Silva' : 'Ex: Toyota Corolla → Honda HRV'}
                value={nome}
                onChange={e => setNome(e.target.value)}
                autoFocus
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${cfg.border}`, background: '#08080f', color: '#f8fafc', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <button
              type="submit"
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: cfg.gradient, color: '#fff', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}
            >
              Criar
            </button>
            <button
              type="button"
              onClick={closeForm}
              style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #1e1b4b', cursor: 'pointer', background: 'transparent', color: '#7c6fa0', fontSize: 13 }}
            >
              ✕
            </button>
          </div>
          {createError && <p style={{ fontSize: 11, color: '#fca5a5', margin: 0 }}>{createError}</p>}
        </form>
      )}

      {/* Grid de cards */}
      {cards.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: '#0d0d1f', border: '1px dashed #1e1b4b', borderRadius: 14 }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }}>
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="#7c6fa0" strokeWidth="1.5" fill="none" />
            <path d="M14 2v6h6M16 13H8M16 17H8" stroke="#7c6fa0" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p style={{ color: '#7c6fa0', fontSize: 14, margin: 0 }}>Nenhum registro ainda.</p>
          <p style={{ color: '#4a4568', fontSize: 13, marginTop: 4 }}>Clique em "Nova Quitação" ou "Nova Substituição" para começar.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, alignItems: 'start' }}>
          {cards.map(card => (
            <QSCardItem key={card.id} card={card} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── FloorPlanSection ──────────────────────────────────────────────────────────

type SubPage = 'juros' | 'propostas' | 'quitacao'

export default function FloorPlanSection() {
  const [subPage, setSubPage] = useState<SubPage>('juros')

  const SUB_ITEMS: { id: SubPage; label: string }[] = [
    { id: 'juros',     label: 'Cobrança de Juros'        },
    { id: 'propostas', label: 'Propostas Floor Plan'      },
    { id: 'quitacao',  label: 'Quitação e Substituição'   },
  ]

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', margin: 0 }}>Floor Plan</h1>
      </div>

      {/* Sub-navegação */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid #1e1b4b', paddingBottom: 12, flexWrap: 'wrap' }}>
        {SUB_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setSubPage(item.id)}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: subPage === item.id ? '1px solid rgba(124,58,237,0.30)' : '1px solid transparent',
              cursor: 'pointer',
              background: subPage === item.id ? 'rgba(124,58,237,0.12)' : 'transparent',
              color: subPage === item.id ? '#a78bfa' : '#7c6fa0',
              fontSize: 13,
              fontWeight: subPage === item.id ? 600 : 400,
              transition: 'all 0.15s',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {subPage === 'juros'     && <CobrancaJuros />}
      {subPage === 'propostas' && <PropostasFloorPlan />}
      {subPage === 'quitacao'  && <QuitacaoSubstituicao />}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

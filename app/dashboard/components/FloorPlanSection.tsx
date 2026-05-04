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

// ─── FloorPlanSection ──────────────────────────────────────────────────────────

export default function FloorPlanSection() {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', margin: 0 }}>Floor Plan</h1>
      </div>
      <CobrancaJuros />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

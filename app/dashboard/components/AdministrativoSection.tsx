'use client'

import { useState, useEffect, useRef } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────

type Tipo = 'api' | 'money_plus' | 'floor_plan'
type SubPage = 'cards' | 'carne'

interface Arquivo {
  id: string
  card_id: string
  tipo: Tipo
  nome: string
  tamanho: number
  checked: boolean
  created_at: string
}

interface Card {
  id: string
  data: string
  created_at: string
  enviado_carne: boolean
  arquivos: Arquivo[]
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const TIPOS: { id: Tipo; label: string; color: string; bg: string; border: string }[] = [
  { id: 'api',        label: 'API',        color: '#a78bfa', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.20)' },
  { id: 'money_plus', label: 'Money Plus', color: '#34d399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.20)' },
  { id: 'floor_plan', label: 'Floor Plan', color: '#60a5fa', bg: 'rgba(37,99,235,0.08)',  border: 'rgba(37,99,235,0.20)'  },
]

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── FileRow ───────────────────────────────────────────────────────────────────

function FileRow({ arquivo, color, onDelete, onCheckChange, readonly }: {
  arquivo: Arquivo
  color: string
  onDelete?: (id: string) => void
  onCheckChange?: (id: string, checked: boolean) => void
  readonly?: boolean
}) {
  const [deleting, setDeleting] = useState(false)
  const [checked, setChecked] = useState(arquivo.checked)
  const [savingCheck, setSavingCheck] = useState(false)

  const handleView = async () => {
    const res = await fetch(`/api/administrativo/arquivos/${arquivo.id}/view`)
    const json = await res.json()
    if (json.url) window.open(json.url, '_blank')
  }

  const handleDelete = async () => {
    if (!onDelete) return
    setDeleting(true)
    try {
      await fetch(`/api/administrativo/arquivos/${arquivo.id}`, { method: 'DELETE' })
      onDelete(arquivo.id)
    } catch {
      setDeleting(false)
    }
  }

  const handleCheck = async () => {
    const newVal = !checked
    setChecked(newVal)
    setSavingCheck(true)
    try {
      await fetch(`/api/administrativo/arquivos/${arquivo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checked: newVal }),
      })
      onCheckChange?.(arquivo.id, newVal)
    } catch {
      setChecked(!newVal)
    } finally {
      setSavingCheck(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: checked ? 'rgba(52,211,153,0.06)' : 'rgba(0,0,0,0.25)', borderRadius: 7, padding: '6px 8px', transition: 'background 0.2s' }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke={checked ? '#34d399' : color} strokeWidth="1.6" fill="none" />
        <path d="M14 2v6h6" stroke={checked ? '#34d399' : color} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span style={{ flex: 1, fontSize: 11, color: checked ? '#a3e6c8' : '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: checked ? 'line-through' : 'none', opacity: checked ? 0.7 : 1 }} title={arquivo.nome}>
        {arquivo.nome}
      </span>
      <span style={{ fontSize: 10, color: '#4a4568', whiteSpace: 'nowrap' }}>{formatSize(arquivo.tamanho)}</span>
      <button onClick={handleView} title="Visualizar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color, display: 'flex', alignItems: 'center' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8" fill="none" />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" fill="none" />
        </svg>
      </button>
      {!readonly && (
        <button onClick={handleDelete} disabled={deleting} title="Remover" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#fca5a5', display: 'flex', alignItems: 'center', opacity: deleting ? 0.4 : 1 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}
      <button
        onClick={handleCheck}
        disabled={savingCheck}
        title={checked ? 'Desmarcar' : 'Marcar'}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', opacity: savingCheck ? 0.5 : 1, flexShrink: 0 }}
      >
        <div style={{ width: 15, height: 15, borderRadius: 4, border: `1.5px solid ${checked ? '#34d399' : '#3a3a5c'}`, background: checked ? '#34d399' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
          {checked && (
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="#08080f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </button>
    </div>
  )
}

// ─── TipoSection ───────────────────────────────────────────────────────────────

function TipoSection({ cardId, tipo, arquivos, onUploaded, onDeleted, readonly }: {
  cardId: string
  tipo: (typeof TIPOS)[number]
  arquivos: Arquivo[]
  onUploaded?: (a: Arquivo) => void
  onDeleted?: (id: string) => void
  readonly?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)

  const handleFile = async (file: File) => {
    if (!onUploaded) return
    setError('')
    if (file.type !== 'application/pdf') { setError('Somente PDF.'); return }
    if (file.size > 20 * 1024 * 1024) { setError('Máximo 20MB.'); return }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('tipo', tipo.id)
      const res = await fetch(`/api/administrativo/cards/${cardId}/upload`, { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Erro ao enviar.'); return }
      onUploaded(json.arquivo)
    } catch {
      setError('Erro de conexão.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ background: tipo.bg, border: `1px solid ${tipo.border}`, borderRadius: 8, padding: '10px 10px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: tipo.color, textTransform: 'uppercase' }}>
          {tipo.label}
        </span>
        {arquivos.length > 0 && (
          <span style={{ fontSize: 10, color: tipo.color, opacity: 0.7 }}>{arquivos.length} CCB{arquivos.length > 1 ? 's' : ''}</span>
        )}
      </div>

      {arquivos.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {arquivos.map(a => (
            <FileRow key={a.id} arquivo={a} color={tipo.color} onDelete={onDeleted} readonly={readonly} />
          ))}
        </div>
      )}

      {!readonly && (
        <>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            onClick={() => !uploading && inputRef.current?.click()}
            style={{
              border: `1.5px dashed ${dragging ? tipo.color : tipo.border}`,
              borderRadius: 6,
              padding: '7px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: uploading ? 'not-allowed' : 'pointer',
              background: dragging ? tipo.bg : 'transparent',
              opacity: uploading ? 0.6 : 1,
              transition: 'border-color 0.15s',
            }}
          >
            {uploading ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
                <circle cx="12" cy="12" r="9" stroke={tipo.color} strokeWidth="2.5" strokeDasharray="28" strokeDashoffset="8" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <path d="M12 5v14M5 12h14" stroke={tipo.color} strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            )}
            <span style={{ fontSize: 11, color: '#7c6fa0' }}>{uploading ? 'Enviando...' : 'Adicionar CCB'}</span>
          </div>
          {error && <p style={{ fontSize: 10, color: '#fca5a5', margin: 0 }}>{error}</p>}
          <input ref={inputRef} type="file" accept="application/pdf" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
        </>
      )}

      {readonly && arquivos.length === 0 && (
        <p style={{ fontSize: 11, color: '#4a4568', margin: 0 }}>Sem CCBs</p>
      )}
    </div>
  )
}

// ─── CardItem ──────────────────────────────────────────────────────────────────

function CardItem({ card, onDelete, onArquivoChange, onToggleCarne, readonly }: {
  card: Card
  onDelete?: (id: string) => void
  onArquivoChange?: (cardId: string, arquivo: Arquivo | null, deletedId?: string) => void
  onToggleCarne?: (card: Card) => void
  readonly?: boolean
}) {
  const [deleting, setDeleting] = useState(false)
  const [sendingCarne, setSendingCarne] = useState(false)

  const handleDelete = async () => {
    if (!onDelete) return
    if (!confirm(`Deletar card de ${formatDate(card.data)}?`)) return
    setDeleting(true)
    try {
      await fetch(`/api/administrativo/cards/${card.id}`, { method: 'DELETE' })
      onDelete(card.id)
    } catch { setDeleting(false) }
  }

  const handleToggleCarne = async () => {
    if (!onToggleCarne) return
    setSendingCarne(true)
    try {
      const res = await fetch(`/api/administrativo/cards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enviado_carne: !card.enviado_carne }),
      })
      const json = await res.json()
      if (res.ok) onToggleCarne(json.card)
    } finally { setSendingCarne(false) }
  }

  return (
    <div style={{ background: '#0d0d1f', border: `1px solid ${card.enviado_carne ? 'rgba(52,211,153,0.25)' : '#1e1b4b'}`, borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#4c1d95)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="white" strokeWidth="1.8" fill="none" />
              <path d="M3 9h18" stroke="white" strokeWidth="1.8" />
              <path d="M8 2v4M16 2v4" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', margin: 0, lineHeight: 1.2 }}>{formatDate(card.data)}</p>
            <p style={{ fontSize: 11, color: '#4a4568', margin: 0 }}>{card.arquivos.length} arquivo{card.arquivos.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          {/* Botão enviar / remover do carnê */}
          {!readonly && (
            <button
              onClick={handleToggleCarne}
              disabled={sendingCarne}
              title={card.enviado_carne ? 'Remover do Carnê' : 'Enviar para Carnê'}
              style={{
                background: card.enviado_carne ? 'rgba(52,211,153,0.12)' : 'transparent',
                border: `1px solid ${card.enviado_carne ? 'rgba(52,211,153,0.35)' : 'rgba(52,211,153,0.25)'}`,
                borderRadius: 7,
                cursor: sendingCarne ? 'not-allowed' : 'pointer',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                opacity: sendingCarne ? 0.5 : 1,
                fontSize: 11,
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              {sendingCarne ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="28" strokeDashoffset="8" />
                </svg>
              ) : card.enviado_carne ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {card.enviado_carne ? 'No Carnê' : 'Enviar'}
            </button>
          )}

          {/* Deletar */}
          {!readonly && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              title="Deletar card"
              style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 7, cursor: 'pointer', color: '#fca5a5', display: 'flex', alignItems: 'center', padding: '4px 6px', opacity: deleting ? 0.4 : 1 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Seções */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {TIPOS.map(tipo => (
          <TipoSection
            key={tipo.id}
            cardId={card.id}
            tipo={tipo}
            arquivos={card.arquivos.filter(a => a.tipo === tipo.id)}
            onUploaded={onArquivoChange ? a => onArquivoChange(card.id, a) : undefined}
            onDeleted={onArquivoChange ? id => onArquivoChange(card.id, null, id) : undefined}
            readonly={readonly}
          />
        ))}
      </div>
    </div>
  )
}

// ─── CarneView ─────────────────────────────────────────────────────────────────

function CarneView({ cards, onToggleCarne }: {
  cards: Card[]
  onToggleCarne: (card: Card) => void
}) {
  const enviados = cards.filter(c => c.enviado_carne)

  if (enviados.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '56px 24px', background: '#0d0d1f', border: '1px dashed #1e1b4b', borderRadius: 14 }}>
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }}>
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="#7c6fa0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p style={{ color: '#7c6fa0', fontSize: 14, margin: 0 }}>Nenhum card enviado ao Carnê.</p>
        <p style={{ color: '#4a4568', fontSize: 13, marginTop: 4 }}>Na aba Cards, clique em "Enviar" em um card.</p>
      </div>
    )
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: '#7c6fa0', marginBottom: 16 }}>
        {enviados.length} card{enviados.length > 1 ? 's' : ''} no carnê
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, alignItems: 'start' }}>
        {enviados.map(card => (
          <CardItem
            key={card.id}
            card={card}
            onToggleCarne={onToggleCarne}
            readonly
          />
        ))}
      </div>
    </div>
  )
}

// ─── AdministrativoSection ─────────────────────────────────────────────────────

export default function AdministrativoSection() {
  const [subPage, setSubPage] = useState<SubPage>('cards')
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0])
  const [showForm, setShowForm] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    fetch('/api/administrativo/cards')
      .then(r => r.json())
      .then(d => { if (d.cards) setCards(d.cards) })
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCreateError('')
    if (!newDate) { setCreateError('Selecione uma data.'); return }
    if (cards.some(c => c.data === newDate)) { setCreateError('Já existe um card para essa data.'); return }

    setCreating(true)
    try {
      const res = await fetch('/api/administrativo/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: newDate }),
      })
      const json = await res.json()
      if (!res.ok) { setCreateError(json.error ?? 'Erro ao criar.'); return }
      setCards(prev => [json.card, ...prev])
      setShowForm(false)
      setNewDate(new Date().toISOString().split('T')[0])
    } catch {
      setCreateError('Erro de conexão.')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = (id: string) => setCards(prev => prev.filter(c => c.id !== id))

  const handleArquivoChange = (cardId: string, arquivo: Arquivo | null, deletedId?: string) => {
    setCards(prev => prev.map(c => {
      if (c.id !== cardId) return c
      if (arquivo) return { ...c, arquivos: [...c.arquivos, arquivo] }
      if (deletedId) return { ...c, arquivos: c.arquivos.filter(a => a.id !== deletedId) }
      return c
    }))
  }

  const handleToggleCarne = (updated: Card) => {
    setCards(prev => prev.map(c => c.id === updated.id ? { ...c, enviado_carne: updated.enviado_carne } : c))
  }

  const carneCount = cards.filter(c => c.enviado_carne).length

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', margin: 0 }}>Administrativo</h1>
          <p style={{ fontSize: 13, color: '#7c6fa0', margin: '2px 0 0' }}>CCBs por data</p>
        </div>

        {subPage === 'cards' && (
          <button
            onClick={() => { setShowForm(v => !v); setCreateError('') }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#7c3aed,#4c1d95)', color: '#f8fafc', fontSize: 13, fontWeight: 600 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            Novo Card
          </button>
        )}
      </div>

      {/* Sub-navegação */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid #1e1b4b', paddingBottom: 12 }}>
        {([
          { id: 'cards' as SubPage, label: 'Cards' },
          { id: 'carne' as SubPage, label: 'Envio de Carnê', badge: carneCount > 0 ? carneCount : undefined },
        ]).map(item => (
          <button
            key={item.id}
            onClick={() => setSubPage(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
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
            {item.badge !== undefined && (
              <span style={{ background: '#34d399', color: '#08080f', fontSize: 10, fontWeight: 700, borderRadius: 99, padding: '1px 6px', lineHeight: 1.4 }}>
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Formulário novo card */}
      {subPage === 'cards' && showForm && (
        <form
          onSubmit={handleCreate}
          style={{ background: '#0d0d1f', border: '1px solid #1e1b4b', borderRadius: 12, padding: 14, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 340 }}
        >
          <p style={{ fontSize: 13, fontWeight: 600, color: '#a78bfa', margin: 0 }}>Novo Card</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: '#7c6fa0', display: 'block', marginBottom: 4 }}>Data</label>
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
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

      {/* Conteúdo */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: '#7c6fa0', fontSize: 14 }}>Carregando...</p>
        </div>
      ) : subPage === 'carne' ? (
        <CarneView cards={cards} onToggleCarne={handleToggleCarne} />
      ) : cards.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: '#0d0d1f', border: '1px dashed #1e1b4b', borderRadius: 14 }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }}>
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="#7c6fa0" strokeWidth="1.5" fill="none" />
            <path d="M3 9h18" stroke="#7c6fa0" strokeWidth="1.5" />
            <path d="M8 2v4M16 2v4" stroke="#7c6fa0" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p style={{ color: '#7c6fa0', fontSize: 14, margin: 0 }}>Nenhum card criado ainda.</p>
          <p style={{ color: '#4a4568', fontSize: 13, marginTop: 4 }}>Clique em "Novo Card" para começar.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, alignItems: 'start' }}>
          {cards.map(card => (
            <CardItem
              key={card.id}
              card={card}
              onDelete={handleDelete}
              onArquivoChange={handleArquivoChange}
              onToggleCarne={handleToggleCarne}
            />
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

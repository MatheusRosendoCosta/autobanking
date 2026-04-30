'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import SelectOrCreate, { Option } from './SelectOrCreate'
import ImportModal from './ImportModal'

interface Cobranca {
  id: string
  cliente: string
  empresa_id: string
  empresa: { id: string; nome: string } | null
  loja_id: string
  loja: { id: string; nome: string } | null
  vendedor: string
  observacao: string
  created_at: string
}

interface FormData {
  cliente: string
  empresa: Option | null
  loja: Option | null
  vendedor: string
  observacao: string
}

const EMPTY_FORM: FormData = {
  cliente: '',
  empresa: null,
  loja: null,
  vendedor: '',
  observacao: '',
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function InputField({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#7c6fa0' }}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder:text-slate-600 outline-none transition-all"
        style={{
          background: '#0d0d1f',
          border: `1.5px solid ${focused ? '#7c3aed' : '#1e1b4b'}`,
          boxShadow: focused ? '0 0 0 3px rgba(124,58,237,0.12)' : 'none',
        }}
      />
    </div>
  )
}

function TextareaField({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#7c6fa0' }}>
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder:text-slate-600 outline-none transition-all resize-none"
        style={{
          background: '#0d0d1f',
          border: `1.5px solid ${focused ? '#7c3aed' : '#1e1b4b'}`,
          boxShadow: focused ? '0 0 0 3px rgba(124,58,237,0.12)' : 'none',
        }}
      />
    </div>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M9 5H7C5.9 5 5 5.9 5 7V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V7C19 5.9 18.1 5 17 5H15" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12 12H15M12 16H15M9 12H9.01M9 16H9.01" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" />
          <rect x="9" y="3" width="6" height="4" rx="1" stroke="#7c3aed" strokeWidth="1.8" />
        </svg>
      </div>
      <div className="text-center">
        <p className="font-semibold mb-1" style={{ color: '#f8fafc' }}>Nenhuma cobrança ainda</p>
        <p className="text-sm" style={{ color: '#7c6fa0' }}>Clique em "Nova Cobrança" para começar</p>
      </div>
      <button onClick={onNew}
        className="mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer transition-opacity hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}>
        + Nova Cobrança
      </button>
    </div>
  )
}

// ─── CobrancaRow ───────────────────────────────────────────────────────────────

function CobrancaRow({
  cobranca,
  editing,
  editValue,
  saving,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
  onDelete,
}: {
  cobranca: Cobranca
  editing: boolean
  editValue: string
  saving: boolean
  onEditStart: () => void
  onEditChange: (v: string) => void
  onEditSave: () => void
  onEditCancel: () => void
  onDelete: (id: string) => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [hovered, setHovered] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) textareaRef.current?.focus()
  }, [editing])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await fetch(`/api/cobrancas/${cobranca.id}`, { method: 'DELETE' })
      onDelete(cobranca.id)
    } finally {
      setDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <tr
      style={{ borderBottom: '1px solid #1e1b4b' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td className="py-3 px-4 text-sm" style={{ color: '#a78bfa' }}>{cobranca.loja?.nome ?? '—'}</td>
      <td className="py-3 px-4 text-sm font-medium" style={{ color: '#f8fafc' }}>{cobranca.cliente}</td>
      <td className="py-3 px-4 text-sm" style={{ color: '#e2e8f0' }}>{cobranca.vendedor}</td>

      {/* Observação — inline edit */}
      <td className="py-3 px-4" style={{ minWidth: 180 }}>
        {editing ? (
          <div className="flex flex-col gap-1.5">
            <textarea
              ref={textareaRef}
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEditSave() }
                if (e.key === 'Escape') onEditCancel()
              }}
              className="w-full px-3 py-1.5 rounded-lg text-sm text-white outline-none resize-none"
              style={{ background: '#12122a', border: '1.5px solid #7c3aed', boxShadow: '0 0 0 3px rgba(124,58,237,0.12)' }}
            />
            <div className="flex gap-1.5">
              <button
                onClick={onEditSave}
                disabled={saving}
                className="text-xs px-2.5 py-1 rounded-lg font-medium cursor-pointer disabled:opacity-50"
                style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}
              >
                {saving ? '...' : 'Salvar'}
              </button>
              <button
                onClick={onEditCancel}
                className="text-xs px-2.5 py-1 rounded-lg cursor-pointer"
                style={{ color: '#4b5563' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div
            className="flex items-start gap-2 group cursor-pointer rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors"
            style={{ minHeight: 28 }}
            onClick={onEditStart}
            title="Clique para editar"
          >
            <span className="text-sm flex-1" style={{ color: cobranca.observacao ? '#7c6fa0' : '#2d2b4e' }}>
              {cobranca.observacao || 'Adicionar observação...'}
            </span>
            {hovered && (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ color: '#4b5563', flexShrink: 0, marginTop: 2 }}>
                <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        )}
      </td>

      <td className="py-3 px-4 text-xs whitespace-nowrap" style={{ color: '#4b5563' }}>
        {new Date(cobranca.created_at).toLocaleDateString('pt-BR')}
      </td>

      <td className="py-3 px-4">
        {confirming ? (
          <div className="flex items-center gap-2">
            <button onClick={handleDelete} disabled={deleting}
              className="text-xs px-2.5 py-1 rounded-lg font-medium cursor-pointer disabled:opacity-50"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>
              {deleting ? '...' : 'Confirmar'}
            </button>
            <button onClick={() => setConfirming(false)}
              className="text-xs px-2.5 py-1 rounded-lg cursor-pointer" style={{ color: '#4b5563' }}>
              Cancelar
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)}
            className="text-xs px-2.5 py-1 rounded-lg cursor-pointer transition-all"
            style={{ color: hovered ? '#fca5a5' : 'transparent', border: '1px solid transparent' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.3)'
              ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent'
              ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            }}>
            Excluir
          </button>
        )}
      </td>
    </tr>
  )
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function saudacao(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Bom dia'
  if (h >= 12 && h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function buildWhatsappMessage(items: Cobranca[]): string {
  const byLoja = new Map<string, { nome: string; items: Cobranca[] }>()
  for (const c of items) {
    const key = c.loja_id ?? 'sem-loja'
    const nome = c.loja?.nome ?? 'Sem loja'
    if (!byLoja.has(key)) byLoja.set(key, { nome, items: [] })
    byLoja.get(key)!.items.push(c)
  }

  const lojas = Array.from(byLoja.values()).sort((a, b) => a.nome.localeCompare(b.nome))

  let msg = `${saudacao()} pessoal, tudo bem?\n\nEstamos com os seguintes casos aguardando.\n`
  for (const loja of lojas) {
    msg += `\n*${loja.nome}*\n\n`
    for (const c of loja.items) {
      msg += `Cliente - ${c.cliente}\nVendedor - ${c.vendedor}\n\n`
    }
  }

  return msg.trimEnd()
}

// ─── EmpresaGroup ──────────────────────────────────────────────────────────────

function EmpresaGroup({
  empresaNome, items, editingId, editValue, savingId,
  onEditStart, onEditChange, onEditSave, onEditCancel, onDelete,
}: {
  empresaNome: string
  items: Cobranca[]
  editingId: string | null
  editValue: string
  savingId: string | null
  onEditStart: (c: Cobranca) => void
  onEditChange: (v: string) => void
  onEditSave: () => void
  onEditCancel: () => void
  onDelete: (id: string) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    const msg = buildWhatsappMessage(items)
    navigator.clipboard.writeText(msg).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #1e1b4b' }}>
      {/* Empresa header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 cursor-pointer"
        style={{ background: '#0d0d1f' }}
        onClick={() => setCollapsed((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm" style={{ color: '#f8fafc' }}>{empresaNome}</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}>
            {items.length} cobrança{items.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Copy WhatsApp message */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all"
            style={{
              color: copied ? '#4ade80' : '#7c6fa0',
              border: `1px solid ${copied ? 'rgba(74,222,128,0.3)' : '#2d2b4e'}`,
              background: copied ? 'rgba(74,222,128,0.08)' : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (!copied) {
                (e.currentTarget as HTMLButtonElement).style.color = '#a78bfa'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(124,58,237,0.4)'
                ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(124,58,237,0.08)'
              }
            }}
            onMouseLeave={(e) => {
              if (!copied) {
                (e.currentTarget as HTMLButtonElement).style.color = '#7c6fa0'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#2d2b4e'
                ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              }
            }}
          >
            {copied ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Copiado!
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M22 16.74V4.67C22 3.47 21.02 2.5 19.82 2.5H9.18C7.98 2.5 7 3.47 7 4.67V16.74C7 17.94 7.98 18.91 9.18 18.91H19.82C21.02 18.91 22 17.94 22 16.74Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M17 18.91V20.5C17 21.05 16.55 21.5 16 21.5H4C3.45 21.5 3 21.05 3 20.5V8.5C3 7.95 3.45 7.5 4 7.5H7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Copiar mensagem
              </>
            )}
          </button>

          {/* Chevron */}
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            style={{ color: '#4b5563', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}
          >
            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Table */}
      {!collapsed && (
        <table className="w-full">
          <thead style={{ background: '#0a0a1a' }}>
            <tr>
              {['Loja', 'Cliente', 'Vendedor', 'Observação', 'Data', ''].map((h) => (
                <th key={h} className="py-2.5 px-4 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: '#4b5563', borderTop: '1px solid #1e1b4b' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody style={{ background: '#08080f' }}>
            {items.map((c) => (
              <CobrancaRow
                key={c.id}
                cobranca={c}
                editing={editingId === c.id}
                editValue={editValue}
                saving={savingId === c.id}
                onEditStart={() => onEditStart(c)}
                onEditChange={onEditChange}
                onEditSave={onEditSave}
                onEditCancel={onEditCancel}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ─── CobrancaSection ───────────────────────────────────────────────────────────

export default function CobrancaSection() {
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([])
  const [empresas, setEmpresas] = useState<Option[]>([])
  const [lojas, setLojas] = useState<Option[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  const reloadCobrancas = () =>
    fetch('/api/cobrancas')
      .then((r) => r.json())
      .then((data) => { if (data.cobrancas) setCobrancas(data.cobrancas) })
      .catch(() => {})

  useEffect(() => {
    reloadCobrancas()
    fetch('/api/empresas')
      .then((r) => r.json())
      .then((data) => { if (data.empresas) setEmpresas(data.empresas) })
      .catch(() => {})
  }, [])

  const grouped = useMemo(() => {
    const map = new Map<string, { nome: string; items: Cobranca[] }>()
    for (const c of cobrancas) {
      const key = c.empresa_id ?? 'sem-empresa'
      const nome = c.empresa?.nome ?? 'Sem empresa'
      if (!map.has(key)) map.set(key, { nome, items: [] })
      map.get(key)!.items.push(c)
    }
    return Array.from(map.entries()).sort((a, b) => a[1].nome.localeCompare(b[1].nome))
  }, [cobrancas])

  const handleEmpresaSelect = (empresa: Option) => {
    setForm((f) => ({ ...f, empresa, loja: null }))
    setLojas([])
    fetch(`/api/empresas/${empresa.id}/lojas`)
      .then((r) => r.json())
      .then((data) => { if (data.lojas) setLojas(data.lojas) })
      .catch(() => {})
  }

  const handleCreateEmpresa = async (nome: string): Promise<Option> => {
    const res = await fetch('/api/empresas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    const nova = data.empresa as Option
    setEmpresas((prev) => [...prev, nova].sort((a, b) => a.nome.localeCompare(b.nome)))
    return nova
  }

  const handleCreateLoja = async (nome: string): Promise<Option> => {
    if (!form.empresa) throw new Error('Selecione uma empresa primeiro')
    const res = await fetch(`/api/empresas/${form.empresa.id}/lojas`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    const nova = data.loja as Option
    setLojas((prev) => [...prev, nova].sort((a, b) => a.nome.localeCompare(b.nome)))
    return nova
  }

  const openModal = () => { setForm(EMPTY_FORM); setLojas([]); setError(''); setModalOpen(true) }
  const closeModal = () => setModalOpen(false)

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    if (!form.cliente.trim() || !form.empresa || !form.loja || !form.vendedor.trim()) {
      setError('Cliente, Empresa, Loja e Vendedor são obrigatórios')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/cobrancas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: form.cliente, empresa_id: form.empresa.id,
          loja_id: form.loja.id, vendedor: form.vendedor, observacao: form.observacao,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar')
      setCobrancas((prev) => [data.cobranca, ...prev])
      closeModal()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (c: Cobranca) => { setEditingId(c.id); setEditValue(c.observacao) }
  const cancelEdit = () => { setEditingId(null); setEditValue('') }

  const saveEdit = async () => {
    if (!editingId) return
    setSavingId(editingId)
    try {
      const res = await fetch(`/api/cobrancas/${editingId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observacao: editValue }),
      })
      if (res.ok) {
        setCobrancas((prev) =>
          prev.map((c) => c.id === editingId ? { ...c, observacao: editValue } : c)
        )
        setEditingId(null)
      }
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#f8fafc' }}>Cobrança</h2>
          <p className="text-sm mt-0.5" style={{ color: '#7c6fa0' }}>
            {cobrancas.length === 0
              ? 'Nenhum registro'
              : `${cobrancas.length} cobrança${cobrancas.length > 1 ? 's' : ''} em ${grouped.length} empresa${grouped.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all"
            style={{ color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.08)' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(124,58,237,0.15)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(124,58,237,0.08)')}
          >
            Importar Planilha
          </button>
          <button
            onClick={openModal}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}
          >
            + Nova Cobrança
          </button>
        </div>
      </div>

      {/* Content */}
      {cobrancas.length === 0 ? (
        <EmptyState onNew={openModal} />
      ) : (
        <div className="space-y-3">
          {grouped.map(([empresaId, { nome, items }]) => (
            <EmpresaGroup
              key={empresaId}
              empresaNome={nome}
              items={items}
              editingId={editingId}
              editValue={editValue}
              savingId={savingId}
              onEditStart={startEdit}
              onEditChange={setEditValue}
              onEditSave={saveEdit}
              onEditCancel={cancelEdit}
              onDelete={(id) => setCobrancas((prev) => prev.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      )}

      {/* Nova Cobrança modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="w-full max-w-lg rounded-2xl p-6"
            style={{ background: '#0d0d1f', border: '1px solid #1e1b4b', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold" style={{ color: '#f8fafc' }}>Nova Cobrança</h3>
              <button onClick={closeModal} className="text-xl leading-none cursor-pointer" style={{ color: '#4b5563' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#f8fafc')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#4b5563')}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <InputField label="Cliente" value={form.cliente}
                onChange={(v) => setForm((f) => ({ ...f, cliente: v }))} placeholder="Nome do cliente" />

              <div className="grid grid-cols-2 gap-4">
                <SelectOrCreate label="Empresa" options={empresas} selected={form.empresa}
                  onSelect={handleEmpresaSelect} onCreate={handleCreateEmpresa}
                  placeholder="Selecionar empresa..." />
                <SelectOrCreate label="Loja" options={lojas} selected={form.loja}
                  onSelect={(loja) => setForm((f) => ({ ...f, loja }))} onCreate={handleCreateLoja}
                  placeholder={form.empresa ? 'Selecionar loja...' : 'Selecione a empresa'}
                  disabled={!form.empresa} />
              </div>

              <InputField label="Vendedor" value={form.vendedor}
                onChange={(v) => setForm((f) => ({ ...f, vendedor: v }))} placeholder="Nome do vendedor" />

              <TextareaField label="Observação" value={form.observacao}
                onChange={(v) => setForm((f) => ({ ...f, observacao: v }))}
                placeholder="Informações adicionais..." />

              {error && (
                <p className="text-sm px-3 py-2 rounded-lg" style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.1)' }}>
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
                  style={{ background: 'transparent', border: '1px solid #1e1b4b', color: '#7c6fa0' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer transition-opacity disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}>
                  {loading ? 'Salvando...' : 'Salvar Cobrança'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import modal */}
      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onImported={reloadCobrancas}
        />
      )}
    </div>
  )
}

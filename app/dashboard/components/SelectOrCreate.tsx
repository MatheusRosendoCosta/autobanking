'use client'

import { useState, useRef, useEffect } from 'react'

export interface Option {
  id: string
  nome: string
}

interface SelectOrCreateProps {
  label: string
  options: Option[]
  selected: Option | null
  onSelect: (option: Option) => void
  onCreate: (nome: string) => Promise<Option>
  placeholder?: string
  disabled?: boolean
}

export default function SelectOrCreate({
  label,
  options,
  selected,
  onSelect,
  onCreate,
  placeholder = 'Selecionar...',
  disabled = false,
}: SelectOrCreateProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const filtered = options.filter((o) =>
    o.nome.toLowerCase().includes(search.toLowerCase())
  )
  const canCreate =
    search.trim() !== '' &&
    !options.some((o) => o.nome.toLowerCase() === search.trim().toLowerCase())

  const handleCreate = async () => {
    const nome = search.trim()
    if (!nome || creating) return
    setCreating(true)
    try {
      const newOption = await onCreate(nome)
      onSelect(newOption)
      setOpen(false)
      setSearch('')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <label
        className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
        style={{ color: '#7c6fa0' }}
      >
        {label}
      </label>

      <button
        type="button"
        disabled={disabled}
        onClick={() => { setOpen((v) => !v); setSearch('') }}
        className="w-full px-4 py-2.5 rounded-xl text-sm text-left outline-none transition-all flex items-center justify-between gap-2"
        style={{
          background: disabled ? '#0a0a1a' : '#0d0d1f',
          border: `1.5px solid ${open ? '#7c3aed' : '#1e1b4b'}`,
          boxShadow: open ? '0 0 0 3px rgba(124,58,237,0.12)' : 'none',
          color: selected ? '#f8fafc' : '#475569',
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <span className="truncate">{selected?.nome ?? placeholder}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          style={{
            flexShrink: 0,
            opacity: 0.5,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
          }}
        >
          <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden"
          style={{
            background: '#12122a',
            border: '1px solid #2d2b4e',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          {/* Search input */}
          <div className="p-2" style={{ borderBottom: '1px solid #1e1b4b' }}>
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && canCreate) handleCreate() }}
              placeholder="Buscar ou criar novo..."
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder:text-slate-600 outline-none"
              style={{ background: '#0d0d1f', border: '1px solid #1e1b4b' }}
            />
          </div>

          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && !canCreate && (
              <p className="px-4 py-3 text-sm" style={{ color: '#4b5563' }}>
                Nenhum resultado
              </p>
            )}

            {filtered.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => { onSelect(option); setOpen(false); setSearch('') }}
                className="w-full px-4 py-2.5 text-sm text-left transition-colors cursor-pointer"
                style={{
                  color: selected?.id === option.id ? '#a78bfa' : '#e2e8f0',
                  background: selected?.id === option.id ? 'rgba(124,58,237,0.1)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (selected?.id !== option.id)
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(124,58,237,0.06)'
                }}
                onMouseLeave={(e) => {
                  if (selected?.id !== option.id)
                    (e.currentTarget as HTMLButtonElement).style.background =
                      selected?.id === option.id ? 'rgba(124,58,237,0.1)' : 'transparent'
                }}
              >
                {option.nome}
              </button>
            ))}

            {canCreate && (
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="w-full px-4 py-2.5 text-sm text-left cursor-pointer transition-colors disabled:opacity-50"
                style={{
                  color: '#a78bfa',
                  borderTop: filtered.length > 0 ? '1px solid #1e1b4b' : 'none',
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(124,58,237,0.08)')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')
                }
              >
                {creating ? 'Criando...' : `+ Criar "${search.trim()}"`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

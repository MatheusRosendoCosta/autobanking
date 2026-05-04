'use client'

import { useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'

interface ImportRow {
  cliente: string
  empresa: string
  loja: string
  vendedor: string
  observacao: string
}

interface ImportResult {
  imported: number
  skipped: number
  errors: string[]
}

const REQUIRED_COLS = ['cliente', 'empresa', 'loja', 'vendedor']

function normalizeKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

const KEYWORD_MAP: Array<{ keyword: string; field: keyof ImportRow }> = [
  { keyword: 'cliente', field: 'cliente' },
  { keyword: 'empresa', field: 'empresa' },
  { keyword: 'loja', field: 'loja' },
  { keyword: 'vendedor', field: 'vendedor' },
  { keyword: 'observacao', field: 'observacao' },
]

function detectField(normalizedKey: string): keyof ImportRow | undefined {
  for (const { keyword, field } of KEYWORD_MAP) {
    if (normalizedKey.includes(keyword)) return field
  }
  return undefined
}

function parseFile(file: File): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

        if (raw.length === 0) {
          reject(new Error('A planilha está vazia'))
          return
        }

        const firstRow = raw[0]
        const headerMap: Record<string, keyof ImportRow> = {}
        for (const key of Object.keys(firstRow)) {
          const normalized = normalizeKey(key)
          const field = detectField(normalized)
          if (field && !Object.values(headerMap).includes(field)) {
            headerMap[key] = field
          }
        }

        const missing = REQUIRED_COLS.filter(
          (c) => !Object.values(headerMap).includes(c as keyof ImportRow)
        )
        if (missing.length > 0) {
          reject(new Error(`Colunas obrigatórias não encontradas: ${missing.join(', ').toUpperCase()}`))
          return
        }

        const rows: ImportRow[] = raw.map((r) => {
          const row: ImportRow = { cliente: '', empresa: '', loja: '', vendedor: '', observacao: '' }
          for (const [rawKey, mappedKey] of Object.entries(headerMap)) {
            row[mappedKey] = String(r[rawKey] ?? '').trim()
          }
          return row
        }).filter((r) => r.cliente || r.empresa || r.loja || r.vendedor)

        resolve(rows)
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Erro ao ler o arquivo'))
      }
    }
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo'))
    reader.readAsArrayBuffer(file)
  })
}

interface ImportModalProps {
  onClose: () => void
  onImported: () => void
}

type Step = 'upload' | 'preview' | 'result'

export default function ImportModal({ onClose, onImported }: ImportModalProps) {
  const [step, setStep] = useState<Step>('upload')
  const [rows, setRows] = useState<ImportRow[]>([])
  const [parseError, setParseError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setParseError('')
    try {
      const parsed = await parseFile(file)
      setRows(parsed)
      setStep('preview')
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Erro ao processar arquivo')
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleImport = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/cobrancas/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const data = await res.json()
      setResult(data)
      setStep('result')
      if (data.imported > 0) onImported()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl p-4 sm:p-6"
        style={{ background: '#0d0d1f', border: '1px solid #1e1b4b', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <div>
            <h3 className="text-base font-bold" style={{ color: '#f8fafc' }}>Importar Planilha</h3>
            <p className="text-xs mt-0.5" style={{ color: '#7c6fa0' }}>
              {step === 'upload' && 'Formatos aceitos: .xlsx, .xls, .csv'}
              {step === 'preview' && `${rows.length} registro${rows.length !== 1 ? 's' : ''} encontrado${rows.length !== 1 ? 's' : ''}`}
              {step === 'result' && 'Importação concluída'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-xl leading-none cursor-pointer"
            style={{ color: '#4b5563' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#f8fafc')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#4b5563')}
          >
            ×
          </button>
        </div>

        {/* ── UPLOAD ── */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className="rounded-xl p-8 sm:p-10 text-center cursor-pointer transition-all"
              style={{
                border: `2px dashed ${dragging ? '#7c3aed' : '#2d2b4e'}`,
                background: dragging ? 'rgba(124,58,237,0.06)' : 'transparent',
              }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 2V8H20M12 18V12M9 15L12 12L15 15" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#e2e8f0' }}>
                    Arraste o arquivo ou{' '}
                    <span style={{ color: '#a78bfa' }}>clique para selecionar</span>
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#4b5563' }}>
                    As colunas devem conter: CLIENTE · EMPRESA · LOJA · VENDEDOR · OBSERVAÇÃO (ex: "NOME VENDEDOR" é detectado automaticamente)
                  </p>
                </div>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={onFileChange}
              />
            </div>

            {parseError && (
              <p className="text-sm px-3 py-2 rounded-lg" style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.1)' }}>
                {parseError}
              </p>
            )}
          </div>
        )}

        {/* ── PREVIEW ── */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div
              className="rounded-xl overflow-auto"
              style={{ border: '1px solid #1e1b4b', maxHeight: 320 }}
            >
              <table className="w-full text-sm" style={{ minWidth: 480 }}>
                <thead style={{ background: '#12122a', position: 'sticky', top: 0 }}>
                  <tr>
                    {['Cliente', 'Empresa', 'Loja', 'Vendedor', 'Observação'].map((h) => (
                      <th key={h} className="py-2.5 px-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#7c6fa0', borderBottom: '1px solid #1e1b4b' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{ background: '#08080f' }}>
                  {rows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1a1a2e' }}>
                      <td className="py-2 px-3 whitespace-nowrap" style={{ color: '#f8fafc' }}>{row.cliente || <span style={{ color: '#4b5563' }}>—</span>}</td>
                      <td className="py-2 px-3 whitespace-nowrap" style={{ color: '#c4b5fd' }}>{row.empresa || <span style={{ color: '#4b5563' }}>—</span>}</td>
                      <td className="py-2 px-3 whitespace-nowrap" style={{ color: '#a78bfa' }}>{row.loja || <span style={{ color: '#4b5563' }}>—</span>}</td>
                      <td className="py-2 px-3 whitespace-nowrap" style={{ color: '#e2e8f0' }}>{row.vendedor || <span style={{ color: '#4b5563' }}>—</span>}</td>
                      <td className="py-2 px-3 max-w-xs truncate" style={{ color: '#7c6fa0' }}>{row.observacao || <span style={{ color: '#4b5563' }}>—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setStep('upload'); setRows([]) }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
                style={{ background: 'transparent', border: '1px solid #1e1b4b', color: '#7c6fa0' }}
              >
                Trocar arquivo
              </button>
              <button
                onClick={handleImport}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer transition-opacity disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}
              >
                {loading ? 'Importando...' : `Importar ${rows.length} registro${rows.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}

        {/* ── RESULT ── */}
        {step === 'result' && result && (
          <div className="space-y-4">
            <div className="rounded-xl p-4 sm:p-5 flex items-start gap-4"
              style={{
                background: result.imported > 0 ? 'rgba(124,58,237,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${result.imported > 0 ? 'rgba(124,58,237,0.2)' : 'rgba(239,68,68,0.2)'}`,
              }}>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: result.imported > 0 ? 'rgba(124,58,237,0.15)' : 'rgba(239,68,68,0.15)' }}
              >
                {result.imported > 0 ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17L4 12" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 9V13M12 17H12.01M12 3L2 20H22L12 3Z" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: '#f8fafc' }}>
                  {result.imported > 0
                    ? `${result.imported} cobrança${result.imported !== 1 ? 's' : ''} importada${result.imported !== 1 ? 's' : ''} com sucesso`
                    : 'Nenhuma cobrança nova foi importada'}
                </p>
                {result.skipped > 0 && (
                  <p className="text-xs mt-1" style={{ color: '#7c6fa0' }}>
                    {result.skipped} já existente{result.skipped !== 1 ? 's' : ''} ignorada{result.skipped !== 1 ? 's' : ''}
                  </p>
                )}
                {result.errors.length > 0 && (
                  <p className="text-xs mt-1" style={{ color: '#7c6fa0' }}>
                    {result.errors.length} erro{result.errors.length !== 1 ? 's' : ''} encontrado{result.errors.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="rounded-xl p-3 space-y-1 max-h-36 overflow-y-auto" style={{ background: '#08080f', border: '1px solid #1e1b4b' }}>
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs" style={{ color: '#fca5a5' }}>{err}</p>
                ))}
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}
            >
              Concluir
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

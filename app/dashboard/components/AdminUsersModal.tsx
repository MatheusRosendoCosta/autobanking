'use client'

import { useState, useEffect } from 'react'

const SECTIONS = [
  { id: 'cobranca',       label: 'Cobrança',       color: '#a78bfa' },
  { id: 'administrativo', label: 'Administrativo',  color: '#34d399' },
] as const

interface ManagedUser {
  id: string
  name: string
  email: string
  created_at: string
  permissions: string[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

export default function AdminUsersModal({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(d => { if (d.users) setUsers(d.users) })
      .finally(() => setLoading(false))
  }, [])

  const toggleSection = async (user: ManagedUser, section: string) => {
    const has = user.permissions.includes(section)
    const newPerms = has
      ? user.permissions.filter(s => s !== section)
      : [...user.permissions, section]

    setSaving(user.id + section)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: newPerms }),
      })
      const json = await res.json()
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, permissions: json.permissions } : u))
      }
    } finally {
      setSaving(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl flex flex-col"
        style={{ background: '#0d0d1f', border: '1px solid #1e1b4b', maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid #1e1b4b' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>Gerenciar Usuários</h2>
            <p style={{ fontSize: 12, color: '#7c6fa0', margin: '2px 0 0' }}>Libere o acesso por seção para cada usuário</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: '1px solid #1e1b4b', borderRadius: 8, cursor: 'pointer', color: '#7c6fa0', padding: '5px 8px', fontSize: 14 }}
          >
            ✕
          </button>
        </div>

        {/* Legenda seções */}
        <div className="flex gap-3 px-5 pt-4 pb-1">
          {SECTIONS.map(s => (
            <div key={s.id} className="flex items-center gap-1.5">
              <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
              <span style={{ fontSize: 11, color: '#7c6fa0' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Lista */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {loading ? (
            <p style={{ color: '#7c6fa0', fontSize: 14, textAlign: 'center', padding: 32 }}>Carregando...</p>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <p style={{ color: '#7c6fa0', fontSize: 14, margin: 0 }}>Nenhum usuário cadastrado ainda.</p>
              <p style={{ color: '#4a4568', fontSize: 13, marginTop: 4 }}>Quando alguém se registrar, aparecerá aqui.</p>
            </div>
          ) : (
            users.map(user => (
              <div
                key={user.id}
                style={{ background: '#08080f', border: '1px solid #1e1b4b', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                {/* Info usuário */}
                <div className="flex items-start justify-between gap-3">
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.name}
                    </p>
                    <p style={{ fontSize: 11, color: '#7c6fa0', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.email}
                    </p>
                  </div>
                  <span style={{ fontSize: 10, color: '#4a4568', whiteSpace: 'nowrap', flexShrink: 0, paddingTop: 2 }}>
                    Desde {formatDate(user.created_at)}
                  </span>
                </div>

                {/* Toggles de seção */}
                <div className="flex gap-2 flex-wrap">
                  {SECTIONS.map(section => {
                    const active = user.permissions.includes(section.id)
                    const isSaving = saving === user.id + section.id
                    return (
                      <button
                        key={section.id}
                        onClick={() => toggleSection(user, section.id)}
                        disabled={!!saving}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '5px 10px',
                          borderRadius: 7,
                          border: `1px solid ${active ? section.color : '#1e1b4b'}`,
                          background: active ? `${section.color}18` : 'transparent',
                          color: active ? section.color : '#4a4568',
                          fontSize: 11,
                          fontWeight: active ? 600 : 400,
                          cursor: saving ? 'not-allowed' : 'pointer',
                          opacity: isSaving ? 0.5 : 1,
                          transition: 'all 0.15s',
                        }}
                      >
                        {isSaving ? (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeDasharray="28" strokeDashoffset="8" />
                          </svg>
                        ) : active ? (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                          </svg>
                        )}
                        {section.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

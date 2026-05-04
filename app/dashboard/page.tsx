'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import CobrancaSection from './components/CobrancaSection'
import FloorPlanSection from './components/FloorPlanSection'
import AdministrativoSection from './components/AdministrativoSection'
import AdminUsersModal from './components/AdminUsersModal'

type Section = 'cobranca' | 'floorplan' | 'administrativo'

interface CurrentUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
  permissions: string[]
}

const ALL_NAV_ITEMS: { id: Section; label: string }[] = [
  { id: 'cobranca', label: 'Cobrança' },
  { id: 'floorplan', label: 'Floor Plan' },
  { id: 'administrativo', label: 'Administrativo' },
]

function AutoBankingLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="10" width="28" height="20" rx="3" stroke="white" strokeWidth="1.8" fill="none" />
      <path d="M4 16H32" stroke="white" strokeWidth="1.8" />
      <rect x="8" y="21" width="6" height="4" rx="1" fill="white" fillOpacity="0.8" />
      <rect x="17" y="21" width="4" height="4" rx="1" fill="white" fillOpacity="0.5" />
      <rect x="24" y="21" width="4" height="4" rx="1" fill="white" fillOpacity="0.5" />
      <path d="M11 10V7C11 5.895 11.895 5 13 5H23C24.105 5 25 5.895 25 7V10" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function HamburgerIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M18 6L6 18M6 6L18 18" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M3 12H21M3 6H21M3 18H21" stroke="#7c6fa0" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!form.current || !form.next || !form.confirm) {
      setError('Preencha todos os campos.')
      return
    }
    if (form.next !== form.confirm) {
      setError('A nova senha e a confirmação não coincidem.')
      return
    }
    if (form.next.length < 8) {
      setError('A nova senha deve ter pelo menos 8 caracteres.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erro ao alterar senha.')
      } else {
        setSuccess('Senha alterada com sucesso!')
        setForm({ current: '', next: '', confirm: '' })
      }
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 space-y-5"
        style={{ background: '#0d0d1f', border: '1px solid #1e1b4b' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-base font-bold" style={{ color: '#f8fafc' }}>Alterar Senha</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {(['current', 'next', 'confirm'] as const).map((field) => (
            <div key={field} className="space-y-1">
              <label className="text-xs font-medium" style={{ color: '#7c6fa0' }}>
                {field === 'current' ? 'Senha atual' : field === 'next' ? 'Nova senha' : 'Confirmar nova senha'}
              </label>
              <input
                type="password"
                value={form[field]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                style={{ background: '#08080f', border: '1px solid #1e1b4b', color: '#f8fafc' }}
              />
            </div>
          ))}

          {error && (
            <p className="text-xs rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </p>
          )}
          {success && (
            <p className="text-xs rounded-lg px-3 py-2" style={{ background: 'rgba(34,197,94,0.1)', color: '#86efac', border: '1px solid rgba(34,197,94,0.2)' }}>
              {success}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium cursor-pointer"
              style={{ color: '#7c6fa0', border: '1px solid #1e1b4b', background: 'transparent' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium cursor-pointer"
              style={{
                background: loading ? '#4c1d95' : 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)',
                color: '#f8fafc',
                border: 'none',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [active, setActive] = useState<Section>('cobranca')
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.user) {
          setCurrentUser(d.user)
          // Set first allowed section as active
          if (d.user.role !== 'admin' && d.user.permissions.length > 0) {
            setActive(d.user.permissions[0] as Section)
          }
        }
      })
      .catch(() => {})
  }, [])

  const isAdmin = currentUser?.role === 'admin'

  const navItems = ALL_NAV_ITEMS.filter(item =>
    isAdmin || (currentUser?.permissions ?? []).includes(item.id)
  )

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const closeMenu = () => setMenuOpen(false)

  return (
    <div className="min-h-screen" style={{ background: '#08080f' }}>
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
      {showAdminModal && <AdminUsersModal onClose={() => setShowAdminModal(false)} />}

      {/* Header */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-6 h-16"
        style={{
          background: '#0d0d1f',
          borderBottom: '1px solid #1e1b4b',
          boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)' }}
          >
            <AutoBankingLogo />
          </div>
          <span className="font-bold text-base tracking-wide" style={{ color: '#f8fafc' }}>
            AutoBanking
          </span>
        </div>

        {/* Nav — desktop only */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
              style={{
                color: active === item.id ? '#a78bfa' : '#7c6fa0',
                background: active === item.id ? 'rgba(124,58,237,0.12)' : 'transparent',
                border: active === item.id ? '1px solid rgba(124,58,237,0.25)' : '1px solid transparent',
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Actions — desktop only */}
        <div className="hidden md:flex items-center gap-2">
          {/* Botão admin — só para admin */}
          {isAdmin && (
            <button
              onClick={() => setShowAdminModal(true)}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5"
              style={{ color: '#34d399', border: '1px solid rgba(52,211,153,0.25)', background: 'transparent' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(52,211,153,0.08)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" fill="none" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              Usuários
            </button>
          )}

          <button
            onClick={() => setShowChangePassword(true)}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
            style={{ color: '#a78bfa', border: '1px solid rgba(124,58,237,0.25)', background: 'transparent' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(124,58,237,0.10)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            Alterar Senha
          </button>

          <button
            onClick={handleLogout}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
            style={{ color: '#7c6fa0', border: '1px solid #1e1b4b', background: 'transparent' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = '#fca5a5'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.3)'
              ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = '#7c6fa0'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#1e1b4b'
              ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            }}
          >
            Encerrar Sessão
          </button>
        </div>

        {/* Hamburger — mobile only */}
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg cursor-pointer transition-all"
          style={{
            border: '1px solid #1e1b4b',
            background: menuOpen ? 'rgba(124,58,237,0.1)' : 'transparent',
          }}
          aria-label="Menu"
        >
          <HamburgerIcon open={menuOpen} />
        </button>
      </header>

      {/* Mobile menu drawer */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40" style={{ top: 64 }}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={closeMenu} />
          <div className="relative z-10" style={{ background: '#0d0d1f', borderBottom: '1px solid #1e1b4b' }}>
            <nav className="p-3 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setActive(item.id); closeMenu() }}
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium text-left cursor-pointer transition-all"
                  style={{
                    color: active === item.id ? '#a78bfa' : '#7c6fa0',
                    background: active === item.id ? 'rgba(124,58,237,0.12)' : 'transparent',
                    border: active === item.id ? '1px solid rgba(124,58,237,0.25)' : '1px solid transparent',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="px-3 pb-3 space-y-2" style={{ borderTop: '1px solid #1e1b4b', paddingTop: 12 }}>
              {isAdmin && (
                <button
                  onClick={() => { setShowAdminModal(true); closeMenu() }}
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium text-left cursor-pointer"
                  style={{ color: '#34d399', border: '1px solid rgba(52,211,153,0.25)', background: 'transparent' }}
                >
                  Usuários
                </button>
              )}
              <button
                onClick={() => { setShowChangePassword(true); closeMenu() }}
                className="w-full px-4 py-3 rounded-xl text-sm font-medium text-left cursor-pointer"
                style={{ color: '#a78bfa', border: '1px solid rgba(124,58,237,0.25)', background: 'transparent' }}
              >
                Alterar Senha
              </button>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 rounded-xl text-sm font-medium text-left cursor-pointer"
                style={{ color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.06)' }}
              >
                Encerrar Sessão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="p-4 md:p-8">
        {navItems.length === 0 && currentUser !== null ? (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 14px', display: 'block', opacity: 0.3 }}>
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="#7c6fa0" strokeWidth="1.5" fill="none" />
              <path d="M7 11V7a5 5 0 0110 0v4" stroke="#7c6fa0" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p style={{ color: '#7c6fa0', fontSize: 15, margin: 0 }}>Aguardando liberação de acesso.</p>
            <p style={{ color: '#4a4568', fontSize: 13, marginTop: 6 }}>O administrador irá liberar as seções disponíveis para você.</p>
          </div>
        ) : (
          <>
            <div style={{ display: active === 'cobranca' ? 'block' : 'none' }}>
              <CobrancaSection />
            </div>
            <div style={{ display: active === 'floorplan' ? 'block' : 'none' }}>
              <FloorPlanSection />
            </div>
            <div style={{ display: active === 'administrativo' ? 'block' : 'none' }}>
              <AdministrativoSection />
            </div>
          </>
        )}
      </main>
    </div>
  )
}

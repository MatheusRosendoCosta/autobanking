'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CobrancaSection from './components/CobrancaSection'

type Section = 'cobranca' | 'floorplan' | 'administrativo'

const NAV_ITEMS: { id: Section; label: string }[] = [
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

export default function DashboardPage() {
  const router = useRouter()
  const [active, setActive] = useState<Section>('cobranca')

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div className="min-h-screen" style={{ background: '#08080f' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 h-16"
        style={{
          background: '#0d0d1f',
          borderBottom: '1px solid #1e1b4b',
          boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)' }}
          >
            <AutoBankingLogo />
          </div>
          <span className="font-bold text-base tracking-wide" style={{ color: '#f8fafc' }}>
            AutoBanking
          </span>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
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

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
          style={{ color: '#7c6fa0', border: '1px solid #1e1b4b' }}
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
          Sair
        </button>
      </header>

      {/* Content — todos os módulos ficam montados, apenas o ativo é visível */}
      <main className="p-8">
        <div style={{ display: active === 'cobranca' ? 'block' : 'none' }}>
          <CobrancaSection />
        </div>
        <div style={{ display: active === 'floorplan' ? 'block' : 'none' }}>
          <h1 className="text-xl font-bold mb-1" style={{ color: '#f8fafc' }}>Floor Plan</h1>
          <p className="text-sm" style={{ color: '#7c6fa0' }}>Módulo em construção...</p>
        </div>
        <div style={{ display: active === 'administrativo' ? 'block' : 'none' }}>
          <h1 className="text-xl font-bold mb-1" style={{ color: '#f8fafc' }}>Administrativo</h1>
          <p className="text-sm" style={{ color: '#7c6fa0' }}>Módulo em construção...</p>
        </div>
      </main>
    </div>
  )
}

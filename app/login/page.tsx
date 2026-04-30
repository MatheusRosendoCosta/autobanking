'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Step = 'login' | 'register'

interface FormData {
  name: string
  email: string
  password: string
  confirmPassword: string
}

function AutoBankingLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="10" width="28" height="20" rx="3" stroke="white" strokeWidth="1.8" fill="none" />
      <path d="M4 16H32" stroke="white" strokeWidth="1.8" />
      <rect x="8" y="21" width="6" height="4" rx="1" fill="white" fillOpacity="0.8" />
      <rect x="17" y="21" width="4" height="4" rx="1" fill="white" fillOpacity="0.5" />
      <rect x="24" y="21" width="4" height="4" rx="1" fill="white" fillOpacity="0.5" />
      <path d="M11 10V7C11 5.895 11.895 5 13 5H23C24.105 5 25 5.895 25 7V10" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function InputField({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = true,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: '#e2e8f0' }}>
        {label}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full px-4 py-3 rounded-xl text-white placeholder:text-slate-600 outline-none transition-all"
        style={{
          background: '#12122a',
          border: `1.5px solid ${focused ? '#7c3aed' : '#2d2b4e'}`,
          boxShadow: focused ? '0 0 0 3px rgba(124,58,237,0.15)' : 'none',
        }}
      />
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('login')
  const [form, setForm] = useState<FormData>({ name: '', email: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const setField = (field: keyof FormData) => (value: string) =>
    setForm((f) => ({ ...f, [field]: value }))

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao fazer login')
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError('As senhas não coincidem')
      return
    }
    if (form.password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao criar conta')
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const goToLogin = () => { setStep('login'); setError('') }
  const goToRegister = () => { setStep('register'); setError('') }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, #1e0a3c 0%, #08080f 65%)' }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)' }}
          >
            <AutoBankingLogo />
          </div>
          <h1 className="text-2xl font-bold tracking-wide" style={{ color: '#f8fafc' }}>
            AutoBanking
          </h1>
          <p className="text-sm mt-1" style={{ color: '#7c6fa0' }}>
            Sistema de Cobrança
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: '#0d0d1f',
            border: '1px solid #1e1b4b',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.05)',
          }}
        >
          {/* ── LOGIN ── */}
          {step === 'login' && (
            <>
              <h2 className="text-xl font-semibold mb-1" style={{ color: '#f8fafc' }}>
                Bem-vindo de volta
              </h2>
              <p className="text-sm mb-6" style={{ color: '#7c6fa0' }}>
                Entre com suas credenciais para acessar
              </p>

              <form onSubmit={handleLogin} className="space-y-4">
                <InputField
                  label="E-mail"
                  type="email"
                  value={form.email}
                  onChange={setField('email')}
                  placeholder="seu@email.com"
                />
                <InputField
                  label="Senha"
                  type="password"
                  value={form.password}
                  onChange={setField('password')}
                  placeholder="••••••••"
                />

                {error && (
                  <p className="text-sm px-3 py-2 rounded-lg" style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.1)' }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity disabled:opacity-50 cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>

              <p className="text-center text-sm mt-6" style={{ color: '#7c6fa0' }}>
                Não tem conta?{' '}
                <button onClick={goToRegister} className="font-medium cursor-pointer hover:underline" style={{ color: '#a78bfa' }}>
                  Criar conta
                </button>
              </p>
            </>
          )}

          {/* ── REGISTER ── */}
          {step === 'register' && (
            <>
              <h2 className="text-xl font-semibold mb-1" style={{ color: '#f8fafc' }}>
                Criar conta
              </h2>
              <p className="text-sm mb-6" style={{ color: '#7c6fa0' }}>
                Preencha os dados para se cadastrar
              </p>

              <form onSubmit={handleRegister} className="space-y-4">
                <InputField
                  label="Nome completo"
                  value={form.name}
                  onChange={setField('name')}
                  placeholder="Seu nome"
                />
                <InputField
                  label="E-mail"
                  type="email"
                  value={form.email}
                  onChange={setField('email')}
                  placeholder="seu@email.com"
                />
                <InputField
                  label="Senha"
                  type="password"
                  value={form.password}
                  onChange={setField('password')}
                  placeholder="Mínimo 8 caracteres"
                />
                <InputField
                  label="Confirmar senha"
                  type="password"
                  value={form.confirmPassword}
                  onChange={setField('confirmPassword')}
                  placeholder="••••••••"
                />

                {error && (
                  <p className="text-sm px-3 py-2 rounded-lg" style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.1)' }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity disabled:opacity-50 cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}
                >
                  {loading ? 'Criando conta...' : 'Criar conta'}
                </button>
              </form>

              <p className="text-center text-sm mt-6" style={{ color: '#7c6fa0' }}>
                Já tem conta?{' '}
                <button onClick={goToLogin} className="font-medium cursor-pointer hover:underline" style={{ color: '#a78bfa' }}>
                  Fazer login
                </button>
              </p>
            </>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#374151' }}>
          © 2026 AutoBanking. Todos os direitos reservados.
        </p>
      </div>
    </main>
  )
}

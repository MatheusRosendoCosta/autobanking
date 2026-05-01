import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
import { signToken } from '@/lib/jwt'
import { checkRateLimit, recordFailedAttempt, clearAttempts } from '@/lib/rateLimit'

function getRateLimitKey(request: NextRequest, email: string): string {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  return `login:${ip}:${email}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body as { email?: string; password?: string }

    if (!email?.trim() || !password) {
      return Response.json({ error: 'E-mail e senha são obrigatórios' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const rlKey = getRateLimitKey(request, normalizedEmail)

    const { allowed, retryAfterSecs } = checkRateLimit(rlKey)
    if (!allowed) {
      const mins = Math.ceil(retryAfterSecs / 60)
      return Response.json(
        { error: `Muitas tentativas. Tente novamente em ${mins} minuto${mins > 1 ? 's' : ''}.` },
        { status: 429, headers: { 'Retry-After': String(retryAfterSecs) } }
      )
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, name, email, password_hash')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (!user) {
      recordFailedAttempt(rlKey)
      return Response.json({ error: 'E-mail ou senha incorretos' }, { status: 401 })
    }

    const validPassword = await bcrypt.compare(password, user.password_hash)
    if (!validPassword) {
      recordFailedAttempt(rlKey)
      return Response.json({ error: 'E-mail ou senha incorretos' }, { status: 401 })
    }

    clearAttempts(rlKey)

    const token = signToken({ userId: user.id, email: user.email })

    const cookieStore = await cookies()
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return Response.json({ message: 'Login realizado com sucesso.', name: user.name })
  } catch (err) {
    console.error('[login]', err)
    return Response.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 })
  }
}

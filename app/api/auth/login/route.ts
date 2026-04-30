import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
import { signToken } from '@/lib/jwt'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body as { email?: string; password?: string }

    if (!email?.trim() || !password) {
      return Response.json({ error: 'E-mail e senha são obrigatórios' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const { data: user } = await supabase
      .from('users')
      .select('id, name, email, password_hash')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (!user) {
      return Response.json({ error: 'E-mail ou senha incorretos' }, { status: 401 })
    }

    const validPassword = await bcrypt.compare(password, user.password_hash)
    if (!validPassword) {
      return Response.json({ error: 'E-mail ou senha incorretos' }, { status: 401 })
    }

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

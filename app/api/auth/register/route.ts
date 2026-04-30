import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
import { signToken } from '@/lib/jwt'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password } = body as { name?: string; email?: string; password?: string }

    if (!name?.trim() || !email?.trim() || !password) {
      return Response.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 })
    }

    if (password.length < 8) {
      return Response.json({ error: 'A senha deve ter pelo menos 8 caracteres' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existing) {
      return Response.json({ error: 'Este e-mail já está cadastrado' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const { data: user, error: insertError } = await supabase
      .from('users')
      .insert({
        name: name.trim(),
        email: normalizedEmail,
        password_hash: passwordHash,
        email_verified: true,
      })
      .select('id, email')
      .single()

    if (insertError) throw insertError

    const token = signToken({ userId: user.id, email: user.email })

    const cookieStore = await cookies()
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return Response.json({ message: 'Conta criada com sucesso.', name: name.trim() }, { status: 201 })
  } catch (err) {
    console.error('[register]', err)
    return Response.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 })
  }
}

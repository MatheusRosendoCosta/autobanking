import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/jwt'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return Response.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    let payload: { userId: string; email: string }
    try {
      payload = verifyToken(token)
    } catch {
      return Response.json({ error: 'Sessão inválida.' }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body as {
      currentPassword?: string
      newPassword?: string
    }

    if (!currentPassword || !newPassword) {
      return Response.json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return Response.json({ error: 'A nova senha deve ter pelo menos 8 caracteres.' }, { status: 400 })
    }

    const { data: user } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', payload.userId)
      .maybeSingle()

    if (!user) {
      return Response.json({ error: 'Usuário não encontrado.' }, { status: 404 })
    }

    const valid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!valid) {
      return Response.json({ error: 'Senha atual incorreta.' }, { status: 400 })
    }

    const newHash = await bcrypt.hash(newPassword, 12)

    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', payload.userId)

    if (updateError) throw updateError

    return Response.json({ message: 'Senha alterada com sucesso.' })
  } catch (err) {
    console.error('[change-password]', err)
    return Response.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 })
  }
}

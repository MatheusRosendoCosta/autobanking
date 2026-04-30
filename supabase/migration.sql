-- AutoBanking — migração inicial
-- Execute este script no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.users (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  email            TEXT        UNIQUE NOT NULL,
  password_hash    TEXT        NOT NULL,
  email_verified   BOOLEAN     NOT NULL DEFAULT FALSE,
  otp_code         TEXT,
  otp_expires_at   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para buscas por e-mail
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (email);

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Row Level Security (o backend usa service role key, então RLS não bloqueia)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

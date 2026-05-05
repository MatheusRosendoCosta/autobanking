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

-- ─── Administrativo ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.administrativo_cards (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  data       DATE        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS adm_cards_user_idx ON public.administrativo_cards (user_id);

CREATE TABLE IF NOT EXISTS public.administrativo_arquivos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id     UUID        NOT NULL REFERENCES public.administrativo_cards(id) ON DELETE CASCADE,
  tipo        TEXT        NOT NULL CHECK (tipo IN ('api', 'money_plus', 'floor_plan')),
  nome        TEXT        NOT NULL,
  bucket_path TEXT        NOT NULL,
  tamanho     INTEGER     NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (card_id, tipo)
);

ALTER TABLE public.administrativo_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administrativo_arquivos ENABLE ROW LEVEL SECURITY;

-- ─── Quitação e Substituição ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.quitacao_cards (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tipo        TEXT        NOT NULL CHECK (tipo IN ('quitacao', 'substituicao')),
  nome        TEXT        NOT NULL,
  observacao  TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS qs_cards_user_idx ON public.quitacao_cards (user_id);

CREATE TABLE IF NOT EXISTS public.quitacao_arquivos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id     UUID        NOT NULL REFERENCES public.quitacao_cards(id) ON DELETE CASCADE,
  secao       TEXT        NOT NULL,
  nome        TEXT        NOT NULL,
  bucket_path TEXT        NOT NULL,
  tamanho     INTEGER     NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS qs_arquivos_card_idx ON public.quitacao_arquivos (card_id);

ALTER TABLE public.quitacao_cards   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quitacao_arquivos ENABLE ROW LEVEL SECURITY;

-- Adicionar coluna status (rodar separado se a tabela já existir)
ALTER TABLE public.quitacao_cards ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT '';

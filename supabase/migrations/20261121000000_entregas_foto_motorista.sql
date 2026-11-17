-- Foto do motorista (URL pública no bucket "assets", pasta fotos/motoristas)
-- Pode rodar mais de uma vez sem problema.
ALTER TABLE public.ent_motoristas ADD COLUMN IF NOT EXISTS foto_url TEXT;

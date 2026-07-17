-- Migração 006: capa do evento (mostrada no painel do anfitrião e na revelação).
-- Rode no SQL Editor do Supabase.

alter table events add column if not exists capa_url text;

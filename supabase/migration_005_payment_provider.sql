-- Migração 005: suporte a trocar de gateway de pagamento (Stripe <-> Mercado
-- Pago) sem perder o histórico — cada pagamento guarda qual provedor foi
-- usado na hora em que foi criado.
-- Rode no SQL Editor do Supabase.

alter table payments add column if not exists provider text not null default 'stripe'
  check (provider in ('stripe', 'mercadopago'));

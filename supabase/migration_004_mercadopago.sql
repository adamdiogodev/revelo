-- Migração 004: troca do gateway de pagamento (Stripe -> Mercado Pago).
-- Rode no SQL Editor do Supabase.

alter table payments add column if not exists mp_preference_id text;
alter table payments add column if not exists mp_payment_id text;

create unique index if not exists payments_mp_preference_id_idx on payments (mp_preference_id);

-- As colunas antigas do Stripe (stripe_session_id, stripe_payment_intent_id)
-- ficam sem uso a partir de agora — não removemos pra não perder histórico,
-- mas o código passa a preencher só as colunas mp_*.

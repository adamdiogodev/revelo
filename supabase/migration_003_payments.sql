-- Migração 003: cobrança por número de convidados (Stripe).
-- Rode no SQL Editor do Supabase.

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  max_convidados int not null,
  valor_centavos int not null,
  status text not null default 'pendente'
    check (status in ('pendente', 'pago', 'cortesia', 'cancelado')),
  stripe_session_id text,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists payments_event_id_idx on payments (event_id);
create unique index if not exists payments_stripe_session_id_idx on payments (stripe_session_id);

alter table payments enable row level security;
-- Sem policies — só o backend (service role) mexe aqui, igual às outras tabelas.

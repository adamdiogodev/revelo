-- Migração 002: login do anfitrião (Supabase Auth), código de acesso do
-- convidado e limite máximo de convidados por evento.
-- Rode no SQL Editor do Supabase (dashboard > SQL Editor > New query > Run).

alter table events
  add column if not exists host_user_id uuid references auth.users(id) on delete cascade;

alter table events
  add column if not exists codigo_acesso text not null
  default lpad((floor(random() * 10000))::int::text, 4, '0');

alter table events
  add column if not exists max_convidados int not null default 50;

create index if not exists events_host_user_id_idx on events (host_user_id);

-- Eventos criados antes do login existir ficam com host_user_id nulo
-- (não aparecem em nenhum painel /dashboard, mas continuam funcionando
-- normalmente para os convidados e são apagados no prazo normal de 24h
-- após a revelação, como qualquer outro evento).

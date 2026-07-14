-- Câmera Descartável de Festa — schema inicial
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase (dashboard > SQL Editor > New query > Run).

create extension if not exists pgcrypto;

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  reveal_at timestamptz not null,
  poses_por_convidado int not null default 12,
  modo_desafios boolean not null default false,
  host_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists challenges (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  titulo text not null,
  emoji text not null default '📸',
  created_at timestamptz not null default now()
);

create table if not exists guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  nome text not null,
  guest_token uuid not null default gen_random_uuid(),
  poses_usadas int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  guest_id uuid not null references guests(id) on delete cascade,
  storage_path text not null,
  taken_at timestamptz not null default now(),
  challenge_id uuid references challenges(id) on delete set null
);

create unique index if not exists events_slug_idx on events (slug);
create unique index if not exists events_host_token_idx on events (host_token);
create unique index if not exists guests_guest_token_idx on guests (guest_token);
create index if not exists guests_event_id_idx on guests (event_id);
create index if not exists photos_event_id_idx on photos (event_id);
create index if not exists photos_guest_id_idx on photos (guest_id);
create index if not exists photos_challenge_id_idx on photos (challenge_id);
create index if not exists challenges_event_id_idx on challenges (event_id);

-- RLS ligado em todas as tabelas e SEM policies para anon/authenticated:
-- isso bloqueia qualquer acesso direto do navegador via chave anon.
-- Toda leitura/escrita passa pelo backend Next.js usando a service role key,
-- que aplica as regras de negócio (limite de poses, hora da revelação) antes de tocar no banco.
alter table events enable row level security;
alter table guests enable row level security;
alter table photos enable row level security;
alter table challenges enable row level security;

-- Incrementa o contador de poses de um convidado de forma atômica,
-- validando no próprio banco (não confiar no relógio do cliente) que:
--   1) a revelação ainda não começou
--   2) o convidado ainda tem poses disponíveis
-- Evita condição de corrida quando duas requisições de upload chegam quase juntas.
create or replace function increment_guest_pose(p_guest_id uuid)
returns table (poses_usadas int, poses_por_convidado int, allowed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_limit int;
  v_reveal_at timestamptz;
  v_new_count int;
begin
  select g.event_id into v_event_id from guests g where g.id = p_guest_id;

  if v_event_id is null then
    return query select 0, 0, false;
    return;
  end if;

  select e.poses_por_convidado, e.reveal_at into v_limit, v_reveal_at
  from events e where e.id = v_event_id;

  if now() >= v_reveal_at then
    return query
      select g.poses_usadas, v_limit, false
      from guests g where g.id = p_guest_id;
    return;
  end if;

  update guests g
  set poses_usadas = g.poses_usadas + 1
  where g.id = p_guest_id
    and g.poses_usadas < v_limit
  returning g.poses_usadas into v_new_count;

  if v_new_count is null then
    select g.poses_usadas into v_new_count from guests g where g.id = p_guest_id;
    return query select v_new_count, v_limit, false;
  else
    return query select v_new_count, v_limit, true;
  end if;
end;
$$;

-- Compensação: usada apenas se o upload falhar depois que a pose já foi
-- consumida no banco, para devolver a pose ao convidado.
create or replace function decrement_guest_pose(p_guest_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update guests
  set poses_usadas = greatest(0, poses_usadas - 1)
  where id = p_guest_id;
$$;

create extension if not exists pgcrypto;

create table if not exists public.jeopardy_games (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Jeopardy Game',
  payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_jeopardy_games_updated_at on public.jeopardy_games;
create trigger trg_jeopardy_games_updated_at
before update on public.jeopardy_games
for each row
execute function public.set_updated_at();

alter table public.jeopardy_games enable row level security;

drop policy if exists "Public read jeopardy games" on public.jeopardy_games;
create policy "Public read jeopardy games"
on public.jeopardy_games
for select
to anon
using (true);

drop policy if exists "Public insert jeopardy games" on public.jeopardy_games;
create policy "Public insert jeopardy games"
on public.jeopardy_games
for insert
to anon
with check (true);

drop policy if exists "Public update jeopardy games" on public.jeopardy_games;
create policy "Public update jeopardy games"
on public.jeopardy_games
for update
to anon
using (true)
with check (true);

drop policy if exists "Public delete jeopardy games" on public.jeopardy_games;
create policy "Public delete jeopardy games"
on public.jeopardy_games
for delete
to anon
using (true);

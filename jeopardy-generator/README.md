# Jeopardy Generator

React + Vite app for building custom Jeopardy-style boards and running a live classroom game.

## Features
- Board editor (categories, rows, base score)
- Question/answer authoring for every cell
- Team setup (2-5 teams)
- Game mode with turn tracking and scoring
- Share links (view/edit) from active game
- JSON export/import
- CSV template download + CSV import (`category,value,question,answer`)
- Supabase game archive (save new / update / delete / view link)
- Editor support for game page background:
  - built-in local gallery from `public/backgrounds`
  - custom upload with validation (min `1920x1080`, approx `16:9`, up to `5MB`)

## Local Run
```bash
npm install
npm run dev
```

## Supabase Server Setup
1. Create a Supabase project.
2. In Supabase SQL Editor, run:
   - You can copy directly from [supabase/setup.sql](supabase/setup.sql)

```sql
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
```

3. Add environment variables in `.env.local`:

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

4. Restart dev server.

Notes:
- This policy setup is intentionally open (`anon`) for quick internal usage.
- For production, move to authenticated users and owner-based RLS policies.

## Build
```bash
npm run build
```

## Lint
```bash
npm run lint
```

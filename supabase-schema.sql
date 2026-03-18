-- QuizBlitz schema (run in Supabase SQL editor)

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  title text,
  host_id text not null,
  questions jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  quiz_code text not null references public.quizzes(code) on delete cascade,
  name text not null,
  score int not null default 0,
  joined_at timestamptz not null default now()
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  quiz_code text not null references public.quizzes(code) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  question_index int not null,
  answer int,
  time_taken int,
  points int not null default 0
);

-- Realtime
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.answers;

-- Basic RLS (demo-friendly). Tighten for production.
alter table public.quizzes enable row level security;
alter table public.players enable row level security;
alter table public.answers enable row level security;

create policy "quizzes read" on public.quizzes for select using (true);
create policy "quizzes insert" on public.quizzes for insert with check (true);

create policy "players read" on public.players for select using (true);
create policy "players insert" on public.players for insert with check (true);
create policy "players update" on public.players for update using (true) with check (true);

create policy "answers read" on public.answers for select using (true);
create policy "answers insert" on public.answers for insert with check (true);


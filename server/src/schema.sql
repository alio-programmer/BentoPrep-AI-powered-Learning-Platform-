-- =============================================================
-- BentoPrep — Supabase schema (Phase 1 MVP)
-- Run this in the Supabase SQL editor. It creates all tables,
-- indexes, triggers and RLS policies.
-- =============================================================

create extension if not exists "pgcrypto";

-- ---------- Profiles (one per auth user) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  target_role text,
  target_companies text[] default '{}',
  experience text,
  dsa_level text,
  pref_language text,
  daily_hours numeric,
  days_target integer,
  weak_topics text[] default '{}',
  onboarded boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- User settings (AI provider + API key) ----------
create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  ai_provider text default 'deepseek',
  ai_api_key text,
  ai_model text,
  ai_base_url text,
  updated_at timestamptz default now()
);

-- ---------- Problems ----------
create table if not exists public.problems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  platform text default 'Other',
  url text,
  difficulty text,
  topic text,
  date_solved timestamptz default now(),
  language text,
  time_taken_min integer,
  attempts integer default 1,
  solved_independently boolean default false,
  confidence integer,
  difficulty_experienced text,
  how_i_solved text,
  key_insight text,
  mistake text,
  why_first_failed text,
  pattern text,
  time_complexity text,
  space_complexity text,
  code text,
  alternative_approach text,
  when_to_use text,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- Memory cards (auto-created per solved problem) ----------
create table if not exists public.memory_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  problem_id uuid references public.problems(id) on delete cascade,
  front_title text not null,
  pattern text,
  core_insight text,
  mental_trigger text,
  time_complexity text,
  space_complexity text,
  mistake text,
  remember text,
  status text default 'new',
  notes text,
  tags text[] default '{}',
  -- spaced repetition state (SM-2)
  ease_factor numeric default 2.5,
  interval_days integer default 0,
  repetitions integer default 0,
  due_date timestamptz default now(),
  last_reviewed timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- Review history (spaced repetition log) ----------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.memory_cards(id) on delete cascade,
  review_date timestamptz default now(),
  outcome text,
  rating integer,
  interval_days integer,
  ease_factor numeric,
  next_due timestamptz
);

-- ---------- Roadmaps ----------
create table if not exists public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  duration_days integer,
  level text,
  target text,
  daily_availability text,
  track text default 'dsa',
  status text default 'active',
  created_at timestamptz default now()
);

-- ---------- Roadmap days (calendar) ----------
create table if not exists public.roadmap_days (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.roadmaps(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day_number integer not null,
  type text not null,
  title text,
  tasks jsonb default '[]',
  status text default 'pending',
  date timestamptz,
  created_at timestamptz default now(),
  unique (roadmap_id, day_number)
);

-- ---------- Study sessions (gamification / consistency) ----------
create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_date date default current_date,
  minutes integer default 0,
  confidence integer,
  completed boolean default false,
  created_at timestamptz default now(),
  unique (user_id, session_date)
);

-- ---------- SQL practice problems ----------
create table if not exists public.sql_problems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  topic text,
  difficulty text,
  url text,
  date_solved timestamptz default now(),
  time_taken_min integer,
  confidence integer,
  query text,
  approach text,
  mistake text,
  explanation text,
  complexity text,
  ai_review jsonb,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- Resumes (saved PDFs + AI analysis) ----------
create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  file_path text,
  content text,
  target_role text,
  job_description text,
  ai_analysis jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- Indexes ----------
create index if not exists idx_problems_user on public.problems(user_id);
create index if not exists idx_problems_topic on public.problems(topic);
create index if not exists idx_cards_user_due on public.memory_cards(user_id, due_date);
create index if not exists idx_cards_user on public.memory_cards(user_id);
create index if not exists idx_reviews_card on public.reviews(card_id);
create index if not exists idx_reviews_user on public.reviews(user_id);
create index if not exists idx_roadmap_days_roadmap on public.roadmap_days(roadmap_id, day_number);
create index if not exists idx_sessions_user_date on public.study_sessions(user_id, session_date);
create index if not exists idx_sql_user on public.sql_problems(user_id);
create index if not exists idx_sql_topic on public.sql_problems(topic);
create index if not exists idx_resumes_user on public.resumes(user_id);

-- ---------- Auto-create profile on signup ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- updated_at helper ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_problems_updated on public.problems;
create trigger trg_problems_updated before update on public.problems
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_cards_updated on public.memory_cards;
create trigger trg_cards_updated before update on public.memory_cards
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_sql_updated on public.sql_problems;
create trigger trg_sql_updated before update on public.sql_problems
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_resumes_updated on public.resumes;
create trigger trg_resumes_updated before update on public.resumes
  for each row execute procedure public.set_updated_at();

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.problems enable row level security;
alter table public.memory_cards enable row level security;
alter table public.reviews enable row level security;
alter table public.roadmaps enable row level security;
alter table public.roadmap_days enable row level security;
alter table public.study_sessions enable row level security;
alter table public.sql_problems enable row level security;
alter table public.resumes enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own settings" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own problems" on public.problems
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own cards" on public.memory_cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own reviews" on public.reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own roadmaps" on public.roadmaps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own roadmap days" on public.roadmap_days
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own sessions" on public.study_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own sql problems" on public.sql_problems
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own resumes" on public.resumes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

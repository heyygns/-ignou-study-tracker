-- ============================================================
-- IGNOU STUDY COMMAND CENTER — Supabase schema
-- Run this once in Supabase → SQL Editor → New query → Run
-- Safe to re-run: uses "create table if not exists" throughout.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- profiles  (1 row per user — settings + display name)
-- ------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text default '',
  weekday_windows jsonb default '[{"start":"06:15","end":"07:45","label":"Morning"},{"start":"21:30","end":"23:30","label":"Night"}]',
  weekend_windows jsonb default '[{"start":"07:00","end":"10:00","label":"Morning"},{"start":"16:00","end":"19:00","label":"Afternoon"}]',
  theme text default 'system',
  onboarded boolean default false,
  daily_goal_minutes int default 120,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------
-- subjects
-- ------------------------------------------------------------
create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  name text not null,
  exam_date date,
  exam_time text,
  sort_order int default 0,
  created_at timestamptz default now()
);
create index if not exists idx_subjects_user on subjects(user_id);

-- ------------------------------------------------------------
-- units  (syllabus units per subject)
-- ------------------------------------------------------------
create table if not exists units (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  unit_number int not null,
  title text default 'Needs verification',
  completed boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_units_user on units(user_id);
create index if not exists idx_units_subject on units(subject_id);

-- ------------------------------------------------------------
-- tasks  (daily planner items)
-- ------------------------------------------------------------
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references subjects(id) on delete set null,
  unit_id uuid references units(id) on delete set null,
  title text not null,
  task_date date not null,
  task_type text default 'study',        -- study | revision | pyq | answer | light
  duration_min int default 30,
  completed boolean default false,
  completed_at timestamptz,
  carried_forward boolean default false,
  original_date date,
  created_at timestamptz default now()
);
create index if not exists idx_tasks_user_date on tasks(user_id, task_date);

-- ------------------------------------------------------------
-- study_sessions  (timer logs)
-- ------------------------------------------------------------
create table if not exists study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references subjects(id) on delete set null,
  label text,
  start_time timestamptz not null,
  end_time timestamptz,
  duration_sec int default 0,
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_sessions_user on study_sessions(user_id, start_time);

-- ------------------------------------------------------------
-- resources  (SLM / PDF / YouTube / PYQ / website links)
-- ------------------------------------------------------------
create table if not exists resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references subjects(id) on delete cascade,
  unit_number int,
  title text not null,
  url text,
  type text default 'other',   -- slm | pdf | youtube | pyq | website | other
  source text default 'third-party',  -- official | egyankosh | third-party
  completed boolean default false,
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_resources_user on resources(user_id);
create index if not exists idx_resources_subject on resources(subject_id);

-- ------------------------------------------------------------
-- questions  (manual question bank)
-- ------------------------------------------------------------
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references subjects(id) on delete cascade,
  unit_number int,
  question text not null,
  importance text default 'medium',   -- low | medium | high
  status text default 'not_attempted',
  confidence text default 'weak',     -- weak | okay | strong
  last_attempted date,
  attempts int default 0,
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_questions_user on questions(user_id);

-- ------------------------------------------------------------
-- pyqs  (previous year question papers, per subject/year)
-- ------------------------------------------------------------
create table if not exists pyqs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references subjects(id) on delete cascade,
  year int,
  url text,
  completed boolean default false,
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_pyqs_user on pyqs(user_id);

-- ------------------------------------------------------------
-- answers  (answer-writing practice tracker)
-- ------------------------------------------------------------
create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references subjects(id) on delete cascade,
  question text not null,
  status text default 'not_attempted', -- not_attempted | outline | written | reviewed | needs_improvement
  word_count int,
  time_taken_min int,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_answers_user on answers(user_id);

-- ------------------------------------------------------------
-- notes
-- ------------------------------------------------------------
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references subjects(id) on delete set null,
  unit_number int,
  title text not null,
  content text default '',
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_notes_user on notes(user_id);

-- ------------------------------------------------------------
-- revisions  (spaced repetition schedule per unit)
-- ------------------------------------------------------------
create table if not exists revisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references subjects(id) on delete cascade,
  unit_id uuid references units(id) on delete cascade,
  stage text not null,          -- day1 | day3 | day7 | day14 | final
  due_date date not null,
  completed boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_revisions_user_due on revisions(user_id, due_date);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles        enable row level security;
alter table subjects        enable row level security;
alter table units           enable row level security;
alter table tasks           enable row level security;
alter table study_sessions  enable row level security;
alter table resources       enable row level security;
alter table questions       enable row level security;
alter table pyqs            enable row level security;
alter table answers         enable row level security;
alter table notes           enable row level security;
alter table revisions       enable row level security;

-- profiles: a user can only see/edit their own row
drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);
drop policy if exists "profiles_delete_own" on profiles;
create policy "profiles_delete_own" on profiles for delete using (auth.uid() = id);

-- generic pattern applied to every user-owned table below
do $$
declare
  t text;
begin
  foreach t in array array['subjects','units','tasks','study_sessions','resources','questions','pyqs','answers','notes','revisions']
  loop
    execute format('drop policy if exists "%1$s_select_own" on %1$s', t);
    execute format('create policy "%1$s_select_own" on %1$s for select using (auth.uid() = user_id)', t);

    execute format('drop policy if exists "%1$s_insert_own" on %1$s', t);
    execute format('create policy "%1$s_insert_own" on %1$s for insert with check (auth.uid() = user_id)', t);

    execute format('drop policy if exists "%1$s_update_own" on %1$s', t);
    execute format('create policy "%1$s_update_own" on %1$s for update using (auth.uid() = user_id)', t);

    execute format('drop policy if exists "%1$s_delete_own" on %1$s', t);
    execute format('create policy "%1$s_delete_own" on %1$s for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- auto-create a profile row when a new auth user signs up
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Done. Next: Project Settings → API → copy the Project URL
-- and the "anon public" key into js/config.js in the app.
-- ============================================================

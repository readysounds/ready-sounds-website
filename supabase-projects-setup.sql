-- Projects feature setup
-- Run this in the Supabase SQL editor

-- ── Tables ────────────────────────────────────────────────────────────────────

create table if not exists public.projects (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  name         text        not null,
  description  text,
  share_token  text        unique not null default encode(gen_random_bytes(12), 'base64'),
  created_at   timestamptz not null default now()
);

create table if not exists public.project_tracks (
  project_id  uuid        not null references public.projects(id) on delete cascade,
  track_id    bigint      not null,
  added_at    timestamptz not null default now(),
  primary key (project_id, track_id)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists projects_share_token_idx on public.projects(share_token);
create index if not exists project_tracks_project_id_idx on public.project_tracks(project_id);

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table public.projects enable row level security;
alter table public.project_tracks enable row level security;

-- Projects: anyone can SELECT (share links work without login)
create policy "Public read projects"
  on public.projects for select
  using (true);

-- Projects: owners can insert, update, delete
create policy "Users insert own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "Users update own projects"
  on public.projects for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

-- Project tracks: anyone can SELECT
create policy "Public read project tracks"
  on public.project_tracks for select
  using (true);

-- Project tracks: owners can insert and delete (via project ownership)
create policy "Users insert own project tracks"
  on public.project_tracks for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

create policy "Users delete own project tracks"
  on public.project_tracks for delete
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

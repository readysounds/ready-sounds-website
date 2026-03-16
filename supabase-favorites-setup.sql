-- user_favorites table
-- Run this in the Supabase SQL editor

create table if not exists user_favorites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  track_id   integer not null,
  created_at timestamptz default now(),
  unique (user_id, track_id)
);

-- RLS
alter table user_favorites enable row level security;

create policy "Users can read own favorites"
  on user_favorites for select
  using (auth.uid() = user_id);

create policy "Users can insert own favorites"
  on user_favorites for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own favorites"
  on user_favorites for delete
  using (auth.uid() = user_id);

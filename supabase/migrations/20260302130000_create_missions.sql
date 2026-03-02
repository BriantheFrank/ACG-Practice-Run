create extension if not exists pgcrypto;

create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  raw_input text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mission_versions (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  version_number bigint not null,
  raw_input text not null default '',
  references text,
  answers text,
  mpg_json jsonb,
  opord_json jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_mission_versions_mission_id on public.mission_versions(mission_id, created_at desc);
create unique index if not exists idx_mission_versions_mission_version on public.mission_versions(mission_id, version_number);

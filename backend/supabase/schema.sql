-- ============================================================
--  DMS Supabase Schema
--  Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- ── 1. Profiles (extends Supabase auth.users) ───────────────
create table if not exists public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  full_name   text not null default '',
  role        text not null default 'admin'
                check (role in ('superadmin', 'admin')),
  created_at  timestamptz not null default now()
);

-- Auto-create profile on new user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'admin')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 2. Folders ───────────────────────────────────────────────
create table if not exists public.folders (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references public.folders(id) on delete cascade,
  name        text not null,
  description text,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_folders_parent_id on public.folders(parent_id);

-- ── 3. Documents ─────────────────────────────────────────────
create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  folder_id     uuid not null references public.folders(id) on delete cascade,
  filename      text not null,
  original_name text not null,
  mime_type     text,
  size          bigint,
  storage_path  text not null,
  uploaded_by   uuid references public.profiles(id) on delete set null,
  uploaded_at   timestamptz not null default now()
);

create index if not exists idx_documents_folder_id on public.documents(folder_id);

-- ── 4. Share Links (PINs) ────────────────────────────────────
create table if not exists public.share_links (
  id          uuid primary key default gen_random_uuid(),
  folder_id   uuid not null references public.folders(id) on delete cascade,
  pin         char(5) not null,
  created_by  uuid references public.profiles(id) on delete set null,
  expires_at  timestamptz,
  max_uses    int,
  use_count   int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint uq_active_pin unique (pin, is_active)
);

create index if not exists idx_share_links_pin on public.share_links(pin);
create index if not exists idx_share_links_folder_id on public.share_links(folder_id);

-- ── 5. Access Logs ───────────────────────────────────────────
create table if not exists public.access_logs (
  id             uuid primary key default gen_random_uuid(),
  share_link_id  uuid references public.share_links(id) on delete cascade,
  accessed_at    timestamptz not null default now(),
  ip_address     text,
  user_agent     text,
  action         text not null default 'view'
                   check (action in ('view', 'download'))
);

create index if not exists idx_access_logs_share_link_id on public.access_logs(share_link_id);
create index if not exists idx_access_logs_accessed_at  on public.access_logs(accessed_at desc);

-- ── 6. Row Level Security ────────────────────────────────────
-- The backend uses the service-role key which bypasses RLS.
-- Enable RLS as a safety net for any direct client queries.

alter table public.profiles    enable row level security;
alter table public.folders     enable row level security;
alter table public.documents   enable row level security;
alter table public.share_links enable row level security;
alter table public.access_logs enable row level security;

-- Admins can read/write their own data (backend service-role bypasses this)
create policy "Authenticated users manage own profile"
  on public.profiles for all
  using (auth.uid() = id);

create policy "Authenticated users manage folders"
  on public.folders for all
  using (auth.role() = 'authenticated');

create policy "Authenticated users manage documents"
  on public.documents for all
  using (auth.role() = 'authenticated');

create policy "Authenticated users manage share_links"
  on public.share_links for all
  using (auth.role() = 'authenticated');

create policy "Authenticated users manage access_logs"
  on public.access_logs for all
  using (auth.role() = 'authenticated');

-- ── 7. Storage Bucket ────────────────────────────────────────
-- Run this separately in Supabase Storage settings OR via SQL:
-- insert into storage.buckets (id, name, public) values ('documents', 'documents', false);

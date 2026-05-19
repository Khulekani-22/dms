-- ============================================================
--  DMS Storage Policies
--  Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- Step 1: Ensure bucket exists with 50MB limit
insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 52428800)
on conflict (id) do update set file_size_limit = 52428800, public = false;

-- Step 2: Drop any previous restrictive per-role policies
drop policy if exists "DMS backend: allow upload" on storage.objects;
drop policy if exists "DMS backend: allow read" on storage.objects;
drop policy if exists "DMS backend: allow update" on storage.objects;
drop policy if exists "DMS backend: allow delete" on storage.objects;

-- Step 3: Single open policy for the documents bucket
-- (access is controlled at the API layer via JWT auth)
create policy "DMS documents: full access"
  on storage.objects
  for all
  using (bucket_id = 'documents')
  with check (bucket_id = 'documents');

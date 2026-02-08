-- Supabase Storage setup for user uploads
-- Creates a public `uploads` bucket and adds RLS policies.
-- This script is idempotent and safe to run multiple times.

-- 1) Create bucket (public)
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

-- 2) Policies on storage.objects
alter table storage.objects enable row level security;

drop policy if exists "Public can view uploads" on storage.objects;
drop policy if exists "Authenticated users can upload to uploads" on storage.objects;
drop policy if exists "Authenticated users can update their uploads" on storage.objects;
drop policy if exists "Authenticated users can delete their uploads" on storage.objects;

-- Public read (bucket is public; this keeps table access consistent too)
create policy "Public can view uploads"
on storage.objects for select
using (bucket_id = 'uploads');

-- Authenticated users can write only to paths that include their user id as the 2nd folder segment:
-- <folder>/<user_id>/<filename>
create policy "Authenticated users can upload to uploads"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'uploads'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "Authenticated users can update their uploads"
on storage.objects for update
to authenticated
using (
  bucket_id = 'uploads'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'uploads'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "Authenticated users can delete their uploads"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'uploads'
  and (storage.foldername(name))[2] = auth.uid()::text
);


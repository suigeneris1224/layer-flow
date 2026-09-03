-- ---------------------------------------------------------------------------
-- Cover photo
-- ---------------------------------------------------------------------------
-- Same shape as the avatars bucket added in 20250101001100_flock_ops.sql:
-- public-read so a plain <img src> works, writes fenced to a folder named for
-- the uploader's own uid (covers/<user id>/<file>).
alter table profiles add column cover_url text;

insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

create policy "covers_read_all"
  on storage.objects for select
  to authenticated, anon
  using (bucket_id = 'covers');

create policy "covers_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "covers_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "covers_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

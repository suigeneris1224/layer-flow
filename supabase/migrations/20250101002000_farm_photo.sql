-- ---------------------------------------------------------------------------
-- Farm photo
-- ---------------------------------------------------------------------------
-- Same shape as the avatars/covers buckets (20250101001100_flock_ops.sql,
-- 20250101001800_cover_photo.sql): public-read so a plain <img src> works,
-- writes fenced to a folder named for the farm's own id
-- (farm-photos/<farm id>/<file>). Unlike those, the fence checks farm
-- membership and role rather than auth.uid() directly, since the folder name
-- is a farm id, not a user id -- only the OWNER may change a farm's photo,
-- matching canManageFarmSettings.
alter table farms add column photo_url text;

insert into storage.buckets (id, name, public)
values ('farm-photos', 'farm-photos', true)
on conflict (id) do nothing;

create policy "farm_photos_read_all"
  on storage.objects for select
  to authenticated, anon
  using (bucket_id = 'farm-photos');

create policy "farm_photos_insert_owner"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'farm-photos'
    and exists (
      select 1 from farm_members
      where farm_members.farm_id = (storage.foldername(name))[1]::uuid
        and farm_members.user_id = auth.uid()
        and farm_members.role = 'OWNER'
    )
  );

create policy "farm_photos_update_owner"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'farm-photos'
    and exists (
      select 1 from farm_members
      where farm_members.farm_id = (storage.foldername(name))[1]::uuid
        and farm_members.user_id = auth.uid()
        and farm_members.role = 'OWNER'
    )
  )
  with check (
    bucket_id = 'farm-photos'
    and exists (
      select 1 from farm_members
      where farm_members.farm_id = (storage.foldername(name))[1]::uuid
        and farm_members.user_id = auth.uid()
        and farm_members.role = 'OWNER'
    )
  );

create policy "farm_photos_delete_owner"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'farm-photos'
    and exists (
      select 1 from farm_members
      where farm_members.farm_id = (storage.foldername(name))[1]::uuid
        and farm_members.user_id = auth.uid()
        and farm_members.role = 'OWNER'
    )
  );

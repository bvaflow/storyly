-- strory.fun — storage buckets
-- character-refs : public-read photos used as PuLID reference for image generation
-- panels         : public-read generated panel images

insert into storage.buckets (id, name, public)
values ('character-refs', 'character-refs', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('panels', 'panels', true)
on conflict (id) do nothing;

-- ----- character-refs policies -----

-- Anyone can read (so Fal.ai can fetch the reference image by URL)
create policy "character_refs_public_read"
  on storage.objects for select
  using (bucket_id = 'character-refs');

-- Authenticated users may upload only into a folder named after their user_id
create policy "character_refs_user_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'character-refs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "character_refs_user_update"
  on storage.objects for update
  using (
    bucket_id = 'character-refs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "character_refs_user_delete"
  on storage.objects for delete
  using (
    bucket_id = 'character-refs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ----- panels policies -----

create policy "panels_public_read"
  on storage.objects for select
  using (bucket_id = 'panels');

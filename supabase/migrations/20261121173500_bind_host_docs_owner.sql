drop policy if exists "hosts manage own docs" on storage.objects;
create policy "hosts manage own docs" on storage.objects for all to authenticated
using (bucket_id = 'host-docs' and owner_id = (select auth.uid()::text) and lower((storage.foldername(name))[1]) = lower((select auth.jwt()->>'email')))
with check (bucket_id = 'host-docs' and owner_id = (select auth.uid()::text) and lower((storage.foldername(name))[1]) = lower((select auth.jwt()->>'email')));

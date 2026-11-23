-- Approved removal of the exposed development password, restricted to four fixed test accounts.
-- Independent random values are generated and hashed inside PostgreSQL; none are returned.
begin;
do $block$
begin
  if (select count(*) from auth.users where
    (id='9583883b-77c9-4053-9efc-693877f3ea12' and lower(email)='info@georgiaadams.co.za') or
    (id='85261e3c-0bd6-497d-8538-09737d718981' and lower(email)='georgia.adams@smartify.co.za') or
    (id='fdd7e15d-485e-4c34-8ee6-e7dbac38a98f' and lower(email)='nonastasia@gmail.com') or
    (id='1ec456b0-6280-4732-9393-9e67991ffdfa' and lower(email)='elenanicolettis@icloud.com')) <> 4 then
    raise exception 'Test account identity guard failed';
  end if;
  update auth.users set encrypted_password=extensions.crypt(encode(extensions.gen_random_bytes(48),'hex'),extensions.gen_salt('bf')), updated_at=now()
  where id in ('9583883b-77c9-4053-9efc-693877f3ea12','85261e3c-0bd6-497d-8538-09737d718981','fdd7e15d-485e-4c34-8ee6-e7dbac38a98f','1ec456b0-6280-4732-9393-9e67991ffdfa');
end $block$;
commit;

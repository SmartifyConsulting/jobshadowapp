create or replace function public.send_mentor_welcome_pack() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.mentor_email is not null and not exists (
    select 1 from public.email_outbox where template = 'mentor_welcome_pack' and lower(recipient) = lower(trim(new.mentor_email))
  ) then
    insert into public.email_outbox(template, recipient, subject, body) values (
      'mentor_welcome_pack', new.mentor_email, 'Welcome to Job Shadow — you''ve been added as a mentor',
      format('Hi %s, thank you for hosting Job Shadow scholars at %s. You''ve been added as a mentor for the %s role. When a scholar books with you, you''ll receive an email, and you can view your placement and upcoming bookings any time in the Mentor Portal: register (or log in, if you already have an account) at https://jobshadow.co.za/register using this email address (%s), then open "Mentor Portal" from your account menu. If any of your details are incorrect, let us know at info@jobshadow.co.za.',
             coalesce(new.mentor_name, 'there'), new.company, new.career, new.mentor_email)
    );
  end if;
  return new;
end $$;

drop trigger if exists mentor_welcome_pack on public.companies;
create trigger mentor_welcome_pack after insert or update of mentor_email on public.companies
  for each row execute function public.send_mentor_welcome_pack();

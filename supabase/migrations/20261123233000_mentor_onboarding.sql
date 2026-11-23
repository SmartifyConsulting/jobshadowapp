-- Approved private Mentor onboarding submissions and Admin reviews.
begin;
create table public.mentor_onboarding_drafts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 current_step text not null default 'profile' check(current_step in ('profile','email','linkedin','references','training','employer','review')),
 data jsonb not null default '{}'::jsonb check(jsonb_typeof(data)='object' and octet_length(data::text)<=100000),
 updated_at timestamptz not null default now()
);
create table public.mentor_onboarding_reviews (
 user_id uuid primary key references auth.users(id) on delete cascade,
 references_status text not null default 'pending' check(references_status in ('pending','approved','changes_requested')),
 training_status text not null default 'pending' check(training_status in ('pending','approved','changes_requested')),
 employer_status text not null default 'pending' check(employer_status in ('pending','approved','changes_requested')),
 final_status text not null default 'pending' check(final_status in ('pending','approved','changes_requested')),
 notes jsonb not null default '{}'::jsonb check(jsonb_typeof(notes)='object' and octet_length(notes::text)<=20000),
 reviewed_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now()
);
alter table public.mentor_onboarding_drafts enable row level security;
alter table public.mentor_onboarding_reviews enable row level security;
revoke all on public.mentor_onboarding_drafts,public.mentor_onboarding_reviews from public,anon,authenticated;
grant select,insert,update on public.mentor_onboarding_drafts to authenticated;
grant select on public.mentor_onboarding_reviews to authenticated;
grant all on public.mentor_onboarding_drafts,public.mentor_onboarding_reviews to service_role;
create policy mentor_draft_read on public.mentor_onboarding_drafts for select to authenticated using(user_id=auth.uid() or public.has_role(auth.uid(),'admin'));
create policy mentor_draft_insert on public.mentor_onboarding_drafts for insert to authenticated with check(user_id=auth.uid() and (public.has_role(auth.uid(),'mentor') or public.has_role(auth.uid(),'admin')));
create policy mentor_draft_update on public.mentor_onboarding_drafts for update to authenticated using(user_id=auth.uid() and (public.has_role(auth.uid(),'mentor') or public.has_role(auth.uid(),'admin'))) with check(user_id=auth.uid());
create policy mentor_review_read on public.mentor_onboarding_reviews for select to authenticated using(user_id=auth.uid() or public.has_role(auth.uid(),'admin'));

-- Only an existing Admin may record review outcomes. No roles or placement availability are changed.
create or replace function public.review_mentor_onboarding(_user_id uuid,_references_status text,_training_status text,_employer_status text,_final_status text,_notes jsonb,_expected_updated_at timestamptz default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.host_profiles; u auth.users; draft public.mentor_onboarding_drafts; profile_ready boolean;
begin
 if auth.uid() is null or not public.has_role(auth.uid(),'admin') then raise exception 'Admin access is required.'; end if;
 select * into u from auth.users where id=_user_id;
 if not found then raise exception 'Mentor account not found.'; end if;
 if not public.has_role(_user_id,'mentor') then raise exception 'This account is not a mentor.'; end if;
 select * into p from public.host_profiles where lower(mentor_email)=lower(u.email);
 select * into draft from public.mentor_onboarding_drafts where user_id=_user_id for update;
 if _expected_updated_at is not null and draft.updated_at is distinct from _expected_updated_at then raise exception 'This submission changed. Refresh it before reviewing.'; end if;
 if _references_status='approved' and (draft.user_id is null or coalesce(draft.data->>'references_submitted','false')<>'true' or jsonb_typeof(draft.data->'references') is distinct from 'array' or jsonb_array_length(draft.data->'references')=0) then raise exception 'A submitted reference is required before approving references.'; end if;
 if _training_status='approved' and (draft.user_id is null or coalesce(draft.data->>'training_submitted','false')<>'true' or coalesce(trim(draft.data->'training'->>'name'),'')='' or coalesce(trim(draft.data->'training'->>'provider'),'')='' or (coalesce(trim(draft.data->'training'->>'evidence_path'),'')='' and coalesce(trim(draft.data->'training'->>'link'),'')='')) then raise exception 'Submitted training details and evidence are required.'; end if;
 if coalesce(p.via_company,false) and _employer_status='approved' and (draft.user_id is null or coalesce(draft.data->>'employer_submitted','false')<>'true') then raise exception 'Submitted employer sign-off is required.'; end if;
 if _final_status='approved' then
  select coalesce(length(trim(first_name))>0 and length(trim(last_name))>0,false) into profile_ready from public.profiles where user_id=_user_id;
  if not coalesce(profile_ready,false) or coalesce(trim(p.bio),'')='' or coalesce(array_length(p.specialties,1),0)=0 then raise exception 'Complete the mentor profile before final approval.'; end if;
  if u.email_confirmed_at is null then raise exception 'The mentor email is not verified.'; end if;
  if _references_status is distinct from 'approved' or _training_status is distinct from 'approved' then raise exception 'Approve the references and safeguarding training before final approval.'; end if;
  if coalesce(p.via_company,false) and _employer_status is distinct from 'approved' then raise exception 'Employer sign-off is required for company mentors.'; end if;
  if draft.user_id is null or coalesce(trim(draft.data->>'references_submitted'),'')<>'true' or coalesce(trim(draft.data->>'training_submitted'),'')<>'true' then raise exception 'Reference and training submissions are required.'; end if;
  if coalesce(p.via_company,false) and coalesce(trim(draft.data->>'employer_submitted'),'')<>'true' then raise exception 'An employer submission is required.'; end if;
 end if;
 insert into public.mentor_onboarding_reviews(user_id,references_status,training_status,employer_status,final_status,notes,reviewed_by,updated_at)
 values(_user_id,_references_status,_training_status,_employer_status,_final_status,coalesce(_notes,'{}'::jsonb),auth.uid(),now())
 on conflict(user_id) do update set references_status=excluded.references_status,training_status=excluded.training_status,employer_status=excluded.employer_status,final_status=excluded.final_status,notes=excluded.notes,reviewed_by=excluded.reviewed_by,updated_at=excluded.updated_at;
end $$;
revoke all on function public.review_mentor_onboarding(uuid,text,text,text,text,jsonb,timestamptz) from public,anon;
grant execute on function public.review_mentor_onboarding(uuid,text,text,text,text,jsonb,timestamptz) to authenticated;
-- Editing submitted evidence invalidates its previous review and final sign-off.
create or replace function public.reset_mentor_draft_review() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.data is distinct from old.data then
  update public.mentor_onboarding_reviews set
   references_status=case when (new.data->'references') is distinct from (old.data->'references') or (new.data->'references_submitted') is distinct from (old.data->'references_submitted') then 'pending' else references_status end,
   training_status=case when (new.data->'training') is distinct from (old.data->'training') or (new.data->'training_submitted') is distinct from (old.data->'training_submitted') then 'pending' else training_status end,
   employer_status=case when (new.data->'employer') is distinct from (old.data->'employer') or (new.data->'employer_submitted') is distinct from (old.data->'employer_submitted') then 'pending' else employer_status end,
   final_status='pending',updated_at=clock_timestamp() where user_id=new.user_id;
 end if;
 new.updated_at:=clock_timestamp();
 return new;
end $$;
revoke all on function public.reset_mentor_draft_review() from public,anon,authenticated;
create trigger mentor_draft_review_reset before update on public.mentor_onboarding_drafts for each row execute function public.reset_mentor_draft_review();

create or replace function public.reset_mentor_profile_review() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update public.mentor_onboarding_reviews set final_status='pending',updated_at=clock_timestamp()
 where user_id in(select id from auth.users where lower(email)=lower(new.mentor_email));
 update public.mentor_onboarding_drafts set updated_at=clock_timestamp() where user_id in(select id from auth.users where lower(email)=lower(new.mentor_email));
 return new;
end $$;
revoke all on function public.reset_mentor_profile_review() from public,anon,authenticated;
create trigger mentor_profile_review_reset after update of bio,specialties,certifications,cv_path,linkedin_url,via_company on public.host_profiles for each row
 when(old.bio is distinct from new.bio or old.specialties is distinct from new.specialties or old.certifications is distinct from new.certifications or old.cv_path is distinct from new.cv_path or old.linkedin_url is distinct from new.linkedin_url or old.via_company is distinct from new.via_company)
 execute function public.reset_mentor_profile_review();

create or replace function public.reset_mentor_name_review() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update public.mentor_onboarding_reviews set final_status='pending',updated_at=clock_timestamp() where user_id=new.user_id;
 update public.mentor_onboarding_drafts set updated_at=clock_timestamp() where user_id=new.user_id;
 return new;
end $$;
revoke all on function public.reset_mentor_name_review() from public,anon,authenticated;
create trigger mentor_name_review_reset after update of first_name,last_name on public.profiles for each row when(old.first_name is distinct from new.first_name or old.last_name is distinct from new.last_name) execute function public.reset_mentor_name_review();

commit;

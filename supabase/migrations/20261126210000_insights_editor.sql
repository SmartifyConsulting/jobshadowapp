-- Admin-authored Insights; public access is restricted to published records.
begin;
create table public.insights (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 title text not null check (char_length(trim(title)) between 1 and 200),
 kind text not null default 'article' check (kind in ('article','news')),
 excerpt text not null default '' check (char_length(excerpt)<=500),
 author_name text not null default '' check (char_length(author_name)<=150),
 body text not null check (char_length(trim(body)) between 1 and 100000),
 cover_image_url text not null default '' check (cover_image_url='' or cover_image_url ~ '^/assets/[^?#]+$' or cover_image_url ~ '^https://'),
 status text not null default 'draft' check (status in ('draft','published','archived')),
 published_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (status<>'published' or published_at is not null)
);
create index insights_publication_idx on public.insights (status,published_at desc);
alter table public.insights enable row level security;
revoke all on public.insights from anon, authenticated;
grant select on public.insights to anon;
grant select,insert,update,delete on public.insights to authenticated;
create policy "public reads published insights" on public.insights for select to anon,authenticated using (status='published');
create policy "admins read all insights" on public.insights for select to authenticated using(public.has_role(auth.uid(),'admin'::public.app_role));
create policy "admins create insights" on public.insights for insert to authenticated with check(public.has_role(auth.uid(),'admin'::public.app_role));
create policy "admins update insights" on public.insights for update to authenticated using(public.has_role(auth.uid(),'admin'::public.app_role)) with check(public.has_role(auth.uid(),'admin'::public.app_role));
create policy "admins delete drafts" on public.insights for delete to authenticated using(status='draft' and public.has_role(auth.uid(),'admin'::public.app_role));
create function public.stamp_insight() returns trigger language plpgsql set search_path=public as $$
begin
 new.updated_at:=now();
 if new.status='published' and new.published_at is null then new.published_at:=now(); end if;
 return new;
end;$$;
revoke all on function public.stamp_insight() from public;
create trigger stamp_insight before insert or update on public.insights for each row execute function public.stamp_insight();
insert into public.insights(slug,title,kind,excerpt,author_name,body,cover_image_url,status,published_at) values(
 'before-they-choose-a-career-let-them-experience-it',
 'Before They Choose a Career, Let Them Experience It',
 'article',
 'Elena Nicolettis shares a parent''s perspective on career choices, subject selection and the value of spending a day with a mentor.',
 'Elena Nicolettis',
 $article$As a mother of three children across two generations (Gen Z and Generation Alpha), I recognise the familiar tension around choosing subjects in high school and answering the unsettling question of “what am I going to become when I finish school?”. It feels like only recently that I was 16 and asking the same things: which subjects do I enjoy? Which subjects bring the highest marks? Which subjects might open more than one faculty, since I am unsure of my career path? “Why don’t you take a career guidance test to see where your interests and abilities lie?” they suggested. That is how I chose a Bachelor of Science in Microbiology and Physiology for my future. Did I ever work a single day in that field? The answer is no.

As part of my journey, a lesson I have passed to my children is to investigate the role you might want. While career guidance and psychometric tests offer insight into interests and aptitude, it is important to spend at least a day with a mentor to understand what is required and what the environment involves. All lawyers know that years of clerk work in law firm basements are needed just to approach the fame of ‘Harvey Specter’, let alone match the glorified version of a lawyer’s work.

Did I enjoy studying biology and physiology? Yes, I did, but I could not stay in a laboratory all day with little interaction. What I have learned through parenting is that I enjoy teaching the subject. My daughters noted this casually, as if obvious… some 30 years too late! Another dimension of this complex issue is that, as parents, we lack sufficient awareness of available roles. The World Economic Forum’s *Future of Jobs Report suggests* 170 million new jobs will emerge globally by 2030, offset by 92 million displaced, yielding a net gain of 78 million across macrotrends. [ [1](https://www.weforum.org/media/future-of-jobs-report-2025-78-million-new-job-opportunities-by-2030-but-urgent-upskilling-needed-to-prepare-workforces) , [2](https://reports.weforum.org/docs/WEF_Future_of_Jobs_Report_2025.pdf) ] With AI and rapid shifts across industries and sectors, keeping pace feels daunting. Assistance is clearly needed.

When my firstborn chose her subjects, I saw the value of a job shadowing service. Performing on stage from a young age, she was naturally drawn to acting and the arts. This creative calling became evident by high school when she chose art and design as core subjects. However, she also enjoyed the allure of law, particularly through debating. A good friend at the time did me the favour and hosted her for a morning at her law firm in downtown Sandton. She came back not very enthused once she understood the diligence required for heavy contracts and law-based reading. She was also drawn to architecture and eager to pursue it, yet I knew no architects to contact—no relatives or friends in that field. After many calls, we found a firm willing to host her for a day. She returned inspired; they gave her books to keep and a display of their work, confirming her lifelong path. Now a passionate 26-year-old junior architect in Europe, she illustrates how shadowing a mentor may not ensure a match but offers broad insights that might otherwise remain hidden.

As a recent upgrade to our website—a tool for parents and scholars to ease the search for mentors—we have added job descriptions to bridge the gap in role awareness. Had I seen a list of roles in microbiology and physiology, might I have found my calling sooner?

I truly hope this tool helps you and your child answer the questions we all know well.$article$,
 '/assets/about-jobshadow-desk.jpeg',
 'published','2026-11-26T13:15:20+02:00');
commit;

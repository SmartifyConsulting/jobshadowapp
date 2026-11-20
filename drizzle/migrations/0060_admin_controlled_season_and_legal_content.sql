-- Makes the "Feb-Oct operating season" admin-configurable instead of hardcoded in the trigger,
-- and moves the legal page + standard indemnity clause text into the database so an admin can
-- edit them without a code change, same reasoning as the public-holidays fix.
alter table public.booking_settings
  add column if not exists season_start_month int not null default 2,
  add column if not exists season_end_month int not null default 10;

create or replace function public.get_season_window()
returns table(season_start_month int, season_end_month int)
language sql stable security definer set search_path = public as $$
  select season_start_month, season_end_month from public.booking_settings where id = 1
$$;
grant execute on function public.get_season_window() to authenticated, anon;

create or replace function public.enforce_booking_scheduling_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare s public.booking_settings; c public.companies; h public.host_settings; d date; effective_min_lead int; week_count int; month_count int; dow int; mo int;
begin
  select * into s from public.booking_settings where id = 1;
  d := to_date(new.shadow_date, 'MM/DD/YYYY');
  effective_min_lead := greatest(coalesce(s.min_lead_days,0), coalesce(s.documentation_deadline_days,0));
  if d < current_date + effective_min_lead then
    raise exception 'This date is too soon - bookings need at least % days notice.', effective_min_lead;
  end if;
  if s.max_advance_days is not null and d > current_date + s.max_advance_days then
    raise exception 'This date is too far in advance - bookings can only be made up to % days ahead.', s.max_advance_days;
  end if;
  if exists (select 1 from unnest(s.blackout_dates) bd where to_date(bd, 'MM/DD/YYYY') = d) then
    raise exception 'Bookings are closed for this date.';
  end if;
  if exists (select 1 from unnest(s.public_holidays) ph where to_date(ph, 'MM/DD/YYYY') = d) then
    raise exception 'This date is a public holiday - no bookings are permitted.';
  end if;

  select * into c from public.companies where id = new.company_id;

  dow := extract(dow from d);
  mo := extract(month from d);
  if not coalesce(c.allow_weekends, false) and dow in (0,6) then
    raise exception 'This placement does not run on weekends.';
  end if;
  if not coalesce(c.allow_off_season, false) and mo not between s.season_start_month and s.season_end_month then
    raise exception 'This placement only runs between the configured operating season months.';
  end if;

  if c.mentor_email is not null then
    select * into h from public.host_settings where lower(mentor_email) = lower(c.mentor_email);
    if found then
      if h.paused then
        raise exception 'This host is temporarily not accepting new bookings.';
      end if;
      if exists (select 1 from unnest(h.blackout_dates) bd where to_date(bd, 'MM/DD/YYYY') = d) then
        raise exception 'This host is unavailable on this date.';
      end if;
      if h.buffer_days is not null and h.buffer_days > 0 and exists (
        select 1 from public.bookings b join public.companies bc on bc.id = b.company_id
        where lower(bc.mentor_email) = lower(c.mentor_email) and b.status <> 'cancelled'
          and to_date(b.shadow_date,'MM/DD/YYYY') <> d
          and abs(to_date(b.shadow_date,'MM/DD/YYYY') - d) < h.buffer_days
      ) then
        raise exception 'This host needs at least % day(s) between job shadows.', h.buffer_days;
      end if;
      if h.max_shadows_per_week is not null then
        select count(*) into week_count from public.bookings b join public.companies bc on bc.id = b.company_id
          where lower(bc.mentor_email) = lower(c.mentor_email) and b.status <> 'cancelled'
            and date_trunc('week', to_date(b.shadow_date,'MM/DD/YYYY')) = date_trunc('week', d);
        if week_count >= h.max_shadows_per_week then
          raise exception 'This host already has the maximum number of job shadows for that week.';
        end if;
      end if;
      if h.max_shadows_per_month is not null then
        select count(*) into month_count from public.bookings b join public.companies bc on bc.id = b.company_id
          where lower(bc.mentor_email) = lower(c.mentor_email) and b.status <> 'cancelled'
            and date_trunc('month', to_date(b.shadow_date,'MM/DD/YYYY')) = date_trunc('month', d);
        if month_count >= h.max_shadows_per_month then
          raise exception 'This host already has the maximum number of job shadows for that month.';
        end if;
      end if;
    end if;
  end if;

  return new;
end $$;

-- Legal/indemnity text, previously hardcoded in src/lib/legal-content.ts and
-- src/lib/indemnity-sign.server.ts, now lives here so an admin can edit it without a code
-- change. "## Heading" lines are rendered as section headings by the app; blank lines separate
-- paragraphs/clauses.
create table if not exists public.legal_documents (
  key text primary key,
  title text not null,
  body text not null,
  updated_at timestamptz not null default now()
);
grant select on public.legal_documents to authenticated, anon;
grant all on public.legal_documents to service_role;
alter table public.legal_documents enable row level security;
drop policy if exists "anyone can read legal documents" on public.legal_documents;
create policy "anyone can read legal documents" on public.legal_documents for select to authenticated, anon using (true);
drop policy if exists "admins manage legal documents" on public.legal_documents;
create policy "admins manage legal documents" on public.legal_documents for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

insert into public.legal_documents (key, title, body) values
('legal_review_notice', 'Legal Review Notice', $doc$This document pack has been prepared to align with South Africa's POPIA (including 2025 Regulations), the Consumer Protection Act, UK/EU GDPR, the UK Age-Appropriate Design Code, US COPPA and British Commonwealth privacy laws. Because Job Shadow facilitates physical workplace placements for minors under 18, a qualified legal practitioner must review and sign off on this text prior to live deployment.$doc$),

('privacy_policy', 'Part 1: Global Data Protection & Privacy Policy', $doc$## 1. Governance, Entity Role & Regulatory Scope

Job Shadow (Pty) Ltd ("Job Shadow," "we," "us," or "our") operates an international career-discovery and job-shadowing platform connecting high school scholars with industry mentors and host companies. Depending on your jurisdiction, Job Shadow acts as the Responsible Party, Data Controller, Business, or Data Fiduciary for personal information processed through our web and mobile applications.

Job Shadow enforces a Global High-Water Mark standard across all user accounts, complying with South Africa's POPIA (including the 2025 Amended Regulations), Nigeria's NDPA and Kenya's Data Protection Act; the UK GDPR, Data (Use and Access) Act 2025, UK ICO Children's Code, EU GDPR, Digital Services Act and Cyprus Law 125(I)/2018; Australia's Privacy Act and Children's Online Privacy Code, Canada's PIPEDA and Quebec Law 25, New Zealand's Privacy Act 2020 and Singapore's PDPA; and US COPPA, CCPA/CPRA, Brazil's LGPD and ECA Digital, India's DPDP Act, Japan's APPI, and UAE/Saudi PDPL.

## 2. Global Standard for Children & Youth Data (Under 18)

Because Job Shadow facilitates educational workplace placements for secondary/high school scholars, safeguarding minors is our highest priority. While statutory ages of digital consent vary globally (typically 13 to 18), Job Shadow enforces a Universal Under-18 Safeguarding Rule worldwide: no scholar under 18 can finalize a booking or sign indemnities without verified parental consent and digital signature, via a Mandatory Shared Scholar-Parent Account and mandatory Parent/Guardian co-sign on every indemnity prior to booking confirmation.

## 2.1 Privacy-by-Default & Child Safety Controls

Scholar profiles are strictly private and invisible to other scholars or unverified users. A scholar's confidential details (such as ID/passport numbers required for corporate building security) are disclosed solely to the confirmed Host Company's designated HR Representative or Mentor prior to the scheduled session. Job Shadow strictly prohibits selling, renting, or sharing minors' personal information, or using their data for behavioral advertising, third-party ad tracking, or manipulative 'nudge' algorithms.

## 3. Information Collected & Lawful Bases for Processing

High School Scholars: full name, date of birth, grade, school name, email, phone number, emergency contact, and government ID/passport - collected under Explicit Parental Consent and Contractual Necessity, for identity verification, security clearance, and booking fulfillment.

Parents/Guardians: full name, email address, phone number, relationship to scholar, and digital signature audit logs - collected to verify Competent Person authority and execute binding digital indemnities.

Mentors & Host Companies (HR): name, role title, company name, work email, phone, government ID (KYC), CV or LinkedIn summary, and calendar availability - collected for credential vetting, anonymized profile generation, and scheduling.

Technical & Audit Logs: IP address, device metadata, UTC timestamps, country code, and policy version numbers - collected for fraud prevention, cybersecurity, and immutable audit trails for digital signatures.

## 4. Cross-Border Data Transfers

Personal information is transferred outside South Africa only to jurisdictions providing substantially similar data protection laws (such as the UK and EU/Cyprus) or where the user/parent explicitly consents to facilitate an international placement. Where UK or Cyprus/EU user data is processed in South Africa or on international cloud servers, transfers are governed by the European Commission Standard Contractual Clauses and the UK International Data Transfer Addendum. Cross-border transfers elsewhere comply with APEC CBPR principles, Brazil's LGPD, and local statutory adequacy mechanisms.

## 5. Juristic Persons (South Africa POPIA Specific)

In accordance with POPIA, Job Shadow extends data protection safeguards to juristic persons (host companies, corporate sponsors, and schools). Corporate registration details, HR contacts, and internal mentor rosters are protected against unauthorized disclosure. Mentor CVs and LinkedIn summaries are displayed in anonymized form on public career listings and linked to a named individual only once a booking is accepted.

## 6. Direct Marketing & Electronic Communications

Job Shadow operates on a strict opt-in basis without pre-ticked boxes. Automated booking confirmations, mentor availability alerts ('Notify Me' bell notifications), and parental approval requests are strictly transactional. Promotional communications require separate, explicit opt-in consent and include an instant unsubscribe mechanism.

## 7. Security, Retention & Data Subject Rights

All data is encrypted in transit (TLS 1.2+) and at rest (AES-256). KYC identity documents are stored in a restricted-access vault. Host Companies are contractually required to delete downloaded scholar security details immediately after a shadow session concludes.

Inactive accounts and KYC files are automatically purged or anonymized 12 months post-graduation or upon account deletion.

Users (and Parents/Guardians on behalf of under-18 scholars) have the right to access, export, correct, or permanently delete ('Right to be Forgotten') their personal data, and to withdraw consent at any time without discrimination.

Suspected breaches are reported immediately to the South African Information Regulator and within 72 hours to the UK ICO / EU supervisory authorities where applicable. Contact our Information Officer / DPO at privacy@jobshadow.co.za.$doc$),

('consent_forms', 'Part 2: In-App Digital Consent, Indemnity & Safeguarding Agreements', $doc$## Form A: Scholar & Parent POPIA/GDPR Consent Declaration

Displayed during the Scholar/Parent Registration Wizard, as mandatory checkboxes prior to account activation.

Scholar Accuracy Declaration: I confirm that the personal information, school enrollment details, and identification documents I have supplied are truthful, accurate, and belong to me.

Parent / Legal Guardian Consent (Competent Person): I, the undersigned parent or legal guardian, warrant that I am legally authorized to act on behalf of the minor registered on this shared profile. I give explicit consent for Job Shadow to collect, store, process, and share the minor's personal and KYC information with verified Host Companies and Mentors solely to facilitate job-shadowing placements.

## Form B: Digital Indemnity & Scholar Code of Conduct

Must be digitally signed by both the Scholar and the linked Parent/Guardian before any booking request can be confirmed.

Educational Nature of Placement: Job Shadow is an educational career-exploration platform and is not an employment, recruitment, or placement agency. Participation is unpaid and does not constitute an offer of employment, internship, or learnership.

Scholar Code of Conduct: the Scholar agrees to arrive punctually, adhere to the Host Company's dress code, follow reasonable instructions from assigned Mentors or HR personnel, respect confidential information and intellectual property, not take unauthorized photographs/video/audio on site, and comply with all site security, safety and emergency procedures.

Indemnity, Waiver of Liability & Emergency Medical Care: the Parent/Legal Guardian and Scholar acknowledge that attending an active workplace involves ordinary, inherent risks. To the fullest extent permitted by law, the Parent/Legal Guardian indemnifies and holds harmless Job Shadow, its directors, employees, and the Host Company/Mentor against any claim, loss, damage or injury arising out of the Scholar's attendance or transit to/from a placement, excluding loss or injury caused by gross negligence, willful misconduct or statutory breach. If a medical emergency occurs and the Parent/Guardian cannot be contacted immediately, the Host Company is authorized to arrange necessary emergency medical treatment at the Parent/Guardian's expense.

Digitally signed by both the High School Scholar and the Parent/Legal Guardian, each logging full name, signature, user ID, IP address, UTC timestamp and form version.

## Form C: Mentor & Host Company Safeguarding & Data Undertaking

Executed digitally by individual Mentors and Company HR Representatives during onboarding.

Credential Accuracy: I warrant that my submitted CV, LinkedIn profile summary, qualifications, and KYC identification documents are accurate and truthful.

Confidentiality & Deletion of Scholar Data: I agree to treat all scholar personal information received through Job Shadow as strictly confidential, to use it exclusively for building security and hosting the scheduled shadow, and to permanently delete any downloaded copies within 24 hours after the session ends.

Child Safeguarding & Supervision: I agree to provide a safe, respectful, and professional environment for under-18 scholars and ensure that any colleagues or team members hosting the scholar (including rotating teams) uphold the same safeguarding standards.$doc$),

('platform_terms', 'Part 3: Platform Terms & Conditions of Service', $doc$## 1. Acceptance & Scope of Service

These Terms govern access to and use of the Job Shadow website, mobile interfaces, and booking services ("Platform"). By registering an account, you agree to be bound by these Terms. Where a user is under 18 years of age, these Terms are entered into jointly with their linked Parent or Legal Guardian.

Job Shadow provides an online marketplace and scheduling tool that enables High School Scholars to discover careers and book short-term job-shadowing sessions with vetted Mentors and Host Companies. Job Shadow acts solely as a technology facilitator and is not a party to the physical supervision arrangement at the Host Company's premises.

## 2. User Accounts, Eligibility & KYC Verification

High School Scholars: job-shadowing bookings are restricted to enrolled secondary/high school scholars (typically ages 14-18). Tertiary students and adult job seekers are not eligible to book high school job-shadowing slots.

Unified Scholar-Parent Accounts: only one account is permitted per Scholar. Parents/Guardians must manage bookings through the shared Scholar-Parent profile rather than creating duplicate standalone profiles.

Mandatory Profile Completion & KYC: all users must complete their profile wizard and pass identity verification (including valid ID/passport upload and, for Mentors, CV/LinkedIn verification) before requesting or accepting bookings. Job Shadow reserves the right to suspend or reject any account that fails verification.

## 3. Booking Workflow & Mentor Availability

Booking Requests: Scholars select an available date and time slot published on a Mentor's calendar. A booking request is not confirmed until payment is completed and the Mentor (or Host Company HR Representative) formally accepts the request.

Company / Team Placements: where a Host Company registers a department or team of professionals, the specific supervising mentor may be assigned upon arrival at reception. Scholars and Parents acknowledge and accept this rotational format where indicated on the listing.

No Direct Solicitation: users agree not to bypass the Platform to arrange private, unlogged shadow sessions with Mentors or Scholars introduced through Job Shadow.

## 4. Fees, Payments (PayFast) & Promo Codes

Access to book job-shadowing sessions is subject to the fees displayed at checkout. All payments must be completed prior to final booking confirmation. Online payments are processed securely via our authorized payment gateway partner, PayFast (or designated international payment processors); Job Shadow does not store full credit/debit card numbers on its servers. Valid promotional or partner discount codes must be applied at checkout, have no cash value, cannot be applied retroactively, and may be subject to partner or school eligibility rules.

## 5. Cancellations, Rescheduling & Refunds

If a Mentor declines a booking request or cancels a confirmed session, the Scholar/Parent may reschedule with another available Mentor at no extra cost or request a full refund. Cancellations by the Scholar/Parent made at least 48 hours prior to the scheduled shadow date are eligible for a free reschedule or refund (less non-refundable payment gateway processing fees); cancellations within 48 hours or unexcused no-shows forfeit the booking fee. Nothing in these Terms limits statutory cooling-off or refund rights under ECTA, the Consumer Protection Act, or the UK Consumer Rights Act 2015.

## 6. Intellectual Property & AI Assistant ("Reddy")

All software, career descriptions, branding, logos, and custom designs on the Platform remain the exclusive intellectual property of Job Shadow (Pty) Ltd. The Platform includes an automated AI assistant ("Reddy") to help users navigate booking procedures and check role availability; responses it generates are for informational guidance only and do not constitute formal career, psychological, or legal advice.

## 7. Limitation of Liability & Dispute Resolution

Job Shadow provides the Platform on an 'as-is' and 'as-available' basis and is not liable for temporary technical downtime or third-party internet/gateway outages. Job Shadow's aggregate liability arising out of any booking or use of the Platform shall not exceed the total fees paid by the user to Job Shadow in the 12 months preceding the claim. These Terms are governed by the laws of the Republic of South Africa, without prejudice to mandatory local consumer or data protection rights applicable to users residing in the United Kingdom, European Union, or British Commonwealth.$doc$),

('standard_indemnity_clauses', 'Standard JobShadow Indemnity Clauses', $doc$I, the undersigned parent/legal guardian of the above-named scholar, consent to their participation in the Job Shadow placement described above. I understand that the scholar will spend time at a host company's premises under the supervision of a mentor, and that reasonable precautions will be taken for their safety, but that job shadowing, like any workplace activity, carries some inherent risk.

I hereby release and indemnify Job Shadow, the host company, and their respective employees and representatives, against any claim for loss, injury, illness or damage arising from the scholar's participation in this placement, except to the extent caused by their gross negligence or wilful misconduct. I confirm that the scholar has no medical condition that I have not disclosed to Job Shadow which could affect their participation, and that I have provided accurate contact and emergency information.

I understand that photographs or video may be taken during the placement for Job Shadow's records and may be used for promotional purposes unless I notify Job Shadow in writing that I do not consent to this.$doc$)
on conflict (key) do nothing;

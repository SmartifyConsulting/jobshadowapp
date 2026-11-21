-- Replaces the legal_documents content (seeded in 0060) with the v3.0 "FORUS API & Updated
-- Roles" version of the Job Shadow Legal & Compliance Pack. Key changes from v2.0: KYC is now
-- described as electronic verification via the FORUS API (Job Shadow never stores raw ID
-- images, only encrypted verification tokens), roles are renamed to "Individual Mentor" /
-- "Host Company", and the 48-hour pre-session clearance / 24-hour post-session purge window is
-- now spelled out explicitly in the privacy policy to match the enforcement already in the
-- booking trigger and (pending) Security Clearance Card feature.
update public.legal_documents set title = 'Legal Review Notice', body = $doc$This v3.0 document pack reflects automated electronic KYC verification via the FORUS API (eliminating raw ID image uploads), the refined platform user roles (High School Scholar shared profile, Individual Mentor, and Host Company), and Location-based booking steppers. It aligns with South Africa's POPIA (including 2025 Regulations), the Consumer Protection Act (CPA), UK/EU GDPR, the UK Age-Appropriate Design Code, US COPPA (2026 standards), and British Commonwealth privacy laws. Please have a qualified legal practitioner review and sign off prior to live deployment.$doc$, updated_at = now() where key = 'legal_review_notice';

update public.legal_documents set title = 'Part 1: Global Data Protection & Privacy Policy', body = $doc$## 1. Governance, Entity Role & Regulatory Scope

Job Shadow (Pty) Ltd ("Job Shadow," "we," "us," or "our") operates an international career-discovery and job-shadowing platform connecting High School Scholars with Individual Mentors and Host Companies. Depending on your jurisdiction, Job Shadow acts as the Responsible Party, Data Controller, Business, or Data Fiduciary for personal information processed through our web and mobile applications.

Job Shadow enforces a Global High-Water Mark standard across all user accounts, complying with South Africa's POPIA (including the 2025 Amended Regulations), Nigeria's NDPA and Kenya's Data Protection Act; the UK GDPR, Data (Use and Access) Act 2025, UK ICO Age-Appropriate Design Code (Children's Code), EU GDPR, Digital Services Act and Cyprus Law 125(I)/2018; Australia's Privacy Act and Children's Online Privacy Code, Canada's PIPEDA and Quebec Law 25, New Zealand's Privacy Act 2020 and Singapore's PDPA; and US COPPA (2025/2026 Amendments) and state privacy laws (CCPA/CPRA), Brazil's LGPD and ECA Digital, India's DPDP Act, Japan's APPI, and UAE/Saudi PDPL.

## 2. Global Standard for Children & Youth Data (Under 18)

Because Job Shadow facilitates educational workplace placements for secondary/high school scholars, safeguarding minors is our highest priority. While statutory ages of digital consent vary globally (typically 13 to 18), Job Shadow enforces a Universal Under-18 Safeguarding Rule worldwide: no scholar under 18 can finalize a booking or sign indemnities without verified parental consent and digital signature, via a Mandatory Shared Scholar-Parent Account and mandatory Parent/Guardian co-sign on every indemnity prior to booking confirmation. This applies globally regardless of local digital-consent age: South Africa (POPIA s.35), the UK and Cyprus/EU (Children's Code / GDPR), and the Commonwealth, US and rest of the world (COPPA, PIPEDA, APPs, DPDP) all route through the same linked Parent/Guardian profile and digital signature requirement.

## 2.1 Privacy-by-Default & Child Safety Controls

No Public Scholar Profiles: scholar profiles are strictly private and invisible to other scholars or unverified users.

Controlled Data Disclosure (Time-Gated Clearance): a scholar's verified identity details (name, school, emergency contact, and FORUS-verified ID/passport number required for corporate building security) are disclosed solely to the confirmed Individual Mentor or Host Company HR Representative starting 48 hours prior to the scheduled session.

Zero Behavioral Profiling or Targeted Ads: Job Shadow strictly prohibits selling, renting, or sharing minors' personal information, or using their data for behavioral advertising, third-party ad tracking, or manipulative 'nudge' algorithms.

## 3. Information Collected, FORUS KYC & Lawful Bases

Identity verification (KYC) is conducted electronically through our authorized identity verification partner, FORUS, via secure API integration. Job Shadow does not collect or store raw photographs or scans of government identification documents on its servers; we receive and store only encrypted verification status tokens and verified identity attributes strictly required for child safeguarding and host-company building security clearance.

High School Scholars (Shared Profile): full name, date of birth, grade, school name, home city/location, email, mobile number, emergency contact, and FORUS API KYC verification token & verified ID/passport number - collected under Explicit Parental Consent (POPIA Sec. 35; GDPR Art. 8) and Contractual Necessity, for identity verification, building security clearance, and booking fulfillment.

Parents/Guardians (linked to Scholar): full name, email address, mobile number, relationship to scholar, FORUS verification status (where applicable), and digital signature audit logs - collected under Legal Obligation and Explicit Consent, to verify Competent Person authority and execute binding digital indemnities.

Individual Mentors: full name, job title, organization, work email, mobile, placement location/address, CV or LinkedIn summary (anonymized publicly), FORUS KYC token, and calendar availability - collected under Contractual Necessity and Child Safeguarding, for credential vetting, anonymized profile generation, location matching, and scheduling.

Host Companies (HR Admin / Team): company legal name, registration number (Juristic Person), office location/security instructions, HR Representative contact details, FORUS KYC token, and internal mentor/team rosters - collected under Contractual Necessity and Child Safeguarding, for corporate vetting, logistics/security clearance, and rotational team scheduling (protected as Juristic Person data under POPIA).

Technical & Audit Logs: IP address, device metadata, UTC timestamps, country code, FORUS transaction IDs, and policy version numbers - collected under Legitimate Interest and Legal Compliance, for fraud prevention, cybersecurity, and immutable audit trails for digital signatures.

## 4. Cross-Border Data Transfers

Personal information is transferred outside South Africa only to jurisdictions providing substantially similar data protection laws (such as the UK and EU/Cyprus) or where the user/parent explicitly consents to facilitate an international placement (POPIA Section 72). Where UK or Cyprus/EU user data is processed in South Africa or on international cloud servers, transfers are governed by the European Commission Standard Contractual Clauses (SCCs) and the UK International Data Transfer Addendum (IDTA), backed by Transfer Risk Assessments. Cross-border transfers elsewhere comply with APEC CBPR principles, Brazil's LGPD, and local statutory adequacy mechanisms.

## 5. Juristic Persons (South Africa POPIA Specific)

In accordance with South Africa's POPIA, Job Shadow extends data protection safeguards to juristic persons (Host Companies, corporate sponsors, and schools). Corporate registration details, HR contacts, and internal mentor rosters are protected against unauthorized disclosure. Individual Mentor and Host Company team summaries generated from CVs or LinkedIn profiles are displayed in anonymized form on public career listings and linked to named individuals only once a booking is accepted.

## 6. Direct Marketing & Electronic Communications

In compliance with the April 2025 POPIA Regulations, UK PECR, and international anti-spam laws, Job Shadow operates on a strict opt-in basis without pre-ticked boxes. Automated booking confirmations, mentor availability alerts ('Notify Me' bell notifications), and parental approval requests are strictly transactional. Promotional communications require separate, explicit opt-in consent and include an instant unsubscribe mechanism.

## 7. Security, Automated 24-Hour Purge & Data Subject Rights

Encryption & API Tokenization: all data is encrypted in transit (TLS 1.2+) and at rest (AES-256). Raw KYC identity images remain exclusively within the FORUS secure verification environment and are never stored on Job Shadow servers.

Automated 24-Hour Host Purge: access to a scholar's verified ID/passport number and emergency contact on the Host Company / Individual Mentor Security Clearance Card is automatically masked and revoked 24 hours after the scheduled shadow session ends. Host Companies and Mentors are contractually required to destroy any offline visitor logs within the same 24-hour window.

Account Retention Limits: inactive user accounts and associated audit records are automatically purged or anonymized 12 months post-graduation or upon account deletion.

Global Privacy Rights: users (and Parents/Guardians on behalf of under-18 scholars) have the right to access, export, correct, or permanently delete ('Right to be Forgotten') their personal data, and to withdraw consent at any time without discrimination.

Breach Notification & Information Officer: suspected breaches are reported immediately to the South African Information Regulator via the eServices portal and within 72 hours to the UK ICO / EU supervisory authorities where applicable. Contact our Information Officer / DPO at privacy@jobshadow.co.za.$doc$, updated_at = now() where key = 'privacy_policy';

update public.legal_documents set title = 'Part 2: In-App Digital Consent, Indemnity & Safeguarding Agreements', body = $doc$## Form A: Scholar & Parent POPIA/GDPR Consent Declaration

Displayed during the Shared Scholar-Parent Onboarding Wizard, as mandatory checkboxes prior to KYC verification and booking.

Scholar Accuracy Declaration: I confirm that the personal information, school enrollment details, and identity verification submitted via FORUS are truthful, accurate, and belong to me.

Parent / Legal Guardian Consent (Competent Person): I, the undersigned parent or legal guardian, warrant that I am legally authorized to act on behalf of the minor registered on this shared profile. I give explicit consent for Job Shadow to verify our identities via the FORUS API and to process and share the minor's verified personal and security clearance details with confirmed Individual Mentors or Host Companies solely to facilitate job-shadowing placements, in accordance with the Global Data Protection & Privacy Policy.

## Form B: Digital Indemnity & Scholar Code of Conduct

Must be digitally signed by both the High School Scholar and the linked Parent/Guardian before any booking request can be confirmed.

Educational Nature of Placement: Job Shadow is an educational career-exploration platform and is not an employment, recruitment, or placement agency. Participation in a job-shadowing session is unpaid and does not constitute an offer of employment, internship, or learnership.

Scholar Code of Conduct: the Scholar agrees to arrive punctually at the confirmed Location, adhere to the Host Company's or Individual Mentor's dress code, and follow all reasonable instructions from assigned Mentors or HR personnel; to strictly respect the Host Company's or Mentor's confidential information, client privacy, and intellectual property, and not take unauthorized photographs, videos, or audio recordings on site; and to comply with all site security, safety, and emergency procedures required at the placement Location.

Indemnity, Waiver of Liability & Emergency Medical Care: the Parent/Legal Guardian and Scholar acknowledge that attending an active workplace involves ordinary, inherent risks. To the fullest extent permitted by applicable law (including the South African Consumer Protection Act, 68 of 2008, and the UK Unfair Contract Terms Act 1977), the Parent/Legal Guardian (in their personal capacity and on behalf of the minor Scholar) indemnifies and holds harmless Job Shadow, its directors, employees, Individual Mentors, and Host Companies against any claim, loss, damage, or injury arising out of the Scholar's attendance or transit to/from a placement Location, excluding any loss or injury caused by the gross negligence, willful misconduct, or statutory breach of Job Shadow, the Individual Mentor, or the Host Company. If a medical emergency occurs during a placement and the Parent/Guardian cannot be contacted immediately, the Host Company or Individual Mentor is authorized to arrange necessary emergency medical treatment for the Scholar at the Parent/Guardian's expense.

Digitally signed by both the High School Scholar (full name auto-populated from FORUS, click-to-sign, logging User ID, FORUS Token ID, IP address, UTC timestamp and form version) and the Parent/Legal Guardian (full name auto-populated from linked profile, click-to-sign, logging Parent ID, IP address, UTC timestamp and form version).

## Form C: Individual Mentor & Host Company Safeguarding Undertaking

Executed digitally by Individual Mentors and Host Company HR Representatives during Step 2 of their onboarding wizard.

Credential & Identity Accuracy: I warrant that my FORUS API identity verification, submitted CV or LinkedIn profile summary, qualifications, and company representation authority are accurate and truthful.

Confidentiality & 24-Hour Deletion of Scholar Data: I agree to treat all scholar personal information (names, FORUS-verified ID/passport numbers, school details, and emergency contacts) accessed via the Security Clearance Card as strictly confidential, to use it exclusively for building security and hosting the scheduled shadow, and to permanently destroy any offline or printed copies within 24 hours after the session ends.

Child Safeguarding & Supervision: I agree to provide a safe, respectful, and professional environment for under-18 scholars at the registered placement Location and ensure that any colleagues or rotating team members hosting the scholar uphold the exact same safeguarding standards.

Digitally executed with the Individual Mentor's or Host Company HR Representative's name, click-to-sign, and UTC timestamp, FORUS ID and IP address auto-logged.$doc$, updated_at = now() where key = 'consent_forms';

update public.legal_documents set title = 'Part 3: Platform Terms & Conditions of Service', body = $doc$## 1. Acceptance & Scope of Service

These Terms govern access to and use of the Job Shadow website, mobile interfaces, and booking services ("Platform"). By registering an account, you agree to be bound by these Terms. Where a user is under 18 years of age, these Terms are entered into jointly with their linked Parent or Legal Guardian.

Job Shadow provides an online career-discovery marketplace and scheduling tool that enables High School Scholars to explore careers and book short-term job-shadowing sessions with vetted Individual Mentors and Host Companies. Job Shadow acts solely as a technology facilitator and is not a party to the physical supervision arrangement at the placement Location.

## 2. User Roles, Shared Accounts & FORUS KYC Verification

High School Scholars (Shared Scholar-Parent Account): job-shadowing bookings are restricted to enrolled secondary/high school scholars (typically ages 14-18). Only one unified profile is permitted per Scholar; Parents/Guardians must link via email to oversee bookings and co-sign digital indemnities rather than creating separate standalone accounts. Tertiary students and adult job seekers are not eligible to book high school job-shadowing slots.

Individual Mentors: independent professionals or solo practitioners who register to host High School Scholars personally at their verified Location or virtually.

Host Companies (HR Representatives & Teams): corporate entities registered by an authorized HR Representative to manage workplace logistics, building security clearance, and internal mentor rosters or rotational departmental hosting.

Mandatory FORUS API Verification: all users must complete their onboarding wizard and pass electronic identity verification via the FORUS API (and, for Mentors/Host Companies, CV or LinkedIn credential verification) before requesting or accepting bookings. Job Shadow reserves the right to suspend or reject any account that fails verification.

## 3. Location-Based Discovery & Booking Workflow

Location & Anonymized Selection: Scholars browse career sub-specialties, filter by placement Location (city/suburb or virtual), and review anonymized Individual Mentor or Host Company summaries before selecting an available calendar slot.

Booking Confirmation: a booking request is not confirmed until payment is completed, the Parent/Guardian digital indemnity is signed, and the Individual Mentor or Host Company HR Representative formally accepts the request.

Rotational Host Company Teams: where a Host Company registers a department or team of professionals (e.g. an engineering division), the specific supervising mentor may be assigned upon check-in at reception. Scholars and Parents acknowledge and accept this rotational format where indicated on the listing.

No Direct Solicitation: users agree not to bypass the Platform to arrange private, unlogged shadow sessions with Individual Mentors, Host Companies, or Scholars introduced through Job Shadow.

## 4. Fees, Payments (PayFast) & Promo Codes

Access to book job-shadowing sessions is subject to the fees displayed at checkout. All payments must be completed prior to final booking confirmation. Online payments are processed securely via our authorized payment gateway partner, PayFast (or designated international payment processors); Job Shadow does not store full credit/debit card numbers on its servers. Valid promotional or partner discount codes must be applied at checkout, have no cash value, cannot be applied retroactively, and may be subject to partner or school eligibility rules.

## 5. Cancellations, Rescheduling & Refunds

If an Individual Mentor or Host Company declines a booking request or cancels a confirmed session due to unforeseen business commitments, the Scholar/Parent may reschedule with another available Mentor or Host Company at no extra cost or request a full refund of the booking fee. Cancellations by the Scholar/Parent made at least 48 hours prior to the scheduled shadow date are eligible for a free reschedule or refund (less non-refundable payment gateway processing fees); cancellations within 48 hours of the session or unexcused no-shows forfeit the booking fee. Nothing in these Terms limits statutory cooling-off or refund rights available to consumers under Section 44 of South Africa's Electronic Communications and Transactions Act (ECTA), the Consumer Protection Act (CPA), or the UK Consumer Rights Act 2015.

## 6. Intellectual Property & AI Assistant ("Reddy")

All software, career descriptions, 'Ideal For' traits, branding, logos, and custom designs on the Platform remain the exclusive intellectual property of Job Shadow (Pty) Ltd. The Platform includes an automated AI assistant ("Reddy") to help users navigate booking procedures and check role availability; responses it generates are for informational guidance only and do not constitute formal career, psychological, or legal advice.

## 7. Limitation of Liability & Dispute Resolution

While we strive for uninterrupted service, Job Shadow provides the Platform on an 'as-is' and 'as-available' basis and is not liable for temporary technical downtime or third-party internet, FORUS API, or payment gateway outages. To the maximum extent permitted by law, Job Shadow's aggregate liability arising out of any booking or use of the Platform shall not exceed the total fees paid by the user to Job Shadow in the 12 months preceding the claim. These Terms are governed by the laws of the Republic of South Africa, without prejudice to mandatory local consumer or data protection rights applicable to users residing in the United Kingdom, European Union, or British Commonwealth.$doc$, updated_at = now() where key = 'platform_terms';

/** Job Shadow Global Data Protection Policy, Digital Indemnity Agreements & Terms of Service,
 * v2.0 — November 2026. Source: Job_Shadow_Legal_and_Compliance_Pack.docx. */

export const LEGAL_REVIEW_NOTICE =
  "This document pack has been prepared to align with South Africa's POPIA (including 2025 Regulations), the " +
  "Consumer Protection Act, UK/EU GDPR, the UK Age-Appropriate Design Code, US COPPA and British Commonwealth " +
  "privacy laws. Because Job Shadow facilitates physical workplace placements for minors under 18, a qualified " +
  "legal practitioner must review and sign off on this text prior to live deployment.";

export type LegalSection = { heading: string; paragraphs: string[] };

export const PRIVACY_POLICY: LegalSection[] = [
  {
    heading: "1. Governance, Entity Role & Regulatory Scope",
    paragraphs: [
      "Job Shadow (Pty) Ltd (\"Job Shadow,\" \"we,\" \"us,\" or \"our\") operates an international career-discovery and job-shadowing platform connecting high school scholars with industry mentors and host companies. Depending on your jurisdiction, Job Shadow acts as the Responsible Party, Data Controller, Business, or Data Fiduciary for personal information processed through our web and mobile applications.",
      "Job Shadow enforces a Global High-Water Mark standard across all user accounts, complying with South Africa's POPIA (including the 2025 Amended Regulations), Nigeria's NDPA and Kenya's Data Protection Act; the UK GDPR, Data (Use and Access) Act 2025, UK ICO Children's Code, EU GDPR, Digital Services Act and Cyprus Law 125(I)/2018; Australia's Privacy Act and Children's Online Privacy Code, Canada's PIPEDA and Quebec Law 25, New Zealand's Privacy Act 2020 and Singapore's PDPA; and US COPPA, CCPA/CPRA, Brazil's LGPD and ECA Digital, India's DPDP Act, Japan's APPI, and UAE/Saudi PDPL.",
    ],
  },
  {
    heading: "2. Global Standard for Children & Youth Data (Under 18)",
    paragraphs: [
      "Because Job Shadow facilitates educational workplace placements for secondary/high school scholars, safeguarding minors is our highest priority. While statutory ages of digital consent vary globally (typically 13 to 18), Job Shadow enforces a Universal Under-18 Safeguarding Rule worldwide: no scholar under 18 can finalize a booking or sign indemnities without verified parental consent and digital signature, via a Mandatory Shared Scholar-Parent Account and mandatory Parent/Guardian co-sign on every indemnity prior to booking confirmation.",
    ],
  },
  {
    heading: "2.1 Privacy-by-Default & Child Safety Controls",
    paragraphs: [
      "Scholar profiles are strictly private and invisible to other scholars or unverified users. A scholar's confidential details (such as ID/passport numbers required for corporate building security) are disclosed solely to the confirmed Host Company's designated HR Representative or Mentor prior to the scheduled session. Job Shadow strictly prohibits selling, renting, or sharing minors' personal information, or using their data for behavioral advertising, third-party ad tracking, or manipulative 'nudge' algorithms.",
    ],
  },
  {
    heading: "3. Information Collected & Lawful Bases for Processing",
    paragraphs: [
      "High School Scholars: full name, date of birth, grade, school name, email, phone number, emergency contact, and government ID/passport — collected under Explicit Parental Consent and Contractual Necessity, for identity verification, security clearance, and booking fulfillment.",
      "Parents/Guardians: full name, email address, phone number, relationship to scholar, and digital signature audit logs — collected to verify Competent Person authority and execute binding digital indemnities.",
      "Mentors & Host Companies (HR): name, role title, company name, work email, phone, government ID (KYC), CV or LinkedIn summary, and calendar availability — collected for credential vetting, anonymized profile generation, and scheduling.",
      "Technical & Audit Logs: IP address, device metadata, UTC timestamps, country code, and policy version numbers — collected for fraud prevention, cybersecurity, and immutable audit trails for digital signatures.",
    ],
  },
  {
    heading: "4. Cross-Border Data Transfers",
    paragraphs: [
      "Personal information is transferred outside South Africa only to jurisdictions providing substantially similar data protection laws (such as the UK and EU/Cyprus) or where the user/parent explicitly consents to facilitate an international placement. Where UK or Cyprus/EU user data is processed in South Africa or on international cloud servers, transfers are governed by the European Commission Standard Contractual Clauses and the UK International Data Transfer Addendum. Cross-border transfers elsewhere comply with APEC CBPR principles, Brazil's LGPD, and local statutory adequacy mechanisms.",
    ],
  },
  {
    heading: "5. Juristic Persons (South Africa POPIA Specific)",
    paragraphs: [
      "In accordance with POPIA, Job Shadow extends data protection safeguards to juristic persons (host companies, corporate sponsors, and schools). Corporate registration details, HR contacts, and internal mentor rosters are protected against unauthorized disclosure. Mentor CVs and LinkedIn summaries are displayed in anonymized form on public career listings and linked to a named individual only once a booking is accepted.",
    ],
  },
  {
    heading: "6. Direct Marketing & Electronic Communications",
    paragraphs: [
      "Job Shadow operates on a strict opt-in basis without pre-ticked boxes. Automated booking confirmations, mentor availability alerts ('Notify Me' bell notifications), and parental approval requests are strictly transactional. Promotional communications require separate, explicit opt-in consent and include an instant unsubscribe mechanism.",
    ],
  },
  {
    heading: "7. Security, Retention & Data Subject Rights",
    paragraphs: [
      "All data is encrypted in transit (TLS 1.2+) and at rest (AES-256). KYC identity documents are stored in a restricted-access vault. Host Companies are contractually required to delete downloaded scholar security details immediately after a shadow session concludes.",
      "Inactive accounts and KYC files are automatically purged or anonymized 12 months post-graduation or upon account deletion.",
      "Users (and Parents/Guardians on behalf of under-18 scholars) have the right to access, export, correct, or permanently delete ('Right to be Forgotten') their personal data, and to withdraw consent at any time without discrimination.",
      "Suspected breaches are reported immediately to the South African Information Regulator and within 72 hours to the UK ICO / EU supervisory authorities where applicable. Contact our Information Officer / DPO at privacy@jobshadow.co.za.",
    ],
  },
];

export const CONSENT_FORMS: LegalSection[] = [
  {
    heading: "Form A: Scholar & Parent POPIA/GDPR Consent Declaration",
    paragraphs: [
      "Displayed during the Scholar/Parent Registration Wizard, as mandatory checkboxes prior to account activation.",
      "Scholar Accuracy Declaration: I confirm that the personal information, school enrollment details, and identification documents I have supplied are truthful, accurate, and belong to me.",
      "Parent / Legal Guardian Consent (Competent Person): I, the undersigned parent or legal guardian, warrant that I am legally authorized to act on behalf of the minor registered on this shared profile. I give explicit consent for Job Shadow to collect, store, process, and share the minor's personal and KYC information with verified Host Companies and Mentors solely to facilitate job-shadowing placements.",
    ],
  },
  {
    heading: "Form B: Digital Indemnity & Scholar Code of Conduct",
    paragraphs: [
      "Must be digitally signed by both the Scholar and the linked Parent/Guardian before any booking request can be confirmed.",
      "Educational Nature of Placement: Job Shadow is an educational career-exploration platform and is not an employment, recruitment, or placement agency. Participation is unpaid and does not constitute an offer of employment, internship, or learnership.",
      "Scholar Code of Conduct: the Scholar agrees to arrive punctually, adhere to the Host Company's dress code, follow reasonable instructions from assigned Mentors or HR personnel, respect confidential information and intellectual property, not take unauthorized photographs/video/audio on site, and comply with all site security, safety and emergency procedures.",
      "Indemnity, Waiver of Liability & Emergency Medical Care: the Parent/Legal Guardian and Scholar acknowledge that attending an active workplace involves ordinary, inherent risks. To the fullest extent permitted by law, the Parent/Legal Guardian indemnifies and holds harmless Job Shadow, its directors, employees, and the Host Company/Mentor against any claim, loss, damage or injury arising out of the Scholar's attendance or transit to/from a placement, excluding loss or injury caused by gross negligence, willful misconduct or statutory breach. If a medical emergency occurs and the Parent/Guardian cannot be contacted immediately, the Host Company is authorized to arrange necessary emergency medical treatment at the Parent/Guardian's expense.",
      "Digitally signed by both the High School Scholar and the Parent/Legal Guardian, each logging full name, signature, user ID, IP address, UTC timestamp and form version.",
    ],
  },
  {
    heading: "Form C: Mentor & Host Company Safeguarding & Data Undertaking",
    paragraphs: [
      "Executed digitally by individual Mentors and Company HR Representatives during onboarding.",
      "Credential Accuracy: I warrant that my submitted CV, LinkedIn profile summary, qualifications, and KYC identification documents are accurate and truthful.",
      "Confidentiality & Deletion of Scholar Data: I agree to treat all scholar personal information received through Job Shadow as strictly confidential, to use it exclusively for building security and hosting the scheduled shadow, and to permanently delete any downloaded copies within 24 hours after the session ends.",
      "Child Safeguarding & Supervision: I agree to provide a safe, respectful, and professional environment for under-18 scholars and ensure that any colleagues or team members hosting the scholar (including rotating teams) uphold the same safeguarding standards.",
    ],
  },
];

export const PLATFORM_TERMS: LegalSection[] = [
  {
    heading: "1. Acceptance & Scope of Service",
    paragraphs: [
      "These Terms govern access to and use of the Job Shadow website, mobile interfaces, and booking services (\"Platform\"). By registering an account, you agree to be bound by these Terms. Where a user is under 18 years of age, these Terms are entered into jointly with their linked Parent or Legal Guardian.",
      "Job Shadow provides an online marketplace and scheduling tool that enables High School Scholars to discover careers and book short-term job-shadowing sessions with vetted Mentors and Host Companies. Job Shadow acts solely as a technology facilitator and is not a party to the physical supervision arrangement at the Host Company's premises.",
    ],
  },
  {
    heading: "2. User Accounts, Eligibility & KYC Verification",
    paragraphs: [
      "High School Scholars: job-shadowing bookings are restricted to enrolled secondary/high school scholars (typically ages 14–18). Tertiary students and adult job seekers are not eligible to book high school job-shadowing slots.",
      "Unified Scholar-Parent Accounts: only one account is permitted per Scholar. Parents/Guardians must manage bookings through the shared Scholar-Parent profile rather than creating duplicate standalone profiles.",
      "Mandatory Profile Completion & KYC: all users must complete their profile wizard and pass identity verification (including valid ID/passport upload and, for Mentors, CV/LinkedIn verification) before requesting or accepting bookings. Job Shadow reserves the right to suspend or reject any account that fails verification.",
    ],
  },
  {
    heading: "3. Booking Workflow & Mentor Availability",
    paragraphs: [
      "Booking Requests: Scholars select an available date and time slot published on a Mentor's calendar. A booking request is not confirmed until payment is completed and the Mentor (or Host Company HR Representative) formally accepts the request.",
      "Company / Team Placements: where a Host Company registers a department or team of professionals, the specific supervising mentor may be assigned upon arrival at reception. Scholars and Parents acknowledge and accept this rotational format where indicated on the listing.",
      "No Direct Solicitation: users agree not to bypass the Platform to arrange private, unlogged shadow sessions with Mentors or Scholars introduced through Job Shadow.",
    ],
  },
  {
    heading: "4. Fees, Payments (PayFast) & Promo Codes",
    paragraphs: [
      "Access to book job-shadowing sessions is subject to the fees displayed at checkout. All payments must be completed prior to final booking confirmation. Online payments are processed securely via our authorized payment gateway partner, PayFast (or designated international payment processors); Job Shadow does not store full credit/debit card numbers on its servers. Valid promotional or partner discount codes must be applied at checkout, have no cash value, cannot be applied retroactively, and may be subject to partner or school eligibility rules.",
    ],
  },
  {
    heading: "5. Cancellations, Rescheduling & Refunds",
    paragraphs: [
      "If a Mentor declines a booking request or cancels a confirmed session, the Scholar/Parent may reschedule with another available Mentor at no extra cost or request a full refund. Cancellations by the Scholar/Parent made at least 48 hours prior to the scheduled shadow date are eligible for a free reschedule or refund (less non-refundable payment gateway processing fees); cancellations within 48 hours or unexcused no-shows forfeit the booking fee. Nothing in these Terms limits statutory cooling-off or refund rights under ECTA, the Consumer Protection Act, or the UK Consumer Rights Act 2015.",
    ],
  },
  {
    heading: "6. Intellectual Property & AI Assistant (\"Reddy\")",
    paragraphs: [
      "All software, career descriptions, branding, logos, and custom designs on the Platform remain the exclusive intellectual property of Job Shadow (Pty) Ltd. The Platform includes an automated AI assistant (\"Reddy\") to help users navigate booking procedures and check role availability; responses it generates are for informational guidance only and do not constitute formal career, psychological, or legal advice.",
    ],
  },
  {
    heading: "7. Limitation of Liability & Dispute Resolution",
    paragraphs: [
      "Job Shadow provides the Platform on an 'as-is' and 'as-available' basis and is not liable for temporary technical downtime or third-party internet/gateway outages. Job Shadow's aggregate liability arising out of any booking or use of the Platform shall not exceed the total fees paid by the user to Job Shadow in the 12 months preceding the claim. These Terms are governed by the laws of the Republic of South Africa, without prejudice to mandatory local consumer or data protection rights applicable to users residing in the United Kingdom, European Union, or British Commonwealth.",
    ],
  },
];

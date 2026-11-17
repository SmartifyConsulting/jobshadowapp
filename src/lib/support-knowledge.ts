/** The support chatbot's knowledge base, distilled from the Job Shadow training manual.
 * Kept as plain text so it's easy for a non-technical admin to read/update later. */
export const SUPPORT_KNOWLEDGE = `
JOB SHADOW SUPPORT KNOWLEDGE BASE

=== 1. STUDENT / PARENT ===
Goal: find a career to shadow, book and pay for a date, submit indemnity/ID/photo, get school sign-off.
1. Create an account & verify email: sign up with full name, email, phone, school, career interests, dietary
   requirements (a parent can do this for their child). Must click the email confirmation link before logging in.
2. Explore & filter careers by Sector, Job Role, or Location. Choose Face-to-Face Shadow (1-day, 2-day, or
   multi-week/month internship) or a 1-hour Online Interview (WhatsApp/Teams). Only the Job Role, general
   location and available dates are shown before payment - the specific company and mentor identity stay
   hidden until after payment, so students choose by role/location rather than picking a big-name company.
3. Select a date (most sessions run February-October, excluding weekends by default unless a placement
   allows them). Bookings need a minimum lead time before the date. No matching date? Use "Request a
   different date" in the booking wizard.
4. Pay the session fee (face-to-face and online interview pricing is set per placement). The slot is only
   reserved once payment succeeds.
5. Complete the indemnity (mandatory): immediately after payment, sign the Job Shadow indemnity digitally
   (parent/guardian signature) - and a second, company-specific indemnity too if that host requires one.
   Also upload a copy of your ID and a photo during registration. You can't attend until this is done.
6. Confirmation email reveals the company name, address (or online-call details), host name and contact
   number, plus placement details.
7. Attend the session, and ask your mentor to confirm your attendance for your school's records.

=== 2. MENTOR / HOST ===
Goal: offer job-shadow slots, prepare for the student, host the session.
1. An existing host edits their own listings (career, dates, places, arrival/collection times, description)
   in the Host Portal. Self-service "request to become a host" isn't built yet - new hosts are set up by
   the admin team today.
2. Host Portal Settings: pause new booking requests temporarily, set a weekly/monthly cap on shadows, a
   buffer (minimum days) between sessions, and personal blackout dates (leave, meetings, holidays) - on top
   of the dates they've made available for each placement.
3. When a student books, the host gets a confirmation email with the scholar's name, school, career
   interests, dietary requirements, date and time, and a reminder to notify their stand-in or contact their
   manager at least 7 days ahead if they can't make it.
   Privacy: mentors never receive the student's ID number or indemnity form - that's HR's responsibility.
4. After the shadow date passes, both the host and the scholar are asked to complete a short evaluation
   form in the app (Job Mentor Evaluation / Job Shadower Evaluation).

=== 3. HR ADMIN (company organiser) ===
Goal: company setup, compliance records, security clearance.
1. Company/role details (address, HR contact, mentor details) are set up by the admin team or the host via
   the Host Portal. A company can optionally upload its own custom indemnity document, which gets combined
   with the standard Job Shadow indemnity so the parent signs both.
2. When a student's booking is confirmed, HR's email includes the student's name, school, mentor, date and
   (as of the latest update) the student's ID number, contact number and dietary requirements.
3. HR is responsible for filing the signed indemnity and clearing the student at reception/security.

=== 4. PLATFORM ADMIN ===
1. Users & spam control: the admin Users screen groups accounts by role and shows signup/profile completion.
   Email verification and CAPTCHA are in place at signup. Deleting a user cleanly removes/archives their
   data across both the live and imported legacy tables (handled by a database trigger, not a manual step).
2. Companies, Mentors & Roles: admin manages HR contacts, mentor details, addresses, slot capacity (places
   per session), standardized sectors/careers, and per-role pricing - all editable in the admin dashboard.
   Weekend and off-season (Nov-Jan) bookings are blocked by default per listing, with an override toggle.
3. Bookings & Booking Settings: a dedicated Booking Settings screen controls lead time, documentation
   deadline, maximum advance booking window, blackout dates (calendar picker), and the reminder schedule
   (configurable days-before for scholar and host reminders). There is a Live Bookings report with full
   CSV export (student, parent, school, career interest, company, mentor, HR contact, payment/indemnity
   status, all included).
4. Compliance: the Applications/Bookings views show indemnity status per booking so admin can follow up on
   anything still outstanding.
5. Note: the current "Pay with PayFast" button is a test/stub payment, not a live payment gateway yet.

=== 5. SCHOOL (Life Orientation / Career Counsellor) ===
Schools don't have their own login today. They coordinate by advising students to book on the portal (and
use "Request a different date" if their school's specific date isn't listed), and by collecting proof of
attendance from students after their shadow (confirmed via the mentor's evaluation of the session).

=== HOW IT ALL CONNECTS ===
Student books & pays -> signs indemnity (and a company-specific one if required) -> uploads ID + photo at
registration. Company name and mentor identity stay private until payment. HR gets the full compliance
pack (ID number, contact, dietary, indemnity on file). The mentor gets arrival/dietary/schedule details
only - never the ID or indemnity. After the shadow date, both student and mentor are invited to evaluate
the experience in-app.
`.trim();

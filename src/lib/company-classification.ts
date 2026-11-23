/** A company is a host only with 2+ distinct mentors; one mentor = independent mentor. Preserve company links; classify named people, not the number of addresses in a field. */
export type CompanyContacts = { company: string | null; mentor_email: string | null; backup_mentor_email: string | null; mentor_name?: string | null; backup_mentor_name?: string | null };
export const companyKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');
export const contactEmails = (value: string | null | undefined) => [...new Set((value ?? '').split(/[,;]/).map((email) => email.trim().toLowerCase()).filter((email) => /^[^ @]+@[^ @]+\.[^ @]+$/.test(email)))];
export function classifyCompanies(companies: CompanyContacts[]): Map<string, 'mentor' | 'host'> {
  const groups = new Map<string, Set<string>>();
  for (const company of companies) {
    const name = companyKey(company.company ?? ''); if (!name) continue;
    const people = groups.get(name) ?? new Set<string>();
    for (const [person, emails] of [[company.mentor_name, company.mentor_email], [company.backup_mentor_name, company.backup_mentor_email]]) {
      const key = companyKey(person ?? '');
      if (key) people.add('name:' + key); else { const addresses = contactEmails(emails); if (addresses.length) people.add('contact:' + addresses.sort().join(';')); }
    }
    groups.set(name, people);
  }
  const types = new Map<string, 'mentor' | 'host'>([...groups].filter(([, people]) => people.size > 0).map(([name, people]) => [name, people.size === 1 ? 'mentor' : 'host']));
  return types;
}
export function individualMentorEmails(companies: CompanyContacts[]): Set<string> {
  const types = classifyCompanies(companies);
  const companyLinks = new Map<string, Set<string>>();
  for (const company of companies) for (const email of [...contactEmails(company.mentor_email), ...contactEmails(company.backup_mentor_email)]) {
    const links = companyLinks.get(email) ?? new Set<string>(); links.add(companyKey(company.company ?? '')); companyLinks.set(email, links);
  }
  return new Set([...companyLinks].filter(([, links]) => links.size === 1 && [...links].every((company) => types.get(company) === 'mentor')).map(([email]) => email));
}

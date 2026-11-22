import { providerGroups } from "@/lib/provider-directory";
import { describe, expect, it } from "vitest";
import { classifyCompanies, contactEmails, individualMentorEmails } from "@/lib/company-classification";

const contact = (company: string, name: string, email: string) => ({ company, mentor_name: name, mentor_email: email, backup_mentor_name: null, backup_mentor_email: null });
describe("Mentor company links", () => {
  it("splits multiple valid addresses and discards incomplete addresses", () => {
    expect(contactEmails(" A@example.com,b@example.com; A@example.com,broken@company ")).toEqual(["a@example.com", "b@example.com"]);
  });
  it("counts named people rather than addresses and normalises company names", () => {
    const companies = [contact("CSA Aviation", "Nick", "first@example.com,second@example.com"), contact(" csa aviation ", "Nick", "second@example.com"), contact("Clinic", "Dr A", "shared@example.com"), contact("Clinic", "Dr B", "shared@example.com")];
    const groups = classifyCompanies(companies);
    expect(groups.get("csa aviation")).toBe("mentor");
    expect(groups.get("clinic")).toBe("host");
    expect(individualMentorEmails(companies)).toEqual(new Set(["first@example.com", "second@example.com"]));
  });
  it("does not classify a contact shared across companies as a sole-company mentor", () => {
    expect(individualMentorEmails([contact("First", "Person", "same@example.com"), contact("Second", "Person", "same@example.com")]).size).toBe(0);
    expect(classifyCompanies([{ company: "Unknown", mentor_email: null, backup_mentor_email: null }]).has("unknown")).toBe(false);
  });
  it("groups repeated placements once while retaining every editable source record", () => {
    const records = [{ ...contact('Solo Company', 'Solo Person', 'solo@example.com'), id: 1, career: 'Accountant', original_field: 'retained' }, { ...contact('Solo Company', 'Solo Person', 'solo@example.com'), id: 2, career: 'Auditor' }];
    const groups = providerGroups(records);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.names).toEqual(['Solo Person']);
    expect(groups[0]?.careers).toEqual(['Accountant', 'Auditor']);
    expect(groups[0]?.records).toEqual(records);
    expect(groups[0]?.records[0]?.['original_field']).toBe('retained');
  });

});

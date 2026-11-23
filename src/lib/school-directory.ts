import type { AccountRow } from "./users.server";
export type SchoolDirectoryEntry = { key: string; name: string; scholars: AccountRow[] };
export function schoolDirectory(accounts: AccountRow[]): SchoolDirectoryEntry[] {
  const schools = new Map<string, SchoolDirectoryEntry>();
  for (const scholar of accounts) {
    if (!scholar.roles.includes("user") || scholar.is_spam) continue;
    const name = scholar.school?.trim().replace(/\s+/g," ") ?? "";
    const key = name.toLowerCase();
    if (!key || ["n/a","none","unknown","not applicable","null","undefined","-","—"].includes(key)) continue;
    const group = schools.get(key) ?? {key,name,scholars:[]};
    if (!group.scholars.some((account)=>account.id===scholar.id)) group.scholars.push(scholar);
    schools.set(key,group);
  }
  return [...schools.values()].sort((a,b)=>a.name.localeCompare(b.name));
}

/** Use the same initial for alphabet filters, counts and groups. */
export function alphabetInitial(value: string | null | undefined) {
  const first = (value ?? "").normalize("NFKD").replace(/\p{M}/gu, "").trim().charAt(0).toUpperCase();
  return /^[A-Z]$/.test(first) ? first : "#";
}

export function accountInitial(account: { display_name: string | null; full_name: string | null; email: string | null }) {
  return alphabetInitial(account.display_name?.trim() || account.full_name?.trim() || account.email);
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], field = "", quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"') {
      if (quoted && source[i + 1] === '"') { field += '"'; i++; }
      else if (quoted) quoted = false;
      else if (!field.trim()) { field = ""; quoted = true; }
      else field += ch;
    } else if (!quoted && ch === ',') { row.push(field.trim()); field = ""; }
    else if (!quoted && (ch === '\n' || ch === '\r')) {
      row.push(field.trim()); if (row.some(Boolean)) rows.push(row); row = []; field = "";
      if (ch === '\r' && source[i + 1] === '\n') i++;
    } else field += ch;
  }
  if (quoted) throw new Error("A quoted CSV field is not closed.");
  if (field || row.length) { row.push(field.trim()); if (row.some(Boolean)) rows.push(row); }
  return rows;
}

type NamedRow = { id: number; name: string; description?: string };
export function planNamedCsv(text: string, existing: { id: number; name: string }[], careers: boolean) {
  const [header, ...data] = parseCsv(text);
  if (!header || !data.length) throw new Error("The CSV needs headings and at least one data row.");
  const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const headers = header.map(norm);
  const nameColumn = headers.findIndex((h) => ['name', 'career', 'careername', 'sector', 'sectorname'].includes(h));
  const idColumn = headers.findIndex((h) => ['id', 'careerid', 'sectorid'].includes(h));
  const descColumn = headers.findIndex((h) => ['description', 'shortdescription', 'summary'].includes(h));
  if (nameColumn < 0) throw new Error("Include a Name, Career Name or Sector Name column.");
  const byId = new Map(existing.map((row) => [row.id, row]));
  const byName = new Map<string, typeof existing>();
  existing.forEach((row) => { const key = row.name.trim().toLowerCase(); byName.set(key, [...(byName.get(key) ?? []), row]); });
  const reserved = new Set(existing.map((row) => row.id));
  for (const row of data) if (idColumn >= 0 && row[idColumn]) reserved.add(Number(row[idColumn]));
  let next = Math.max(0, ...existing.map((row) => row.id)) + 1;
  const creates: NamedRow[] = [], updates: { id: number; description: string }[] = [];
  const seen = new Set<string>(); let unchanged = 0;
  data.forEach((row, index) => {
    if (row.length > header.length) throw new Error(`Row ${index + 2}: there are more values than headings. Put fields containing commas in double quotes.`);
    const name = row[nameColumn]?.trim() ?? "", key = name.toLowerCase();
    if (!name || name.length > 200) throw new Error(`Row ${index + 2}: enter a name of 1–200 characters.`);
    if (seen.has(key)) throw new Error(`Row ${index + 2}: ${name} appears more than once.`);
    seen.add(key);
    const rawId = idColumn >= 0 ? row[idColumn] : undefined;
    const id = rawId ? Number(rawId) : null;
    if (id !== null && (!Number.isSafeInteger(id) || id < 1 || id > 2147483647)) throw new Error(`Row ${index + 2}: ID must be a positive whole number.`);
    const matches = byName.get(key) ?? [];
    const current = id !== null ? byId.get(id) : matches.length === 1 ? matches[0] : undefined;
    if (id === null && matches.length > 1) throw new Error(`Row ${index + 2}: ${name} is ambiguous; supply its ID.`);
    if (current && current.name.trim().toLowerCase() !== key) throw new Error(`Row ${index + 2}: ID ${id} belongs to a different name. Rename it separately.`);
    if (id !== null && !current && matches.length) throw new Error(`Row ${index + 2}: ${name} already exists with a different ID.`);
    const description = careers && descColumn >= 0 ? row[descColumn] : undefined;
    if (description && description.length > 2000) throw new Error(`Row ${index + 2}: description is longer than 2,000 characters.`);
    if (current) {
      if (description !== undefined) updates.push({ id: current.id, description }); else unchanged++;
    } else {
      while (reserved.has(next)) next++;
      const assigned = id ?? next++;
      if (assigned > 2147483647) throw new Error("No valid numeric ID is available.");
      reserved.add(assigned);
      creates.push({ id: assigned, name, ...(description === undefined ? {} : { description }) });
    }
  });
  return { creates, updates, unchanged };
}

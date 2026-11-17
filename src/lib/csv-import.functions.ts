import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mapCsvHeaders, type CsvTargetColumn } from "./csv-import.server";

export const mapCsvColumns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { headers: string[]; sampleRows: string[][]; targetColumns: CsvTargetColumn[] }) => d)
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    return mapCsvHeaders(data.headers, data.sampleRows, data.targetColumns);
  });

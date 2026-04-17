import { serializeServersCsv } from "@/lib/import-export";
import { readStore } from "@/lib/store";

export async function GET() {
  const store = await readStore();
  const csv = serializeServersCsv(store.servers);

  return new Response(csv, {
    headers: {
      "Content-Disposition": 'attachment; filename="servers.csv"',
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}

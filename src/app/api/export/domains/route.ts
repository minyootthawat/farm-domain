import { serializeDomainsCsv } from "@/lib/import-export";
import { readStore } from "@/lib/store";

export async function GET() {
  const store = await readStore();
  const serversById = new Map(store.servers.map((server) => [server.id, server]));
  const csv = serializeDomainsCsv(store.domains, serversById);

  return new Response(csv, {
    headers: {
      "Content-Disposition": 'attachment; filename="domains.csv"',
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}

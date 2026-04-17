import { serializeDomainsTemplateCsv } from "@/lib/import-export";

export async function GET() {
  const csv = serializeDomainsTemplateCsv();

  return new Response(csv, {
    headers: {
      "Content-Disposition": 'attachment; filename="domains-template.csv"',
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}

import { serializeServersTemplateCsv } from "@/lib/import-export";

export async function GET() {
  const csv = serializeServersTemplateCsv();

  return new Response(csv, {
    headers: {
      "Content-Disposition": 'attachment; filename="servers-template.csv"',
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}

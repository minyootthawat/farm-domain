import "dotenv/config";
import { MongoClient } from "mongodb";

async function checkMongo() {
  const connectionString = process.env.MONGODB_URL;

  if (!connectionString) {
    throw new Error("MONGODB_URL is required");
  }

  const client = new MongoClient(connectionString, {
    ignoreUndefined: true,
  });

  const dbName =
    process.env.MONGODB_DB_NAME?.trim() ||
    new URL(connectionString).pathname.replace(/^\//, "") ||
    "farm_domain";

  try {
    await client.connect();
    const db = client.db(dbName);
    await db.command({ ping: 1 });
    const [servers, domains] = await Promise.all([
      db.collection("servers").countDocuments(),
      db.collection("domains").countDocuments(),
    ]);

    console.log(
      JSON.stringify(
        {
          provider: "mongodb",
          status: "ok",
          database: dbName,
          servers,
          domains,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.close();
  }
}

await checkMongo();

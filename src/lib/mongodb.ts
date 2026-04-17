import { MongoClient } from "mongodb";

const globalForMongo = globalThis as typeof globalThis & {
  mongoClient?: MongoClient;
};

function getConnectionString() {
  const connectionString = process.env.MONGODB_URL;

  if (!connectionString) {
    throw new Error("MONGODB_URL is required");
  }

  return connectionString;
}

function getMongoClient() {
  if (!globalForMongo.mongoClient) {
    globalForMongo.mongoClient = new MongoClient(getConnectionString(), {
      ignoreUndefined: true,
    });
  }

  return globalForMongo.mongoClient;
}

let connectionPromise: Promise<MongoClient> | null = null;

async function getClient() {
  if (!connectionPromise) {
    connectionPromise = getMongoClient().connect();
  }

  return connectionPromise;
}

function getDatabaseName() {
  const explicit = process.env.MONGODB_DB_NAME?.trim();

  if (explicit) {
    return explicit;
  }

  const url = new URL(getConnectionString());
  const pathname = url.pathname.replace(/^\//, "").trim();

  return pathname || "farm_domain";
}

export async function getMongoDatabase() {
  const client = await getClient();
  return client.db(getDatabaseName());
}

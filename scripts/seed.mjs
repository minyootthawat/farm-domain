import "dotenv/config";
import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";

const PROVIDERS = ["AWS_LIGHTSAIL", "AWS_EC2", "OTHER"];
const ENVIRONMENTS = ["PROD", "STAGING", "DEV"];
const STATUSES = ["DF", "ACTIVE", "PENDING", "ISSUE"];
const HOST_TYPES_LIST = ["WWW", "ROOT", "MIXED"];
const PANEL_STATUSES_LIST = ["AAPANEL", "MANUAL", "NONE"];
const SERVICE_STATUSES_LIST = ["READY", "MISSING", "NA"];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const REGIONS = ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1", "ap-northeast-1"];
const PROFILE_NAMES = ["ops-team", "dev-team", "infra-team", "platform-team"];

const SUBDOMAIN_PROVIDERS = ["Cloudflare", "Route53", "Namecheap", null, null, null];
const OWNER_PROFILES = ["ops-team", "dev-team", "infra-team", null, null];

const DOMAIN_SUFFIXES = [
  "example.com",
  "testsite.io",
  "myapp.dev",
  "prod-domain.com",
  "staging-app.io",
  "devsite.dev",
];

function generateServers(count = 10) {
  return Array.from({ length: count }, (_, i) => {
    const num = String(i + 1).padStart(3, "0");
    return {
      name: `server-${num}`,
      ipAddress: `10.0.${i + 1}.${Math.floor(Math.random() * 254) + 1}`,
      provider: pick(PROVIDERS),
      environment: pick(ENVIRONMENTS),
      profileName: pick(PROFILE_NAMES),
      region: pick(REGIONS),
      note: null,
    };
  });
}

function generateDomains(servers, domainsPerServer = 10) {
  return servers.flatMap((server, serverIdx) =>
    Array.from({ length: domainsPerServer }, (_, d) => {
      const domainIndex = serverIdx * domainsPerServer + d;
      return {
        name: `domain-${String(domainIndex + 1).padStart(3, "0")}.${pick(DOMAIN_SUFFIXES)}`,
        hostType: pick(HOST_TYPES_LIST),
        status: pick(STATUSES),
        panelStatus: pick(PANEL_STATUSES_LIST),
        s3Status: pick(SERVICE_STATUSES_LIST),
        subdomainProvider: pick(SUBDOMAIN_PROVIDERS),
        ownerProfile: pick(OWNER_PROFILES),
        postmanStatus: pick(SERVICE_STATUSES_LIST),
        uptimeStatus: pick(SERVICE_STATUSES_LIST),
        note: null,
        serverIdx,
      };
    }),
  );
}

async function getCollections() {
  const connectionString = process.env.MONGODB_URL;
  if (!connectionString) throw new Error("MONGODB_URL is required");

  const dbName =
    process.env.MONGODB_DB_NAME?.trim() ||
    new URL(connectionString).pathname.replace(/^\//, "") ||
    "farm_domain";

  const client = new MongoClient(connectionString, { ignoreUndefined: true });
  await client.connect();
  const db = client.db(dbName);

  return { client, servers: db.collection("servers"), domains: db.collection("domains") };
}

async function seed() {
  console.log("Generating mock data...");

  const servers = generateServers(10);
  const domains = generateDomains(servers, 10);

  console.log(`  ${servers.length} servers, ${domains.length} domains generated`);

  console.log("Connecting to MongoDB...");
  const { client, servers: serversColl, domains: domainsColl } = await getCollections();

  try {
    console.log("Clearing existing data...");
    await serversColl.deleteMany({});
    await domainsColl.deleteMany({});

    console.log("Inserting servers...");
    const now = new Date();
    const serverDocs = servers.map((s, i) => ({
      id: randomUUID(),
      name: s.name,
      ipAddress: s.ipAddress,
      provider: s.provider,
      environment: s.environment,
      profileName: s.profileName,
      region: s.region,
      note: s.note,
      createdAt: now,
      updatedAt: now,
      _idx: i,
    }));
    await serversColl.insertMany(serverDocs);

    console.log("Inserting domains...");
    const domainDocs = domains.map((d) => {
      const serverDoc = serverDocs[d.serverIdx];
      return {
        id: randomUUID(),
        name: d.name,
        hostType: d.hostType,
        status: d.status,
        panelStatus: d.panelStatus,
        s3Status: d.s3Status,
        subdomainProvider: d.subdomainProvider,
        ownerProfile: d.ownerProfile,
        postmanStatus: d.postmanStatus,
        uptimeStatus: d.uptimeStatus,
        note: d.note,
        serverId: serverDoc.id,
        createdAt: now,
        updatedAt: now,
      };
    });
    await domainsColl.insertMany(domainDocs);

    const [serverCount, domainCount] = await Promise.all([
      serversColl.countDocuments(),
      domainsColl.countDocuments(),
    ]);
    console.log(`Seed complete. Servers: ${serverCount}, Domains: ${domainCount}`);
  } finally {
    await client.close();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

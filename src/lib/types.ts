import type { Domain, Server } from "@/lib/schema";

export type DomainWithServer = Domain & {
  server: Server;
};

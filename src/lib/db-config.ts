export type DatabaseProvider = "mongodb";

export const databaseProvider: DatabaseProvider = "mongodb";

export function isMongoProvider() {
  return true;
}

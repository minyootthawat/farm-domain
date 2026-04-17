export type ImportDataResult = {
  importedCount: number;
  skippedCount: number;
  skippedBreakdown: Partial<Record<DryRunReason, number>>;
};

export type DryRunReason =
  | "duplicate_in_file"
  | "server_not_found"
  | "invalid_data";

export type DryRunRow = {
  action: "create" | "update" | "skip";
  key: string;
  reason: DryRunReason | null;
  secondary: string | null;
};

export type DryRunReport = {
  createCount: number;
  updateCount: number;
  skipCount: number;
  rows: DryRunRow[];
};

export type ImportActionState = {
  status: "idle" | "success" | "error";
  totalCount: number;
  importedCount: number;
  skippedCount: number;
  skippedBreakdown: Partial<Record<"duplicate_in_file" | "server_not_found" | "invalid_data", number>>;
  message: string | null;
  fileName: string | null;
};

export type DryRunActionState = {
  status: "idle" | "success" | "error";
  fileName: string | null;
  message: string | null;
  createCount: number;
  updateCount: number;
  skipCount: number;
  rows: Array<{
    action: "create" | "update" | "skip";
    key: string;
    reason: "duplicate_in_file" | "server_not_found" | "invalid_data" | null;
    secondary: string | null;
  }>;
};

export const IMPORT_ACTION_INITIAL_STATE: ImportActionState = {
  status: "idle",
  totalCount: 0,
  importedCount: 0,
  skippedCount: 0,
  skippedBreakdown: {},
  message: null,
  fileName: null,
};

export const DRY_RUN_ACTION_INITIAL_STATE: DryRunActionState = {
  status: "idle",
  fileName: null,
  message: null,
  createCount: 0,
  updateCount: 0,
  skipCount: 0,
  rows: [],
};

export type CrudActionState = {
  status: "idle" | "success" | "error";
  action:
    | "create_server"
    | "update_server"
    | "delete_server"
    | "create_domain"
    | "update_domain"
    | "delete_domain"
    | "create_user"
    | "update_user"
    | null;
  reason:
    | "validation"
    | "invalid_ip_address"
    | "invalid_domain_name"
    | "invalid_username"
    | "duplicate"
    | "duplicate_email"
    | "duplicate_username"
    | "not_found"
    | "linked_domains"
    | "protected_admin"
    | "save_failed"
    | "unknown"
    | "unauthorized"
    | null;
};

export const CRUD_ACTION_INITIAL_STATE: CrudActionState = {
  status: "idle",
  action: null,
  reason: null,
};

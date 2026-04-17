"use client";

import type {
  ChangeEvent,
  FormEvent,
  ReactNode,
} from "react";
import {
  useActionState,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  FileUp,
  Pencil,
  Plus,
  Save,
  Server as ServerIcon,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  analyzeDomainsImport,
  analyzeServersImport,
  createUser,
  createDomain,
  createServer,
  deleteServer,
  deleteDomain,
  importDomains,
  importServers,
  updateUser,
  updateServer,
  updateDomain,
} from "@/app/actions";
import {
  CRUD_ACTION_INITIAL_STATE,
  DRY_RUN_ACTION_INITIAL_STATE,
  IMPORT_ACTION_INITIAL_STATE,
  type CrudActionState,
  type DryRunActionState,
  type ImportActionState,
} from "@/app/action-states";
import { useToast } from "@/components/toast-provider";
import {
  DOMAIN_STATUSES,
  ENVIRONMENTS,
  HOST_TYPES,
  PANEL_STATUSES,
  SERVER_PROVIDERS,
  SERVICE_STATUSES,
  type Domain,
  type Server,
} from "@/lib/schema";
import {
  parseDomainsImport,
  parseServersImport,
} from "@/lib/import-export";
import {
  getEnvironmentLabel,
  getHostTypeLabel,
  getPanelStatusLabel,
  getServerProviderLabel,
  getServiceStatusLabel,
  getStatusLabel,
} from "@/lib/display-labels";
import type { Locale } from "@/lib/i18n";
import { getCopy } from "@/lib/ui-copy";
import { DOMAIN_PATTERN, IPV4_PATTERN, USERNAME_PATTERN } from "@/lib/validation";
import { textFieldClass, primaryButtonClass } from "@/lib/ui-styles";

const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface-control)] px-4 py-3 text-sm font-medium text-[var(--text)] transition hover:border-[var(--accent)]/30 hover:bg-[var(--surface-control-hover)]";
const tableActionClass =
  "inline-flex items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-control)] px-3 py-2 text-sm font-medium text-[var(--text)] transition hover:border-[var(--accent)]/30 hover:bg-[var(--surface-control-hover)]";
const dangerButtonClass =
  "inline-flex w-full items-center justify-center rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--danger-text)]";

type ImportPreviewRow = {
  id: string;
  cells: string[];
};

type ImportPreviewTable = {
  columns: string[];
  rows: ImportPreviewRow[];
};

function getCrudToastMessage(copy: ReturnType<typeof getCopy>, state: CrudActionState) {
  if (state.status === "success") {
    switch (state.action) {
      case "create_server":
        return { title: copy.dialogs.serverCreatedToast, tone: "success" as const };
      case "update_server":
        return { title: copy.dialogs.serverUpdatedToast, tone: "success" as const };
      case "delete_server":
        return { title: copy.dialogs.serverDeletedToast, tone: "success" as const };
      case "create_domain":
        return { title: copy.dialogs.domainCreatedToast, tone: "success" as const };
      case "update_domain":
        return { title: copy.dialogs.domainUpdatedToast, tone: "success" as const };
      case "delete_domain":
        return { title: copy.dialogs.domainDeletedToast, tone: "success" as const };
      case "create_user":
        return { title: copy.dialogs.userCreatedToast, tone: "success" as const };
      case "update_user":
        return { title: copy.dialogs.userUpdatedToast, tone: "success" as const };
      default:
        return null;
    }
  }

  switch (state.reason) {
    case "invalid_ip_address":
      return { title: copy.dialogs.invalidIpAddressToast, tone: "error" as const };
    case "invalid_domain_name":
      return { title: copy.dialogs.invalidDomainNameToast, tone: "error" as const };
    case "invalid_username":
      return { title: copy.dialogs.invalidUsernameToast, tone: "error" as const };
    case "validation":
      return { title: copy.dialogs.validationToast, tone: "error" as const };
    case "duplicate":
      return {
        title:
          state.action === "create_domain"
            ? copy.dialogs.duplicateDomainToast
            : copy.dialogs.duplicateServerToast,
        tone: "error" as const,
      };
    case "duplicate_email":
      return { title: copy.dialogs.duplicateEmailToast, tone: "error" as const };
    case "duplicate_username":
      return { title: copy.dialogs.duplicateUsernameToast, tone: "error" as const };
    case "linked_domains":
      return { title: copy.dialogs.linkedDomainsBlockDelete, tone: "error" as const };
    case "protected_admin":
      return { title: copy.dialogs.protectedAdminToast, tone: "error" as const };
    case "not_found":
      return { title: copy.dialogs.notFoundToast, tone: "error" as const };
    case "save_failed":
      return { title: copy.dialogs.saveFailedToast, tone: "error" as const };
    case "unknown":
      return { title: copy.dialogs.actionFailedToast, tone: "error" as const };
    case "unauthorized":
      return { title: copy.dialogs.unauthorizedToast, tone: "error" as const };
    default:
      return null;
  }
}

function useCrudToast(copy: ReturnType<typeof getCopy>, state: CrudActionState) {
  const { pushToast } = useToast();
  const seenKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (state.status === "idle" || !state.action) {
      return;
    }

    const key = `${state.status}:${state.action}:${state.reason ?? "none"}`;

    if (seenKeyRef.current === key) {
      return;
    }

    seenKeyRef.current = key;
    const toast = getCrudToastMessage(copy, state);

    if (toast) {
      pushToast(toast);
    }
  }, [copy, pushToast, state]);
}

function useCloseDialogOnSuccess(status: CrudActionState["status"] | ImportActionState["status"]) {
  useEffect(() => {
    if (status === "success") {
      document.querySelector<HTMLDialogElement>("dialog[open]")?.close();
    }
  }, [status]);
}

function FormField({
  children,
  className = "",
  error,
  errorId,
  label,
}: {
  children: ReactNode;
  className?: string;
  error?: string | null;
  errorId?: string;
  label: string;
}) {
  return (
    <label className={`grid gap-1.5 ${className}`}>
      <span className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
          {label}
        </span>
        <span
          className={`inline-flex min-h-4 items-center gap-1 text-[0.72rem] font-medium leading-4 ${error ? "text-[var(--danger-text)]" : "invisible"}`}
          id={error ? errorId : undefined}
        >
          <AlertCircle className={`h-3 w-3 shrink-0 ${error ? "" : "invisible"}`} />
          <span className="normal-case tracking-normal">{error ?? "."}</span>
        </span>
      </span>
      {children}
    </label>
  );
}

type FieldTarget = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function isFieldTarget(target: EventTarget | null): target is FieldTarget {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  );
}

function getFieldMessage(target: FieldTarget) {
  if (target.validity.valueMissing) {
    return target.dataset.requiredMessage || target.validationMessage;
  }

  if (target.validity.patternMismatch) {
    return target.dataset.patternMessage || target.validationMessage;
  }

  return target.validationMessage;
}

function useFormValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function setFieldError(name: string, message: string | null) {
    setErrors((current) => {
      if (!message) {
        if (!(name in current)) {
          return current;
        }

        const next = { ...current };
        delete next[name];
        return next;
      }

      if (current[name] === message) {
        return current;
      }

      return { ...current, [name]: message };
    });
  }

  function handleInvalidCapture(event: FormEvent<HTMLFormElement>) {
    if (!isFieldTarget(event.target)) {
      return;
    }

    event.preventDefault();
    const fieldName = event.target.name;

    if (!fieldName) {
      return;
    }

    setFieldError(fieldName, getFieldMessage(event.target));
  }

  function handleInputCapture(event: FormEvent<HTMLFormElement>) {
    if (!isFieldTarget(event.target)) {
      return;
    }

    const fieldName = event.target.name;

    if (!fieldName) {
      return;
    }

    if (event.target.validity.valid) {
      setFieldError(fieldName, null);
      return;
    }

    if (fieldName in errors) {
      setFieldError(fieldName, getFieldMessage(event.target));
    }
  }

  function handleSubmitCapture(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const fields = Array.from(form.elements).filter(isFieldTarget);
    const nextErrors: Record<string, string> = {};

    for (const field of fields) {
      if (!field.name) {
        continue;
      }

      if (!field.validity.valid) {
        nextErrors[field.name] = getFieldMessage(field);
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      event.preventDefault();
      setErrors(nextErrors);

      const firstInvalidField = fields.find(
        (field) => field.name && !field.validity.valid,
      );

      firstInvalidField?.focus();
    }
  }

  return {
    errors,
    formProps: {
      noValidate: true,
      onChangeCapture: handleInputCapture,
      onInputCapture: handleInputCapture,
      onInvalidCapture: handleInvalidCapture,
      onSubmitCapture: handleSubmitCapture,
    },
  };
}

function getFieldClass(error?: string | null) {
  return `${textFieldClass} ${error ? "border-[var(--danger-border)] text-[var(--danger-text)] focus:border-[var(--danger-border)] focus:ring-[var(--danger-border)]/20" : ""}`;
}

function getFieldValidationProps(
  requiredMessage: string,
  patternMessage?: string,
): Record<string, string> {
  return {
    "data-required-message": requiredMessage,
    ...(patternMessage ? { "data-pattern-message": patternMessage } : {}),
  };
}

function getSelectValidationProps(
  requiredMessage: string,
): Record<string, string> {
  return {
    "data-required-message": requiredMessage,
  };
}

function ConfirmDeleteButton({
  actionLabel,
  blockedMessage,
  disabled = false,
  isPending,
  onClick,
}: {
  actionLabel: string;
  blockedMessage?: string;
  disabled?: boolean;
  isPending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`${dangerButtonClass} ${disabled || isPending ? "cursor-not-allowed opacity-50" : ""}`}
      disabled={disabled || isPending}
      onClick={onClick}
      title={disabled ? blockedMessage : actionLabel}
      type="button"
    >
      <Trash2 className="h-4 w-4" />
      {isPending ? `${actionLabel}...` : actionLabel}
    </button>
  );
}

function ConfirmDeleteDialog({
  action,
  confirmMessage,
  deleteFormAction,
  isPending,
  locale,
  onCancel,
  onOpenChange,
  open,
  recordId,
  title,
}: {
  action: "delete_domain" | "delete_server";
  confirmMessage: string;
  deleteFormAction: (formData: FormData) => void;
  isPending: boolean;
  locale: Locale;
  onCancel: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  recordId: string;
  title: string;
}) {
  const copy = getCopy(locale);

  return (
    <DialogShell
      closeLabel={copy.common.close}
      description={copy.dialogs.deleteConfirmationDescription}
      hideTrigger
      onOpenChange={onOpenChange}
      open={open}
      title={copy.dialogs.deleteConfirmationTitle}
      titleIcon={<AlertTriangle className="h-5 w-5 text-[var(--danger-text)]" />}
      triggerLabel=""
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-[24px] border border-[var(--danger-border)] bg-[var(--surface-soft)] p-4">
          <div className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--danger-bg)] text-[var(--danger-text)]">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <h3 className="text-xl font-semibold text-[var(--text)]">{title}</h3>
            <div className="rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm font-medium text-[var(--danger-text)]">
              {confirmMessage}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            className={secondaryButtonClass}
            onClick={onCancel}
            type="button"
          >
            {copy.dialogs.deleteConfirmationCancel}
          </button>

          <form
            action={(formData) => {
              deleteFormAction(formData);
            }}
          >
            <input name="id" type="hidden" value={recordId} />
            <button
              className={dangerButtonClass}
              data-delete-action={action}
              disabled={isPending}
              type="submit"
            >
              <Trash2 className="h-4 w-4" />
              {copy.dialogs.deleteConfirmationConfirm}
            </button>
          </form>
        </div>
      </div>
    </DialogShell>
  );
}

function DialogShell({
  closeLabel,
  title,
  description,
  onAfterClose,
  onBeforeOpen,
  onOpenChange,
  open,
  hideTrigger = false,
  titleIcon,
  triggerIcon,
  triggerLabel,
  triggerClassName = secondaryButtonClass,
  children,
}: {
  closeLabel: string;
  title: string;
  description: string;
  onAfterClose?: () => void;
  onBeforeOpen?: () => void;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  hideTrigger?: boolean;
  titleIcon?: ReactNode;
  triggerIcon?: ReactNode;
  triggerLabel: string;
  triggerClassName?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [contentKey, setContentKey] = useState(0);

  function remountContent() {
    setContentKey((current) => current + 1);
  }

  useLayoutEffect(() => {
    if (open === undefined || !ref.current) {
      return;
    }

    const dialog = ref.current;

    if (open && !dialog.open) {
      onBeforeOpen?.();
      dialog.showModal();
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [onBeforeOpen, open]);

  return (
    <>
      {hideTrigger ? null : (
        <button
          className={triggerClassName}
          onClick={() => {
            if (onOpenChange) {
              onOpenChange(true);
              return;
            }

            remountContent();
            onBeforeOpen?.();
            ref.current?.showModal();
          }}
          type="button"
        >
          {triggerIcon}
          {triggerLabel}
        </button>
      )}
      <dialog
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        className="m-auto h-auto max-h-[calc(100vh-24px)] w-[min(760px,calc(100vw-16px))] border-0 bg-transparent p-0 sm:w-[min(760px,calc(100vw-24px))]"
        onClose={() => {
          remountContent();
          onOpenChange?.(false);
          onAfterClose?.();
        }}
        onClick={(event) => {
          if (event.target === ref.current) {
            ref.current?.close();
          }
        }}
        ref={ref}
      >
        <div
          className="max-h-[inherit] overflow-y-auto rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] backdrop-blur sm:p-5 lg:p-6"
          key={contentKey}
        >
          <div className="sticky top-0 z-[1] -mx-4 mb-5 flex items-start justify-between gap-4 border-b border-[var(--line)] bg-[var(--surface)] px-4 pb-4 pt-1 sm:-mx-5 sm:px-5 lg:-mx-6 lg:px-6">
            <div>
              <h2
                className="inline-flex items-center gap-2 font-[var(--font-geist-mono)] text-[1.35rem] font-semibold text-[var(--text)]"
                id={titleId}
              >
                {titleIcon}
                {title}
              </h2>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]" id={descriptionId}>
                {description}
              </p>
            </div>
            <form method="dialog">
              <button
                aria-label={closeLabel}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-control)] text-[var(--text)] transition hover:border-[var(--accent)]/30 hover:bg-[var(--surface-control-hover)]"
                type="submit"
              >
                <X className="h-4 w-4" />
              </button>
            </form>
          </div>
          {children}
        </div>
      </dialog>
    </>
  );
}

export function CreateServerDialog({
  canManageProfiles = true,
  locale,
}: {
  canManageProfiles?: boolean;
  locale: Locale;
}) {
  const copy = getCopy(locale);
  const [state, formAction, isPending] = useActionState(
    createServer,
    CRUD_ACTION_INITIAL_STATE,
  );
  const { errors, formProps } = useFormValidation();
  const nameErrorId = useId();
  const ipAddressErrorId = useId();
  const profileNameErrorId = useId();

  useCrudToast(copy, state);
  useCloseDialogOnSuccess(state.status);

  return (
    <DialogShell
      closeLabel={copy.common.close}
      description={copy.dialogs.createServerDescription}
      title={copy.dialogs.createServerTitle}
      titleIcon={<ServerIcon className="h-5 w-5 text-[var(--accent-deep)]" />}
      triggerIcon={<Plus className="h-4 w-4" />}
      triggerLabel={copy.dialogs.addServer}
    >
      <form {...formProps} className="grid gap-2.5 md:grid-cols-2">
        <FormField error={errors.name} errorId={nameErrorId} label={copy.dialogs.serverName}>
          <input
            {...getFieldValidationProps(copy.dialogs.requiredFieldMessage)}
            aria-describedby={errors.name ? nameErrorId : undefined}
            aria-invalid={Boolean(errors.name)}
            className={getFieldClass(errors.name)}
            name="name"
            placeholder={copy.dialogs.serverName}
            required
          />
        </FormField>
        <FormField
          error={errors.ipAddress}
          errorId={ipAddressErrorId}
          label={copy.dialogs.ipAddress}
        >
          <input
            {...getFieldValidationProps(
              copy.dialogs.requiredFieldMessage,
              copy.dialogs.invalidIpAddressFieldMessage,
            )}
            autoCapitalize="off"
            aria-describedby={errors.ipAddress ? ipAddressErrorId : undefined}
            aria-invalid={Boolean(errors.ipAddress)}
            className={getFieldClass(errors.ipAddress)}
            inputMode="decimal"
            name="ipAddress"
            pattern={IPV4_PATTERN.source}
            placeholder={copy.dialogs.ipAddress}
            required
            spellCheck={false}
          />
        </FormField>
        {canManageProfiles ? (
          <FormField
            error={errors.profileName}
            errorId={profileNameErrorId}
            label={copy.dialogs.profileName}
          >
            <input
              {...getFieldValidationProps(copy.dialogs.requiredFieldMessage)}
              aria-describedby={errors.profileName ? profileNameErrorId : undefined}
              aria-invalid={Boolean(errors.profileName)}
              className={getFieldClass(errors.profileName)}
              name="profileName"
              placeholder={copy.dialogs.profileName}
              required
            />
          </FormField>
        ) : null}
        <FormField label={copy.servers.tableColumns.provider}>
          <select className={textFieldClass} name="provider" defaultValue="AWS_LIGHTSAIL">
            {SERVER_PROVIDERS.map((provider) => (
              <option key={provider} value={provider}>
                {getServerProviderLabel(locale, provider)}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={copy.servers.tableColumns.environment}>
          <select className={textFieldClass} name="environment" defaultValue="PROD">
            {ENVIRONMENTS.map((environment) => (
              <option key={environment} value={environment}>
                {getEnvironmentLabel(locale, environment)}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={copy.dialogs.region}>
          <input className={textFieldClass} name="region" placeholder={copy.dialogs.region} />
        </FormField>
        <FormField className="md:col-span-2" label={copy.dialogs.note}>
          <textarea
            className={`${textFieldClass} min-h-24 resize-y`}
            name="note"
            placeholder={copy.dialogs.note}
            rows={3}
          />
        </FormField>
        <button
          className={`${primaryButtonClass} md:col-span-2`}
          disabled={isPending}
          formAction={formAction}
          type="submit"
        >
          <Plus className="h-4 w-4" />
          {isPending ? `${copy.dialogs.createServer}...` : copy.dialogs.createServer}
        </button>
      </form>
    </DialogShell>
  );
}

export function EditServerDialog({
  canManageProfiles = true,
  domainCount,
  locale,
  server,
}: {
  canManageProfiles?: boolean;
  domainCount: number;
  locale: Locale;
  server: Server;
}) {
  const copy = getCopy(locale);
  const canDelete = domainCount === 0;
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [updateState, updateFormAction, isUpdatePending] = useActionState(
    updateServer,
    CRUD_ACTION_INITIAL_STATE,
  );
  const [deleteState, deleteFormAction, isDeletePending] = useActionState(
    deleteServer,
    CRUD_ACTION_INITIAL_STATE,
  );
  const { errors, formProps } = useFormValidation();
  const nameErrorId = useId();
  const ipAddressErrorId = useId();
  const profileNameErrorId = useId();

  useCrudToast(copy, updateState);
  useCrudToast(copy, deleteState);
  useEffect(() => {
    if (updateState.status === "success") {
      const timeoutId = window.setTimeout(() => {
        setIsEditOpen(false);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [updateState.status]);

  useEffect(() => {
    if (deleteState.status === "success") {
      const timeoutId = window.setTimeout(() => {
        setIsConfirmOpen(false);
        setIsEditOpen(false);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [deleteState.status]);

  return (
    <>
    <DialogShell
      closeLabel={copy.common.close}
      description={copy.dialogs.editServerDescription}
      onOpenChange={setIsEditOpen}
      open={isEditOpen}
      title={copy.dialogs.editServerTitle}
      triggerClassName={tableActionClass}
      titleIcon={<Pencil className="h-5 w-5 text-[var(--accent-deep)]" />}
      triggerIcon={<Pencil className="h-4 w-4" />}
      triggerLabel={copy.dialogs.edit}
    >
      <div className="space-y-4">
        <form {...formProps} className="grid gap-2.5 md:grid-cols-2">
          <input name="id" type="hidden" value={server.id} />
          <FormField error={errors.name} errorId={nameErrorId} label={copy.dialogs.serverName}>
            <input
              {...getFieldValidationProps(copy.dialogs.requiredFieldMessage)}
              aria-describedby={errors.name ? nameErrorId : undefined}
              aria-invalid={Boolean(errors.name)}
              className={getFieldClass(errors.name)}
              defaultValue={server.name}
              name="name"
              placeholder={copy.dialogs.serverName}
              required
            />
          </FormField>
          <FormField
            error={errors.ipAddress}
            errorId={ipAddressErrorId}
            label={copy.dialogs.ipAddress}
          >
            <input
              {...getFieldValidationProps(
                copy.dialogs.requiredFieldMessage,
                copy.dialogs.invalidIpAddressFieldMessage,
              )}
              autoCapitalize="off"
              aria-describedby={errors.ipAddress ? ipAddressErrorId : undefined}
              aria-invalid={Boolean(errors.ipAddress)}
              className={getFieldClass(errors.ipAddress)}
              defaultValue={server.ipAddress}
              inputMode="decimal"
              name="ipAddress"
              pattern={IPV4_PATTERN.source}
              placeholder={copy.dialogs.ipAddress}
              required
              spellCheck={false}
            />
          </FormField>
          {canManageProfiles ? (
            <FormField
              error={errors.profileName}
              errorId={profileNameErrorId}
              label={copy.dialogs.profileName}
            >
              <input
                {...getFieldValidationProps(copy.dialogs.requiredFieldMessage)}
                aria-describedby={errors.profileName ? profileNameErrorId : undefined}
                aria-invalid={Boolean(errors.profileName)}
                className={getFieldClass(errors.profileName)}
                defaultValue={server.profileName}
                name="profileName"
                placeholder={copy.dialogs.profileName}
                required
              />
            </FormField>
          ) : null}
          <FormField label={copy.servers.tableColumns.provider}>
            <select className={textFieldClass} defaultValue={server.provider} name="provider">
              {SERVER_PROVIDERS.map((provider) => (
                <option key={provider} value={provider}>
                  {getServerProviderLabel(locale, provider)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={copy.servers.tableColumns.environment}>
            <select className={textFieldClass} defaultValue={server.environment} name="environment">
              {ENVIRONMENTS.map((environment) => (
                <option key={environment} value={environment}>
                  {getEnvironmentLabel(locale, environment)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={copy.dialogs.region}>
            <input
              className={textFieldClass}
              defaultValue={server.region ?? ""}
              name="region"
              placeholder={copy.dialogs.region}
            />
          </FormField>
          <FormField className="md:col-span-2" label={copy.dialogs.note}>
            <textarea
              className={`${textFieldClass} min-h-24 resize-y`}
              defaultValue={server.note ?? ""}
              name="note"
              placeholder={copy.dialogs.note}
              rows={3}
            />
          </FormField>
          <button
            className={`${primaryButtonClass} md:col-span-2`}
            disabled={isUpdatePending}
            formAction={updateFormAction}
            type="submit"
          >
            <Save className="h-4 w-4" />
            {isUpdatePending ? `${copy.dialogs.saveChanges}...` : copy.dialogs.saveChanges}
          </button>
        </form>

        <ConfirmDeleteButton
          actionLabel={copy.dialogs.deleteServer}
          disabled={!canDelete}
          blockedMessage={copy.dialogs.linkedDomainsBlockDelete}
          isPending={isDeletePending}
          onClick={() => {
            setIsEditOpen(false);
            setIsConfirmOpen(true);
          }}
        />
      </div>
    </DialogShell>
    <ConfirmDeleteDialog
      action="delete_server"
      confirmMessage={copy.dialogs.confirmDeleteServer}
      deleteFormAction={deleteFormAction}
      isPending={isDeletePending}
      locale={locale}
      onCancel={() => {
        setIsConfirmOpen(false);
        setIsEditOpen(true);
      }}
      onOpenChange={(open) => {
        setIsConfirmOpen(open);
        if (!open && deleteState.status !== "success") {
          setIsEditOpen(true);
        }
      }}
      open={isConfirmOpen}
      recordId={server.id}
      title={server.name}
    />
    </>
  );
}

function ImportDialogContent({
  analyzeAction,
  action,
  extraFields,
  locale,
  parsePreview,
  previewTitle,
  submitLabel,
  templateHref,
}: {
  analyzeAction: (
    state: DryRunActionState,
    formData: FormData,
  ) => Promise<DryRunActionState>;
  action: (
    state: ImportActionState,
    formData: FormData,
  ) => Promise<ImportActionState>;
  extraFields?: ReactNode;
  locale: Locale;
  parsePreview: (fileName: string, text: string) => ImportPreviewTable;
  previewTitle: string;
  submitLabel: string;
  templateHref: string;
}) {
  const copy = getCopy(locale);
  const { pushToast } = useToast();
  const [state, formAction, isPending] = useActionState(
    action,
    IMPORT_ACTION_INITIAL_STATE,
  );
  const [dryRunState, dryRunFormAction, isDryRunPending] = useActionState(
    analyzeAction,
    DRY_RUN_ACTION_INITIAL_STATE,
  );
  const [preview, setPreview] = useState<ImportPreviewTable | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const importToastKeyRef = useRef<string | null>(null);
  const isSuccess = state.status === "success";
  const isError = state.status === "error";
  const isDryRunSuccess = dryRunState.status === "success";
  const isDryRunError = dryRunState.status === "error";
  useCloseDialogOnSuccess(state.status);
  const importWarnings = [
    state.skippedBreakdown.duplicate_in_file
      ? copy.dialogs.skippedReasonCount(
          copy.dialogs.reasonDuplicateInFile,
          state.skippedBreakdown.duplicate_in_file,
        )
      : null,
    state.skippedBreakdown.server_not_found
      ? copy.dialogs.skippedReasonCount(
          copy.dialogs.reasonServerNotFound,
          state.skippedBreakdown.server_not_found,
        )
      : null,
    state.skippedBreakdown.invalid_data
      ? copy.dialogs.skippedReasonCount(
          copy.dialogs.reasonInvalidData,
          state.skippedBreakdown.invalid_data,
        )
      : null,
  ].filter(Boolean) as string[];

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    setPreview(null);
    setPreviewFileName(file?.name ?? null);
    setPreviewError(null);

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      setPreview(parsePreview(file.name, text));
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "Preview failed.");
    }
  }

  useEffect(() => {
    if (state.status === "idle") {
      return;
    }

    const key = `${state.status}:${state.fileName ?? "file"}:${state.importedCount}:${state.skippedCount}:${state.message ?? "none"}`;

    if (importToastKeyRef.current === key) {
      return;
    }

    importToastKeyRef.current = key;

    if (state.status === "success") {
      pushToast({
        title: copy.dialogs.importSummary(
          state.fileName ?? submitLabel,
          state.importedCount,
          state.skippedCount,
        ),
        tone: "success",
      });
      return;
    }

    pushToast({
      title: state.message ?? copy.dialogs.importErrorPrefix,
      tone: "error",
    });
  }, [copy, pushToast, state, submitLabel]);

  return (
    <form action={formAction} className="grid gap-4">
        <FormField label={copy.dialogs.chooseImportFile}>
          <input
            accept=".csv,.json,text/csv,application/json"
            className={textFieldClass}
            onChange={handleFileChange}
            name="file"
            required
            type="file"
          />
        </FormField>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--muted)]">
          <span>{copy.dialogs.importSupportsSheetCsv}</span>
          <a
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-control)] px-3 py-2 text-sm font-medium text-[var(--text)] transition hover:border-[var(--accent)]/30 hover:bg-[var(--surface-control-hover)]"
            href={templateHref}
          >
            <Download className="h-4 w-4" />
            {copy.dialogs.downloadTemplate}
          </a>
        </div>
        {extraFields}
        {previewFileName ? (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text)]">
                <Eye className="h-4 w-4 text-[var(--accent-deep)]" />
                {previewTitle}
              </div>
              <div className="text-xs text-[var(--muted)]">
                {previewFileName}
                {preview ? ` • ${copy.common.rows}: ${preview.rows.length}` : ""}
              </div>
            </div>
            {previewError ? (
              <p className="mt-3 text-sm text-[var(--danger-text)]">{previewError}</p>
            ) : (
              <div className="mt-3">
                {!preview || preview.rows.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">{copy.dialogs.previewEmpty}</p>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse">
                        <thead className="bg-[var(--table-head)]">
                          <tr className="border-b border-[var(--line)] text-left text-[0.72rem] uppercase tracking-[0.12em] text-[var(--muted)]">
                            {preview.columns.map((column) => (
                              <th className="px-3 py-2.5 font-medium" key={column}>
                                {column}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.rows.map((row) => (
                            <tr
                              className="border-b border-[var(--line)] last:border-b-0"
                              key={row.id}
                            >
                              {row.cells.map((cell, index) => (
                                <td
                                  className="px-3 py-2.5 text-sm text-[var(--text)]"
                                  key={`${row.id}-${index}`}
                                >
                                  <span className="block whitespace-nowrap">
                                    {cell || copy.common.none}
                                  </span>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
        {isSuccess ? (
          <div className="rounded-2xl border border-[var(--success-border)] bg-[var(--success-bg)] px-4 py-3 text-sm text-[var(--success-text)]">
            <div className="inline-flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              {copy.dialogs.importSummary(
                state.fileName ?? submitLabel,
                state.importedCount,
                state.skippedCount,
              )}
            </div>
            <p className="mt-1 text-xs opacity-80">
              {state.totalCount > 0
                ? copy.dialogs.importProcessedTotal(state.totalCount)
                : null}
            </p>
          </div>
        ) : null}
        {isSuccess && importWarnings.length > 0 ? (
          <div className="rounded-2xl border border-[var(--warn-border)] bg-[var(--warn-bg)] px-4 py-3 text-sm text-[var(--warn-text)]">
            <div className="inline-flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4" />
              {copy.dialogs.importWarningsTitle}
            </div>
            <div className="mt-2 space-y-1 text-xs opacity-90">
              {importWarnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          </div>
        ) : null}
        {isError ? (
          <div className="rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">
            <div className="inline-flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4" />
              {copy.dialogs.importErrorPrefix}
            </div>
            <p className="mt-1 text-xs opacity-80">{state.message}</p>
          </div>
        ) : null}
        {isDryRunSuccess ? (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-[var(--text)]">
              <Eye className="h-4 w-4 text-[var(--accent-deep)]" />
              {copy.dialogs.dryRunTitle}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3">
                <div className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                  {copy.dialogs.dryRunCreate}
                </div>
                <div className="mt-1 text-lg font-semibold text-[var(--text)]">
                  {dryRunState.createCount}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3">
                <div className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                  {copy.dialogs.dryRunUpdate}
                </div>
                <div className="mt-1 text-lg font-semibold text-[var(--text)]">
                  {dryRunState.updateCount}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3">
                <div className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                  {copy.dialogs.dryRunSkip}
                </div>
                <div className="mt-1 text-lg font-semibold text-[var(--text)]">
                  {dryRunState.skipCount}
                </div>
              </div>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead className="bg-[var(--table-head)]">
                    <tr className="border-b border-[var(--line)] text-left text-[0.72rem] uppercase tracking-[0.12em] text-[var(--muted)]">
                      <th className="px-3 py-2.5 font-medium">{copy.dialogs.dryRunRow}</th>
                      <th className="px-3 py-2.5 font-medium">{copy.dialogs.dryRunAction}</th>
                      <th className="px-3 py-2.5 font-medium">{copy.dialogs.dryRunTarget}</th>
                      <th className="px-3 py-2.5 font-medium">{copy.dialogs.dryRunReason}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dryRunState.rows.length === 0 ? (
                      <tr>
                        <td className="px-3 py-3 text-sm text-[var(--muted)]" colSpan={4}>
                          {copy.dialogs.previewEmpty}
                        </td>
                      </tr>
                    ) : (
                      dryRunState.rows.map((row, index) => (
                        <tr className="border-b border-[var(--line)] last:border-b-0" key={`${row.key}-${index}`}>
                          <td className="px-3 py-2.5 text-sm text-[var(--text)]">{row.key}</td>
                          <td className="px-3 py-2.5 text-sm text-[var(--text)]">
                            {row.action === "create"
                              ? copy.dialogs.dryRunCreate
                              : row.action === "update"
                                ? copy.dialogs.dryRunUpdate
                                : copy.dialogs.dryRunSkip}
                          </td>
                          <td className="px-3 py-2.5 text-sm text-[var(--text)]">
                            {row.secondary ?? copy.common.none}
                          </td>
                          <td className="px-3 py-2.5 text-sm text-[var(--muted)]">
                            {row.reason === "duplicate_in_file"
                              ? copy.dialogs.reasonDuplicateInFile
                              : row.reason === "server_not_found"
                                ? copy.dialogs.reasonServerNotFound
                                : row.reason === "invalid_data"
                                  ? copy.dialogs.reasonInvalidData
                                  : copy.common.none}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
        {isDryRunError ? (
          <div className="rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">
            <div className="inline-flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4" />
              {copy.dialogs.dryRunErrorPrefix}
            </div>
            <p className="mt-1 text-xs opacity-80">{dryRunState.message}</p>
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <button className={secondaryButtonClass} formAction={dryRunFormAction} type="submit">
            <Eye className="h-4 w-4" />
            {isDryRunPending ? `${copy.dialogs.runDryRun}...` : copy.dialogs.runDryRun}
          </button>
          <button className={primaryButtonClass} formAction={formAction} type="submit">
            <Upload className="h-4 w-4" />
            {isPending ? `${submitLabel}...` : submitLabel}
          </button>
        </div>
      </form>
  );
}

function ImportDialog({
  analyzeAction,
  action,
  description,
  extraFields,
  locale,
  parsePreview,
  previewTitle,
  templateHref,
  title,
  triggerLabel,
  submitLabel,
  onDialogReset,
}: {
  analyzeAction: (
    state: DryRunActionState,
    formData: FormData,
  ) => Promise<DryRunActionState>;
  action: (
    state: ImportActionState,
    formData: FormData,
  ) => Promise<ImportActionState>;
  description: string;
  extraFields?: ReactNode;
  locale: Locale;
  parsePreview: (fileName: string, text: string) => ImportPreviewTable;
  previewTitle: string;
  templateHref: string;
  title: string;
  triggerLabel: string;
  submitLabel: string;
  onDialogReset?: () => void;
}) {
  return (
    <DialogShell
      closeLabel={getCopy(locale).common.close}
      description={description}
      onAfterClose={onDialogReset}
      onBeforeOpen={onDialogReset}
      title={title}
      titleIcon={<FileUp className="h-5 w-5 text-[var(--accent-deep)]" />}
      triggerIcon={<Upload className="h-4 w-4" />}
      triggerLabel={triggerLabel}
    >
      <ImportDialogContent
        action={action}
        analyzeAction={analyzeAction}
        extraFields={extraFields}
        locale={locale}
        parsePreview={parsePreview}
        previewTitle={previewTitle}
        submitLabel={submitLabel}
        templateHref={templateHref}
      />
    </DialogShell>
  );
}

export function ImportServersDialog({
  canManageProfiles = true,
  locale,
}: {
  canManageProfiles?: boolean;
  locale: Locale;
}) {
  const copy = getCopy(locale);

  return (
    <ImportDialog
      analyzeAction={analyzeServersImport}
      action={importServers}
      description={copy.dialogs.importServersDescription}
      locale={locale}
      parsePreview={(fileName, text) => ({
        columns: [
          copy.dialogs.serverName,
          copy.dialogs.ipAddress,
          copy.dialogs.profileName,
          copy.dialogs.region,
        ],
        rows: parseServersImport(fileName, text)
          .slice(0, 5)
          .map((entry, index) => ({
            id: `${entry.id ?? entry.name}-${index}`,
            cells: [
              entry.name,
              entry.ipAddress,
              canManageProfiles ? entry.profileName : copy.common.none,
              entry.region ?? "",
            ],
          })),
      })}
      previewTitle={copy.dialogs.previewServers}
      submitLabel={copy.dialogs.importServers}
      templateHref="/api/export/templates/servers"
      title={copy.dialogs.importServersTitle}
      triggerLabel={copy.common.import}
    />
  );
}

export function ImportDomainsDialog({
  canManageProfiles = true,
  locale,
  servers,
}: {
  canManageProfiles?: boolean;
  locale: Locale;
  servers: Server[];
}) {
  const copy = getCopy(locale);
  const [serverMode, setServerMode] = useState<"existing" | "create">("existing");

  return (
    <ImportDialog
      analyzeAction={analyzeDomainsImport}
      action={importDomains}
      description={copy.dialogs.importDomainsDescription}
      extraFields={
        <div className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-[var(--text)]">
              {copy.dialogs.importServerFlowTitle}
            </p>
            <p className="text-sm text-[var(--muted)]">
              {copy.dialogs.importServerFlowDescription}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                {copy.dialogs.serverMode}
              </span>
              <select
                className={textFieldClass}
                defaultValue={serverMode}
                name="serverMode"
                onChange={(event) =>
                  setServerMode(event.currentTarget.value as "existing" | "create")
                }
              >
                <option value="existing">{copy.dialogs.useExistingServer}</option>
                <option value="create">{copy.dialogs.createServerBeforeImport}</option>
              </select>
            </label>
          </div>

          {serverMode === "existing" ? (
            <label className="grid gap-2">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                {copy.dialogs.selectServer}
              </span>
              <select className={textFieldClass} defaultValue="" name="targetServerId" required>
                <option disabled value="">
                  {copy.dialogs.selectServer}
                </option>
                {servers.map((server) => (
                  <option key={server.id} value={server.id}>
                    {server.name} ({server.ipAddress})
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="grid gap-2.5 md:grid-cols-2">
              <FormField label={copy.dialogs.serverName}>
                <input
                  className={textFieldClass}
                  name="serverName"
                  placeholder={copy.dialogs.serverName}
                  required={serverMode === "create"}
                />
              </FormField>
              <FormField label={copy.dialogs.ipAddress}>
                <input
                  className={textFieldClass}
                  name="ipAddress"
                  placeholder={copy.dialogs.ipAddress}
                  required={serverMode === "create"}
                />
              </FormField>
              {canManageProfiles ? (
                <FormField label={copy.dialogs.profileName}>
                  <input
                    className={textFieldClass}
                    name="profileName"
                    placeholder={copy.dialogs.profileName}
                    required={serverMode === "create"}
                  />
                </FormField>
              ) : null}
              <FormField label={copy.servers.tableColumns.provider}>
                <select className={textFieldClass} defaultValue="AWS_LIGHTSAIL" name="provider">
                  {SERVER_PROVIDERS.map((provider) => (
                    <option key={provider} value={provider}>
                      {getServerProviderLabel(locale, provider)}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label={copy.servers.tableColumns.environment}>
                <select className={textFieldClass} defaultValue="PROD" name="environment">
                  {ENVIRONMENTS.map((environment) => (
                    <option key={environment} value={environment}>
                      {getEnvironmentLabel(locale, environment)}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label={copy.dialogs.region}>
                <input className={textFieldClass} name="region" placeholder={copy.dialogs.region} />
              </FormField>
              <FormField className="md:col-span-2" label={copy.dialogs.note}>
                <textarea
                  className={`${textFieldClass} min-h-24 resize-y`}
                  name="note"
                  placeholder={copy.dialogs.note}
                  rows={3}
                />
              </FormField>
            </div>
          )}
        </div>
      }
      locale={locale}
      parsePreview={(fileName, text) => ({
        columns: [
          copy.dialogs.domainName,
          copy.dialogs.serverName,
          copy.dialogs.ipAddress,
          copy.dialogs.previewHostType,
          copy.dialogs.previewStatus,
        ],
        rows: parseDomainsImport(fileName, text)
          .slice(0, 5)
          .map((entry, index) => ({
            id: `${entry.id ?? entry.name}-${index}`,
            cells: [
              entry.name,
              entry.serverName ?? "",
              entry.serverIpAddress ?? "",
              entry.hostType,
              entry.status,
            ],
          })),
      })}
      previewTitle={copy.dialogs.previewDomains}
      submitLabel={copy.dialogs.importDomains}
      templateHref="/api/export/templates/domains"
      title={copy.dialogs.importDomainsTitle}
      triggerLabel={copy.common.import}
      onDialogReset={() => setServerMode("existing")}
    />
  );
}

export function CreateDomainDialog({
  canManageProfiles = true,
  locale,
  servers,
}: {
  canManageProfiles?: boolean;
  locale: Locale;
  servers: Server[];
}) {
  const copy = getCopy(locale);
  const [state, formAction, isPending] = useActionState(
    createDomain,
    CRUD_ACTION_INITIAL_STATE,
  );
  const { errors, formProps } = useFormValidation();
  const domainNameErrorId = useId();
  const serverIdErrorId = useId();

  useCrudToast(copy, state);
  useCloseDialogOnSuccess(state.status);

  return (
    <DialogShell
      closeLabel={copy.common.close}
      description={copy.dialogs.createDomainDescription}
      title={copy.dialogs.createDomainTitle}
      titleIcon={<Plus className="h-5 w-5 text-[var(--accent-deep)]" />}
      triggerIcon={<Plus className="h-4 w-4" />}
      triggerLabel={copy.dialogs.addDomain}
    >
      <form {...formProps} className="grid gap-2.5 md:grid-cols-2">
        <FormField
          error={errors.name}
          errorId={domainNameErrorId}
          label={copy.dialogs.domainName}
        >
          <input
            {...getFieldValidationProps(
              copy.dialogs.requiredFieldMessage,
              copy.dialogs.invalidDomainNameFieldMessage,
            )}
            autoCapitalize="off"
            aria-describedby={errors.name ? domainNameErrorId : undefined}
            aria-invalid={Boolean(errors.name)}
            className={getFieldClass(errors.name)}
            name="name"
            pattern={DOMAIN_PATTERN.source}
            placeholder={copy.dialogs.domainName}
            required
            spellCheck={false}
          />
        </FormField>
        <FormField
          error={errors.serverId}
          errorId={serverIdErrorId}
          label={copy.dialogs.selectServer}
        >
          <select
            {...getSelectValidationProps(copy.dialogs.requiredFieldMessage)}
            aria-describedby={errors.serverId ? serverIdErrorId : undefined}
            aria-invalid={Boolean(errors.serverId)}
            className={getFieldClass(errors.serverId)}
            name="serverId"
            defaultValue=""
            required
          >
            <option disabled value="">
              {copy.dialogs.selectServer}
            </option>
            {servers.map((server) => (
              <option key={server.id} value={server.id}>
                {server.name} ({server.ipAddress})
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={copy.domains.tableColumns.host}>
          <select className={textFieldClass} name="hostType" defaultValue="WWW">
            {HOST_TYPES.map((hostType) => (
              <option key={hostType} value={hostType}>
                {getHostTypeLabel(locale, hostType)}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={copy.domains.tableColumns.status}>
          <select className={textFieldClass} name="status" defaultValue="DF">
            {DOMAIN_STATUSES.map((status) => (
              <option key={status} value={status}>
                {getStatusLabel(locale, status)}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={copy.domains.tableColumns.panel}>
          <select className={textFieldClass} name="panelStatus" defaultValue="AAPANEL">
            {PANEL_STATUSES.map((panelStatus) => (
              <option key={panelStatus} value={panelStatus}>
                {getPanelStatusLabel(locale, panelStatus)}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={copy.domains.tableColumns.s3}>
          <select className={textFieldClass} name="s3Status" defaultValue="MISSING">
            {SERVICE_STATUSES.map((serviceStatus) => (
              <option key={serviceStatus} value={serviceStatus}>
                {getServiceStatusLabel(locale, serviceStatus)}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={copy.dialogs.subdomainProvider}>
          <input
            className={textFieldClass}
            name="subdomainProvider"
            placeholder={copy.dialogs.subdomainProvider}
          />
        </FormField>
        {canManageProfiles ? (
          <FormField label={copy.dialogs.ownerProfile}>
            <input className={textFieldClass} name="ownerProfile" placeholder={copy.dialogs.ownerProfile} />
          </FormField>
        ) : null}
        <FormField label={copy.domains.tableColumns.postman}>
          <select className={textFieldClass} name="postmanStatus" defaultValue="MISSING">
            {SERVICE_STATUSES.map((serviceStatus) => (
              <option key={serviceStatus} value={serviceStatus}>
                {getServiceStatusLabel(locale, serviceStatus)}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={copy.domains.tableColumns.uptime}>
          <select className={textFieldClass} name="uptimeStatus" defaultValue="MISSING">
            {SERVICE_STATUSES.map((serviceStatus) => (
              <option key={serviceStatus} value={serviceStatus}>
                {getServiceStatusLabel(locale, serviceStatus)}
              </option>
            ))}
          </select>
        </FormField>
        <FormField className="md:col-span-2" label={copy.dialogs.operationalNote}>
          <textarea
            className={`${textFieldClass} min-h-24 resize-y`}
            name="note"
            placeholder={copy.dialogs.operationalNote}
            rows={3}
          />
        </FormField>
        <button
          className={`${primaryButtonClass} md:col-span-2`}
          disabled={isPending}
          formAction={formAction}
          type="submit"
        >
          <Plus className="h-4 w-4" />
          {isPending ? `${copy.dialogs.createDomain}...` : copy.dialogs.createDomain}
        </button>
      </form>
    </DialogShell>
  );
}

export function EditDomainDialog({
  canManageProfiles = true,
  domain,
  locale,
  serverName,
}: {
  canManageProfiles?: boolean;
  domain: Domain;
  locale: Locale;
  serverName: string;
}) {
  const copy = getCopy(locale);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [updateState, updateFormAction, isUpdatePending] = useActionState(
    updateDomain,
    CRUD_ACTION_INITIAL_STATE,
  );
  const [deleteState, deleteFormAction, isDeletePending] = useActionState(
    deleteDomain,
    CRUD_ACTION_INITIAL_STATE,
  );
  const { formProps } = useFormValidation();

  useCrudToast(copy, updateState);
  useCrudToast(copy, deleteState);
  useEffect(() => {
    if (updateState.status === "success") {
      const timeoutId = window.setTimeout(() => {
        setIsEditOpen(false);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [updateState.status]);

  useEffect(() => {
    if (deleteState.status === "success") {
      const timeoutId = window.setTimeout(() => {
        setIsConfirmOpen(false);
        setIsEditOpen(false);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [deleteState.status]);

  return (
    <>
    <DialogShell
      closeLabel={copy.common.close}
      description={`${domain.name} on ${serverName}`}
      onOpenChange={setIsEditOpen}
      open={isEditOpen}
      title={copy.dialogs.editDomainTitle}
      triggerClassName={tableActionClass}
      titleIcon={<Pencil className="h-5 w-5 text-[var(--accent-deep)]" />}
      triggerIcon={<Pencil className="h-4 w-4" />}
      triggerLabel={copy.dialogs.edit}
    >
      <form {...formProps} className="grid gap-2.5 md:grid-cols-2">
        <input name="id" type="hidden" value={domain.id} />
        <FormField label={copy.dialogs.domainName}>
          <input className={`${textFieldClass} opacity-70`} disabled value={domain.name} />
        </FormField>
        <FormField label={copy.dialogs.selectServer}>
          <input className={`${textFieldClass} opacity-70`} disabled value={serverName} />
        </FormField>
        <FormField label={copy.domains.tableColumns.status}>
          <select className={textFieldClass} name="status" defaultValue={domain.status}>
            {DOMAIN_STATUSES.map((status) => (
              <option key={status} value={status}>
                {getStatusLabel(locale, status)}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={copy.domains.tableColumns.host}>
          <select className={textFieldClass} name="hostType" defaultValue={domain.hostType}>
            {HOST_TYPES.map((hostType) => (
              <option key={hostType} value={hostType}>
                {getHostTypeLabel(locale, hostType)}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={copy.domains.tableColumns.panel}>
          <select className={textFieldClass} name="panelStatus" defaultValue={domain.panelStatus}>
            {PANEL_STATUSES.map((panelStatus) => (
              <option key={panelStatus} value={panelStatus}>
                {getPanelStatusLabel(locale, panelStatus)}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={copy.domains.tableColumns.s3}>
          <select className={textFieldClass} name="s3Status" defaultValue={domain.s3Status}>
            {SERVICE_STATUSES.map((serviceStatus) => (
              <option key={serviceStatus} value={serviceStatus}>
                {getServiceStatusLabel(locale, serviceStatus)}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={copy.dialogs.subdomainProvider}>
          <input
            className={textFieldClass}
            defaultValue={domain.subdomainProvider ?? ""}
            name="subdomainProvider"
            placeholder={copy.dialogs.subdomainProvider}
          />
        </FormField>
        {canManageProfiles ? (
          <FormField label={copy.dialogs.ownerProfile}>
            <input
              className={textFieldClass}
              defaultValue={domain.ownerProfile ?? ""}
              name="ownerProfile"
              placeholder={copy.dialogs.ownerProfile}
            />
          </FormField>
        ) : null}
        <FormField label={copy.domains.tableColumns.postman}>
          <select className={textFieldClass} name="postmanStatus" defaultValue={domain.postmanStatus}>
            {SERVICE_STATUSES.map((serviceStatus) => (
              <option key={serviceStatus} value={serviceStatus}>
                {getServiceStatusLabel(locale, serviceStatus)}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={copy.domains.tableColumns.uptime}>
          <select className={textFieldClass} name="uptimeStatus" defaultValue={domain.uptimeStatus}>
            {SERVICE_STATUSES.map((serviceStatus) => (
              <option key={serviceStatus} value={serviceStatus}>
                {getServiceStatusLabel(locale, serviceStatus)}
              </option>
            ))}
          </select>
        </FormField>
        <FormField className="md:col-span-2" label={copy.dialogs.operationalNote}>
          <textarea
            className={`${textFieldClass} min-h-24 resize-y`}
            defaultValue={domain.note ?? ""}
            name="note"
            rows={3}
          />
        </FormField>
        <div className="md:col-span-2">
          <button
            className={primaryButtonClass}
            disabled={isUpdatePending}
            formAction={updateFormAction}
            type="submit"
          >
            <Save className="h-4 w-4" />
            {isUpdatePending ? `${copy.dialogs.saveChanges}...` : copy.dialogs.saveChanges}
          </button>
        </div>
      </form>
      <div className="mt-3">
        <ConfirmDeleteButton
          actionLabel={copy.dialogs.deleteDomain}
          isPending={isDeletePending}
          onClick={() => {
            setIsEditOpen(false);
            setIsConfirmOpen(true);
          }}
        />
      </div>
    </DialogShell>
    <ConfirmDeleteDialog
      action="delete_domain"
      confirmMessage={copy.dialogs.confirmDeleteDomain}
      deleteFormAction={deleteFormAction}
      isPending={isDeletePending}
      locale={locale}
      onCancel={() => {
        setIsConfirmOpen(false);
        setIsEditOpen(true);
      }}
      onOpenChange={(open) => {
        setIsConfirmOpen(open);
        if (!open && deleteState.status !== "success") {
          setIsEditOpen(true);
        }
      }}
      open={isConfirmOpen}
      recordId={domain.id}
      title={domain.name}
    />
    </>
  );
}

export function CreateUserDialog({
  locale,
}: {
  locale: Locale;
}) {
  const copy = getCopy(locale);
  const [state, formAction, isPending] = useActionState(createUser, CRUD_ACTION_INITIAL_STATE);
  const { errors, formProps } = useFormValidation();
  const [role, setRole] = useState<"admin" | "editor" | "viewer">("editor");
  useCrudToast(copy, state);
  useCloseDialogOnSuccess(state.status);
  const usernameErrorId = useId();
  const emailErrorId = useId();
  const nameErrorId = useId();
  const profileErrorId = useId();
  const passwordErrorId = useId();

  return (
    <DialogShell
      closeLabel={copy.common.close}
      description={copy.dialogs.createUserDescription}
      title={copy.dialogs.createUserTitle}
      titleIcon={<Plus className="h-5 w-5 text-[var(--accent-deep)]" />}
      triggerIcon={<Plus className="h-4 w-4" />}
      triggerLabel={copy.users.createUser}
    >
      <form className="grid gap-4 md:grid-cols-2" {...formProps}>
        <FormField error={errors.name} errorId={nameErrorId} label={copy.dialogs.userName}>
          <input
            aria-describedby={errors.name ? nameErrorId : undefined}
            aria-invalid={Boolean(errors.name)}
            className={getFieldClass(errors.name)}
            name="name"
            placeholder={copy.dialogs.userName}
            required
            {...getFieldValidationProps(copy.dialogs.requiredFieldMessage)}
          />
        </FormField>
        <FormField error={errors.username} errorId={usernameErrorId} label={copy.dialogs.username}>
          <input
            aria-describedby={errors.username ? usernameErrorId : undefined}
            aria-invalid={Boolean(errors.username)}
            className={getFieldClass(errors.username)}
            name="username"
            placeholder={copy.dialogs.username}
            pattern={USERNAME_PATTERN.source}
            required
            {...getFieldValidationProps(copy.dialogs.requiredFieldMessage, copy.dialogs.invalidUsernameFieldMessage)}
          />
        </FormField>
        <FormField error={errors.email} errorId={emailErrorId} label={copy.dialogs.email}>
          <input
            aria-describedby={errors.email ? emailErrorId : undefined}
            aria-invalid={Boolean(errors.email)}
            className={getFieldClass(errors.email)}
            name="email"
            placeholder="user@example.com"
            required
            type="email"
            {...getFieldValidationProps(copy.dialogs.requiredFieldMessage)}
          />
        </FormField>
        <FormField label={copy.dialogs.role}>
          <select
            className={textFieldClass}
            defaultValue={role}
            name="role"
            onChange={(event) => setRole(event.target.value as "admin" | "editor" | "viewer")}
          >
            <option value="admin">{copy.nav.roles.admin}</option>
            <option value="editor">{copy.nav.roles.editor}</option>
            <option value="viewer">{copy.nav.roles.viewer}</option>
          </select>
        </FormField>
        <FormField error={errors.profileName} errorId={profileErrorId} label={copy.dialogs.profileName}>
          <input
            aria-describedby={errors.profileName ? profileErrorId : undefined}
            aria-invalid={Boolean(errors.profileName)}
            className={getFieldClass(errors.profileName)}
            name="profileName"
            placeholder={copy.dialogs.profileName}
            required={role !== "admin"}
            {...getFieldValidationProps(copy.dialogs.requiredFieldMessage)}
          />
        </FormField>
        <FormField className="md:col-span-2" error={errors.password} errorId={passwordErrorId} label={copy.dialogs.password}>
          <input
            aria-describedby={errors.password ? passwordErrorId : undefined}
            aria-invalid={Boolean(errors.password)}
            className={getFieldClass(errors.password)}
            minLength={8}
            name="password"
            placeholder={copy.dialogs.password}
            required
            type="password"
            {...getFieldValidationProps(copy.dialogs.requiredFieldMessage)}
          />
        </FormField>
        <label className="md:col-span-2 inline-flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm font-medium text-[var(--text)]">
          <input className="h-4 w-4 accent-[var(--accent)]" defaultChecked name="isActive" type="checkbox" />
          {copy.dialogs.activeAccount}
        </label>
        <div className="md:col-span-2">
          <button className={primaryButtonClass} disabled={isPending} formAction={formAction} type="submit">
            <Save className="h-4 w-4" />
            {isPending ? `${copy.dialogs.createUser}...` : copy.dialogs.createUser}
          </button>
        </div>
      </form>
    </DialogShell>
  );
}

export function EditUserDialog({
  locale,
  user,
}: {
  locale: Locale;
  user: {
    id: string;
    username: string;
    email: string;
    name: string;
    role: "admin" | "editor" | "viewer";
    profileName: string | null;
    isActive: boolean;
  };
}) {
  const copy = getCopy(locale);
  const [state, formAction, isPending] = useActionState(updateUser, CRUD_ACTION_INITIAL_STATE);
  const { errors, formProps } = useFormValidation();
  const [role, setRole] = useState<"admin" | "editor" | "viewer">(user.role);
  useCrudToast(copy, state);
  useCloseDialogOnSuccess(state.status);
  const usernameErrorId = useId();
  const nameErrorId = useId();
  const profileErrorId = useId();
  const passwordErrorId = useId();

  return (
    <DialogShell
      closeLabel={copy.common.close}
      description={copy.dialogs.editUserDescription}
      title={copy.dialogs.editUserTitle}
      titleIcon={<Pencil className="h-5 w-5 text-[var(--accent-deep)]" />}
      triggerClassName={tableActionClass}
      triggerIcon={<Pencil className="h-4 w-4" />}
      triggerLabel={copy.dialogs.edit}
    >
      <form className="grid gap-4 md:grid-cols-2" {...formProps}>
        <input name="id" type="hidden" value={user.id} />
        <FormField error={errors.name} errorId={nameErrorId} label={copy.dialogs.userName}>
          <input
            aria-describedby={errors.name ? nameErrorId : undefined}
            aria-invalid={Boolean(errors.name)}
            className={getFieldClass(errors.name)}
            defaultValue={user.name}
            name="name"
            placeholder={copy.dialogs.userName}
            required
            {...getFieldValidationProps(copy.dialogs.requiredFieldMessage)}
          />
        </FormField>
        <FormField error={errors.username} errorId={usernameErrorId} label={copy.dialogs.username}>
          <input
            aria-describedby={errors.username ? usernameErrorId : undefined}
            aria-invalid={Boolean(errors.username)}
            className={getFieldClass(errors.username)}
            defaultValue={user.username}
            name="username"
            pattern={USERNAME_PATTERN.source}
            placeholder={copy.dialogs.username}
            required
            {...getFieldValidationProps(copy.dialogs.requiredFieldMessage, copy.dialogs.invalidUsernameFieldMessage)}
          />
        </FormField>
        <FormField label={copy.dialogs.email}>
          <input className={textFieldClass} defaultValue={user.email} disabled readOnly />
        </FormField>
        <FormField label={copy.dialogs.role}>
          <select
            className={textFieldClass}
            defaultValue={role}
            name="role"
            onChange={(event) => setRole(event.target.value as "admin" | "editor" | "viewer")}
          >
            <option value="admin">{copy.nav.roles.admin}</option>
            <option value="editor">{copy.nav.roles.editor}</option>
            <option value="viewer">{copy.nav.roles.viewer}</option>
          </select>
        </FormField>
        <FormField error={errors.profileName} errorId={profileErrorId} label={copy.dialogs.profileName}>
          <input
            aria-describedby={errors.profileName ? profileErrorId : undefined}
            aria-invalid={Boolean(errors.profileName)}
            className={getFieldClass(errors.profileName)}
            defaultValue={user.profileName ?? ""}
            name="profileName"
            placeholder={copy.dialogs.profileName}
            required={role !== "admin"}
            {...getFieldValidationProps(copy.dialogs.requiredFieldMessage)}
          />
        </FormField>
        <FormField className="md:col-span-2" error={errors.password} errorId={passwordErrorId} label={copy.dialogs.resetPassword}>
          <input
            aria-describedby={errors.password ? passwordErrorId : undefined}
            aria-invalid={Boolean(errors.password)}
            className={getFieldClass(errors.password)}
            minLength={8}
            name="password"
            placeholder={copy.dialogs.resetPassword}
            type="password"
          />
        </FormField>
        <label className="md:col-span-2 inline-flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm font-medium text-[var(--text)]">
          <input className="h-4 w-4 accent-[var(--accent)]" defaultChecked={user.isActive} name="isActive" type="checkbox" />
          {copy.dialogs.activeAccount}
        </label>
        <div className="md:col-span-2">
          <button className={primaryButtonClass} disabled={isPending} formAction={formAction} type="submit">
            <Save className="h-4 w-4" />
            {isPending ? `${copy.dialogs.saveChanges}...` : copy.dialogs.saveChanges}
          </button>
        </div>
      </form>
    </DialogShell>
  );
}

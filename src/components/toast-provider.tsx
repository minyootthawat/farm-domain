"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

type ToastTone = "success" | "error";

type Toast = {
  id: number;
  title: string;
  tone: ToastTone;
};

type ToastInput = Omit<Toast, "id">;

const ToastContext = createContext<{
  pushToast: (toast: ToastInput) => void;
} | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const nextId = useRef(1);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: ToastInput) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { ...toast, id }]);
      window.setTimeout(() => removeToast(id), 4200);
    },
    [removeToast],
  );

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col gap-3 sm:left-auto sm:right-4 sm:w-[360px]">
        {toasts.map((toast) => {
          const isSuccess = toast.tone === "success";

          return (
            <div
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-[var(--shadow)] backdrop-blur ${
                isSuccess
                  ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)]"
                  : "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]"
              }`}
              key={toast.id}
              role="status"
            >
              <span className="mt-0.5">
                {isSuccess ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
              </span>
              <p className="flex-1 text-sm font-medium">{toast.title}</p>
              <button
                aria-label="Dismiss notification"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-current/15 bg-white/20 text-current transition hover:bg-white/30"
                onClick={() => removeToast(toast.id)}
                type="button"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}

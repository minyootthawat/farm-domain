"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction } from "./actions";
import { textFieldClass, primaryButtonClass } from "@/lib/ui-styles";

export default function SignInForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const errorParam = searchParams.get("error");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("callbackUrl", callbackUrl);

    await signInAction(formData);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="ui-panel rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-8 shadow-[var(--shadow-soft)]">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold text-[var(--text)]">Sign In</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Enter your credentials to access the dashboard
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {errorParam && (
              <div className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">
                {errorParam}
              </div>
            )}

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted)]" htmlFor="username">
                Username
              </label>
              <input
                className={textFieldClass}
                id="username"
                name="username"
                required
                type="text"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted)]" htmlFor="password">
                Password
              </label>
              <input
                className={textFieldClass}
                id="password"
                name="password"
                required
                type="password"
              />
            </div>

            <button
              className={primaryButtonClass}
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

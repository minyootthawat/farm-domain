"use server";

import { signIn } from "@/auth";
import { isAuthEnabled } from "@/lib/auth-config";
import { redirect } from "next/navigation";

export async function signInAction(formData: FormData) {
  if (!isAuthEnabled()) {
    redirect("/");
  }

  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const callbackUrl = formData.get("callbackUrl") as string || "/";

  try {
    await signIn("credentials", {
      username,
      password,
      redirect: true,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "type" in error &&
      error.type === "CredentialsSignin"
    ) {
      const errorCode =
        "code" in error && typeof error.code === "string" ? error.code : null;
      const message =
        errorCode === "inactive" ? "Inactive account" : "Invalid credentials";

      redirect(`/auth/signin?error=${encodeURIComponent(message)}&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }

    throw error;
  }
}

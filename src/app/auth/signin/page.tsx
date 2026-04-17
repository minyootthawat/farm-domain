import { redirect } from "next/navigation";
import { isAuthEnabled } from "@/lib/auth-config";
import SignInForm from "./signin-form";

export default async function SignInPage() {
  if (!isAuthEnabled()) {
    redirect("/");
  }

  return <SignInForm />;
}

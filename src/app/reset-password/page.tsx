import Link from "next/link";

import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata = { title: "Recover your account · urpostcard" };

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Let us find you again."
      intro="We will send a link that lets you set a new password."
      footer={
        <Link href="/sign-in" className="tap text-ink underline decoration-line underline-offset-4">
          Back to signing in
        </Link>
      }
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}

import Link from "next/link";

import { AuthShell } from "@/components/auth/AuthShell";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const metadata = { title: "Create an account · urpostcard" };

export default function SignUpPage() {
  return (
    <AuthShell
      title="Somewhere to receive things."
      intro="You will need a name, a way in, and a place on the map."
      footer={
        <span>
          Already have an account?{" "}
          <Link href="/sign-in" className="tap text-ink underline decoration-line underline-offset-4">
            Sign in
          </Link>
        </span>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}

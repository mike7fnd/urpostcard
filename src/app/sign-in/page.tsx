import Link from "next/link";

import { AuthShell } from "@/components/auth/AuthShell";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata = { title: "Sign in · urpostcard" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  const linkProblem =
    error === "link_expired"
      ? "That link has expired. Ask for a new one."
      : error === "link_invalid"
        ? "That link was not valid."
        : error === "oauth"
          ? "That did not go through. Try again."
          : null;

  return (
    <AuthShell
      title="Welcome back."
      intro="Your postcards have been waiting."
      footer={
        <span>
          No account yet?{" "}
          <Link href="/sign-up" className="tap text-ink underline decoration-line underline-offset-4">
            Create one
          </Link>
        </span>
      }
    >
      <SignInForm nextPath={next} linkProblem={linkProblem} />
    </AuthShell>
  );
}

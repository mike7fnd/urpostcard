import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export interface Session {
  userId: string;
  email: string | null;
  profile: Profile;
}

// Returns a plain boolean rather than a type predicate: the argument is
// already a Profile, so a predicate narrows the *false* branch to `never` and
// makes the incomplete profile unusable — which is exactly the branch that
// needs it.
export function profileIsComplete(profile: Profile | null): boolean {
  return Boolean(
    profile &&
      profile.username &&
      profile.latitude !== null &&
      profile.longitude !== null,
  );
}

/** Session plus profile, or a redirect to sign-in. */
export async function requireSession(nextPath?: string): Promise<Session> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const target = nextPath
      ? `/sign-in?next=${encodeURIComponent(nextPath)}`
      : "/sign-in";
    redirect(target);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    // The auth trigger creates this row; its absence means the migrations
    // have not been applied to this project.
    throw new Error(
      "No profile row for the signed-in user. Have the migrations in supabase/migrations been run?",
    );
  }

  return { userId: user.id, email: user.email ?? null, profile };
}

/**
 * Guard for everything past onboarding: a username and a pinned location are
 * both prerequisites for sending or receiving anything.
 */
export async function requireOnboardedSession(nextPath?: string): Promise<Session> {
  const session = await requireSession(nextPath);
  if (!profileIsComplete(session.profile)) {
    redirect("/onboarding");
  }
  return session;
}

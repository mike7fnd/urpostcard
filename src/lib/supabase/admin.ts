import "server-only";

import { createClient } from "@supabase/supabase-js";

import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "@/lib/env";
import type { Database } from "@/lib/types";

/**
 * Service-role client. Bypasses RLS, so it is used in exactly one place:
 * the scheduled delivery sweep. Never import this into anything that a
 * browser bundle can reach.
 */
export function createAdminClient() {
  return createClient<Database>(SUPABASE_URL(), SUPABASE_SERVICE_ROLE_KEY(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

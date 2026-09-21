"use client";

import { createBrowserClient } from "@supabase/ssr";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import type { Database } from "@/lib/types";

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** One browser client per tab; repeated calls reuse it. */
export function createClient() {
  cached ??= createBrowserClient<Database>(SUPABASE_URL(), SUPABASE_ANON_KEY());
  return cached;
}

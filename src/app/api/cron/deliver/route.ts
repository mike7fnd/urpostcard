import { NextResponse } from "next/server";

import { CRON_SECRET } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The scheduled delivery sweep.
 *
 * Postcards become 'arrived' here, in the database, whether or not anyone has a
 * browser open. Every read path also calls settle_due_postcards() defensively,
 * so a missed run delays the arrival *notification*, never the arrival itself.
 *
 * Schedule lives in vercel.json. Protect it with CRON_SECRET.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request) {
  const secret = CRON_SECRET();

  if (secret) {
    const authorization = request.headers.get("authorization");
    if (authorization !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "CRON_SECRET_NOT_SET" }, { status: 500 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("settle_due_postcards");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ delivered: data ?? 0, at: new Date().toISOString() });
}

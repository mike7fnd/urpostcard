import { NextResponse } from "next/server";

import { searchPlaces } from "@/lib/geocode";
import { allow } from "@/lib/ratelimit";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
  }

  if (!allow(`places:${user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const query = new URL(request.url).searchParams.get("q") ?? "";

  try {
    const places = await searchPlaces(query);
    return NextResponse.json({ places });
  } catch {
    return NextResponse.json({ error: "GEOCODER_UNAVAILABLE" }, { status: 502 });
  }
}

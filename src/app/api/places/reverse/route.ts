import { NextResponse } from "next/server";

import { reversePlace } from "@/lib/geocode";
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

  if (!allow(`reverse:${user.id}`, 40, 60_000)) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));

  if (
    !Number.isFinite(lat) || !Number.isFinite(lng) ||
    lat < -90 || lat > 90 || lng < -180 || lng > 180
  ) {
    return NextResponse.json({ error: "INVALID_COORDINATES" }, { status: 400 });
  }

  try {
    const place = await reversePlace(lat, lng);
    return NextResponse.json({ place });
  } catch {
    return NextResponse.json({ error: "GEOCODER_UNAVAILABLE" }, { status: 502 });
  }
}

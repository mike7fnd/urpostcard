import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/url";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(absoluteUrl(request, "/"), { status: 303 });
}

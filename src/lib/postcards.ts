import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { HomeSummary, PostcardTemplate, PostcardView } from "@/lib/types";

/**
 * Server-side reads.
 *
 * listPostcards, getPostcard and getSummary each go through a SECURITY DEFINER
 * function that settles overdue postcards before reading, so a page always
 * renders the state the database would have reached on its own — with or
 * without the scheduled sweep, with or without a browser having been open.
 */

export async function listPostcards(
  box?: "sent" | "received",
  limit = 50,
): Promise<PostcardView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_postcards", {
    p_box: box ?? null,
    p_limit: limit,
  });

  if (error) throw error;
  return (data ?? []) as PostcardView[];
}

export async function getPostcard(id: string): Promise<PostcardView | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_postcard", { p_id: id });

  if (error) {
    if (error.message.includes("POSTCARD_NOT_FOUND")) return null;
    throw error;
  }
  return (data ?? null) as PostcardView | null;
}

export async function getSummary(): Promise<HomeSummary> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sync_and_summarize");

  if (error) throw error;
  return {
    traveling: 0,
    delivered: 0,
    unopened: 0,
    ...((data ?? {}) as Partial<HomeSummary>),
  };
}

export async function getTemplates(): Promise<PostcardTemplate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("postcard_templates")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  if (error) throw error;
  return (data ?? []) as PostcardTemplate[];
}

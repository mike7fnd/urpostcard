"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { AppNotification } from "@/lib/types";

/**
 * The one place Realtime earns its keep: a postcard reaching someone is the
 * only event in this product that happens without them doing anything.
 *
 * The notice says that something arrived. It never says what it says.
 */
export function ArrivalWatcher({ userId }: { userId: string }) {
  const router = useRouter();
  const [notice, setNotice] = useState<AppNotification | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`arrivals:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotice(payload.new as AppNotification);
          // The animation is not the state: pull the real thing from the server.
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, router]);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 9000);
    return () => window.clearTimeout(id);
  }, [notice]);

  return (
    <AnimatePresence>
      {notice ? (
        <motion.div
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="safe-top fixed inset-x-0 top-0 z-50 px-4 pt-3"
        >
          <div className="mx-auto max-w-[420px]">
            <Link
              href={notice.postcard_id ? `/postcards/${notice.postcard_id}` : "/postcards"}
              onClick={() => setNotice(null)}
              className="flex items-center gap-3 rounded-2xl border border-line/80 bg-paper/95 px-4 py-3 shadow-lift backdrop-blur-md"
            >
              <span
                className="h-8 w-11 shrink-0 rounded-[3px] border border-line bg-paper-deep"
                aria-hidden
              />
              <span className="min-w-0">
                <span className="block truncate text-[14px] text-ink">
                  {notice.title}
                </span>
                <span className="block truncate text-[12.5px] text-ink-faint">
                  {notice.body}
                </span>
              </span>
            </Link>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

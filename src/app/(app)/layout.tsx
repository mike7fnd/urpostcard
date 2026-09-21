import { MapStyleProvider } from "@/components/map/MapStyleProvider";
import { Nav } from "@/components/nav/Nav";
import { ArrivalWatcher } from "@/components/notifications/ArrivalWatcher";
import { requireOnboardedSession } from "@/lib/account";
import { getSummary } from "@/lib/postcards";

/**
 * Everything behind the door. The guard runs here, so no page inside has to
 * think about whether there is a session or a pinned location.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireOnboardedSession();

  // Settles anything overdue and tells us what is waiting, in one round trip.
  const summary = await getSummary();

  return (
    <MapStyleProvider value={session.profile.map_style}>
      <ArrivalWatcher userId={session.userId} />
      {children}
      <Nav unopened={summary.unopened} />
    </MapStyleProvider>
  );
}

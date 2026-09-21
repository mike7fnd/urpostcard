import { ProfileView } from "@/components/profile/ProfileView";
import { requireOnboardedSession } from "@/lib/account";

export const metadata = { title: "You · urpostcard" };

export default async function ProfilePage() {
  const { profile } = await requireOnboardedSession("/profile");
  return <ProfileView profile={profile} />;
}

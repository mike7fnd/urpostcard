import { redirect } from "next/navigation";

import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { profileIsComplete, requireSession } from "@/lib/account";

export const metadata = { title: "Welcome · urpostcard" };

export default async function OnboardingPage() {
  const { profile } = await requireSession("/onboarding");

  if (profileIsComplete(profile)) redirect("/home");

  return <OnboardingFlow profile={profile} />;
}

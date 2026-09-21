import { SendFlow } from "@/components/send/SendFlow";
import { requireOnboardedSession } from "@/lib/account";
import { getTemplates } from "@/lib/postcards";

export const metadata = { title: "Send a postcard · urpostcard" };

export default async function SendPage() {
  const [{ profile }, templates] = await Promise.all([
    requireOnboardedSession("/send"),
    getTemplates(),
  ]);

  return (
    <main>
      <SendFlow profile={profile} templates={templates} />
    </main>
  );
}

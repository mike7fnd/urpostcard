import { notFound } from "next/navigation";

import { ArrivalExperience } from "@/components/postcards/ArrivalExperience";
import { PostcardDetail } from "@/components/postcards/PostcardDetail";
import { getPostcard } from "@/lib/postcards";

export const metadata = { title: "A postcard · urpostcard" };

export default async function PostcardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const card = await getPostcard(id);

  if (!card) notFound();

  // Arrived, addressed to this reader, never opened: this is the moment the
  // whole product exists for.
  const unopened = card.direction === "received" && card.status === "arrived";

  return unopened ? <ArrivalExperience card={card} /> : <PostcardDetail card={card} />;
}

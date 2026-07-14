import { notFound } from "next/navigation";
import { getPublicEventBySlug } from "@/lib/data/events";
import GuestFlow from "@/components/GuestFlow";

export const dynamic = "force-dynamic";

export default async function GuestPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);

  if (!event) notFound();

  return <GuestFlow initialEvent={event} />;
}

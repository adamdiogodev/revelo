import { notFound, redirect } from "next/navigation";
import { getEventForHost, getPublicEventBySlug } from "@/lib/data/events";
import { createClient } from "@/lib/supabase/server";
import HostDashboard from "@/components/HostDashboard";

export const dynamic = "force-dynamic";

export default async function HostPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { slug } = await params;
  const { created } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const event = await getEventForHost(slug, user.id);
  if (!event) notFound();

  const publicInfo = await getPublicEventBySlug(slug);
  if (!publicInfo) notFound();

  return (
    <HostDashboard
      event={publicInfo}
      codigoAcesso={event.codigo_acesso}
      justCreated={created === "1"}
    />
  );
}

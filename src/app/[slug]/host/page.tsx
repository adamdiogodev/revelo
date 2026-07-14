import { notFound, redirect } from "next/navigation";
import { getEventForHost, getPublicEventBySlug } from "@/lib/data/events";
import { getLatestPaymentForEvent } from "@/lib/data/payments";
import { createClient } from "@/lib/supabase/server";
import HostDashboard from "@/components/HostDashboard";

export const dynamic = "force-dynamic";

export default async function HostPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ created?: string; pago?: string }>;
}) {
  const { slug } = await params;
  const { created, pago } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const event = await getEventForHost(slug, user.id);
  if (!event) notFound();

  const publicInfo = await getPublicEventBySlug(slug);
  if (!publicInfo) notFound();

  const payment = await getLatestPaymentForEvent(event.id);

  return (
    <HostDashboard
      event={publicInfo}
      codigoAcesso={event.codigo_acesso}
      justCreated={created === "1"}
      pendingPayment={
        payment && payment.status === "pendente"
          ? { maxConvidados: payment.max_convidados, valorCentavos: payment.valor_centavos }
          : null
      }
      pagoStatus={pago}
    />
  );
}

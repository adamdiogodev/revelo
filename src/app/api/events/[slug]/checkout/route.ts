import { NextRequest, NextResponse } from "next/server";
import { getEventForHost } from "@/lib/data/events";
import { getLatestPaymentForEvent, updatePaymentStripeSession } from "@/lib/data/payments";
import { createTierCheckoutSession } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Faça login como anfitrião." }, { status: 401 });
  }

  const event = await getEventForHost(slug, user.id);
  if (!event) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const payment = await getLatestPaymentForEvent(event.id);
  if (!payment || payment.status !== "pendente") {
    return NextResponse.json({ error: "Não há pagamento pendente para este evento." }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
  const session = await createTierCheckoutSession({
    siteUrl,
    slug,
    eventId: event.id,
    eventNome: event.nome,
    maxConvidados: payment.max_convidados,
    precoCentavos: payment.valor_centavos,
  });

  await updatePaymentStripeSession(payment.id, session.id);

  return NextResponse.json({ checkoutUrl: session.url });
}

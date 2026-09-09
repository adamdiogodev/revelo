import { NextRequest, NextResponse } from "next/server";
import { getEventForHost } from "@/lib/data/events";
import { getLatestPaymentForEvent, setPaymentProviderRef } from "@/lib/data/payments";
import { createCheckout } from "@/lib/payment-provider";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in as the host." }, { status: 401 });
  }

  const event = await getEventForHost(slug, user.id);
  if (!event) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const payment = await getLatestPaymentForEvent(event.id);
  if (!payment || payment.status !== "pendente") {
    return NextResponse.json({ error: "There is no pending payment for this party." }, { status: 400 });
  }

  // Resume with the SAME provider the payment started on, not whichever one is
  // active now — that avoids mixing gateways in the middle of a charge.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
  const checkout = await createCheckout({
    provider: payment.provider,
    siteUrl,
    slug,
    paymentId: payment.id,
    eventNome: event.nome,
    maxConvidados: payment.max_convidados,
    precoCentavos: payment.valor_centavos,
  });

  await setPaymentProviderRef(payment.id, payment.provider, checkout.providerRef);

  return NextResponse.json({ checkoutUrl: checkout.checkoutUrl });
}

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getPaymentByStripeSessionId, markPaymentPaid } from "@/lib/data/payments";
import { setEventMaxConvidados } from "@/lib/data/events";

export const runtime = "nodejs";

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const payment = await getPaymentByStripeSessionId(session.id);
  if (!payment || payment.status !== "pendente") return;

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null;

  await markPaymentPaid(payment.id, paymentIntentId);
  await setEventMaxConvidados(payment.event_id, payment.max_convidados);
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET não configurado.");
    return NextResponse.json({ error: "Webhook não configurado." }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Assinatura ausente." }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Assinatura do webhook inválida:", err);
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    }
  } catch (err) {
    console.error("Erro processando webhook do Stripe:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

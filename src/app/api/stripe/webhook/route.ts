import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getPaymentById, markPaymentPaid } from "@/lib/data/payments";
import { setEventMaxConvidados } from "@/lib/data/events";

export const runtime = "nodejs";

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const paymentId = session.metadata?.paymentId;
  if (!paymentId) return;

  const payment = await getPaymentById(paymentId);
  if (!payment || payment.status !== "pendente") return;

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null;

  await markPaymentPaid(payment.id, paymentIntentId);
  await setEventMaxConvidados(payment.event_id, payment.max_convidados);
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured.");
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 500 });
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
    console.error("Invalid Stripe webhook signature:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // Always answer 200 to Stripe, even if we do not recognize the payment (their
  // dashboard webhook tests, for example) — we just log the error.
  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    }
  } catch (err) {
    console.error("Error processing Stripe webhook:", err);
  }

  return NextResponse.json({ received: true });
}

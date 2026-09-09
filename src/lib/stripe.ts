import "server-only";
import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY (.env.local).");
}

export const stripe = new Stripe(secretKey);

export async function createTierCheckoutSession(params: {
  siteUrl: string;
  slug: string;
  paymentId: string;
  eventNome: string;
  maxConvidados: number;
  precoCentavos: number;
}) {
  return stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Revelo — ${params.maxConvidados >= 100000 ? "unlimited guests" : `up to ${params.maxConvidados} guests`}`,
            description: params.eventNome,
          },
          unit_amount: params.precoCentavos,
        },
        quantity: 1,
      },
    ],
    // Same pattern as Mercado Pago (external_reference): we store the id of our
    // own payment record, not the event id, so the webhook can find the right
    // record without depending on the session id.
    metadata: {
      paymentId: params.paymentId,
    },
    success_url: `${params.siteUrl}/${params.slug}/host?created=1&paid=success`,
    cancel_url: `${params.siteUrl}/${params.slug}/host?created=1&paid=cancelled`,
  });
}

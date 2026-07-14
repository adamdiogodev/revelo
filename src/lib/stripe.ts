import "server-only";
import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  throw new Error("Falta STRIPE_SECRET_KEY (.env.local).");
}

export const stripe = new Stripe(secretKey);

export async function createTierCheckoutSession(params: {
  siteUrl: string;
  slug: string;
  eventId: string;
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
          currency: "brl",
          product_data: {
            name: `Revelo — até ${params.maxConvidados >= 100000 ? "convidados ilimitados" : `${params.maxConvidados} convidados`}`,
            description: params.eventNome,
          },
          unit_amount: params.precoCentavos,
        },
        quantity: 1,
      },
    ],
    metadata: {
      eventId: params.eventId,
      maxConvidados: String(params.maxConvidados),
    },
    success_url: `${params.siteUrl}/${params.slug}/host?created=1&pago=sucesso`,
    cancel_url: `${params.siteUrl}/${params.slug}/host?created=1&pago=cancelado`,
  });
}

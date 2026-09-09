import "server-only";
import type { PaymentProvider } from "@/lib/data/payments";
import { createTierCheckoutSession } from "@/lib/stripe";
import { createTierPreference } from "@/lib/mercadopago";

/**
 * Active payment gateway for NEW payments. Switch it with an environment
 * variable — no other code needs to change:
 *
 *   PAYMENT_PROVIDER=stripe        (default)
 *   PAYMENT_PROVIDER=mercadopago
 *
 * Payments that already exist keep using the provider they were born on
 * (stored in payments.provider), so flipping this variable does not affect
 * old pending charges — only new ones.
 */
export function getActiveProvider(): PaymentProvider {
  return process.env.PAYMENT_PROVIDER === "mercadopago" ? "mercadopago" : "stripe";
}

export type CheckoutParams = {
  provider: PaymentProvider;
  siteUrl: string;
  slug: string;
  paymentId: string;
  eventNome: string;
  maxConvidados: number;
  precoCentavos: number;
};

export type CheckoutResult = {
  checkoutUrl: string;
  providerRef: string;
};

export async function createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
  if (params.provider === "stripe") {
    const session = await createTierCheckoutSession(params);
    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return { checkoutUrl: session.url, providerRef: session.id };
  }

  const preference = await createTierPreference(params);
  if (!preference.init_point || !preference.id) {
    throw new Error("Mercado Pago did not return a valid preference.");
  }
  return { checkoutUrl: preference.init_point, providerRef: preference.id };
}

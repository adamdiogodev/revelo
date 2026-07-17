import "server-only";
import type { PaymentProvider } from "@/lib/data/payments";
import { createTierCheckoutSession } from "@/lib/stripe";
import { createTierPreference } from "@/lib/mercadopago";

/**
 * Gateway de pagamento ativo para NOVOS pagamentos. Troque com uma variável
 * de ambiente — nenhum outro código precisa mudar:
 *
 *   PAYMENT_PROVIDER=stripe        (padrão)
 *   PAYMENT_PROVIDER=mercadopago
 *
 * Pagamentos já criados continuam usando o provedor com que nasceram
 * (guardado em payments.provider), então trocar essa variável não afeta
 * cobranças pendentes antigas — só as novas.
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
    if (!session.url) throw new Error("Stripe não retornou uma URL de checkout.");
    return { checkoutUrl: session.url, providerRef: session.id };
  }

  const preference = await createTierPreference(params);
  if (!preference.init_point || !preference.id) {
    throw new Error("Mercado Pago não retornou uma preferência válida.");
  }
  return { checkoutUrl: preference.init_point, providerRef: preference.id };
}

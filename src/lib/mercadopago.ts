import "server-only";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

const accessToken = process.env.MP_ACCESS_TOKEN;
if (!accessToken) {
  throw new Error("Missing MP_ACCESS_TOKEN (.env.local).");
}

const mpConfig = new MercadoPagoConfig({ accessToken });

export async function createTierPreference(params: {
  siteUrl: string;
  slug: string;
  paymentId: string;
  eventNome: string;
  maxConvidados: number;
  precoCentavos: number;
}) {
  const preference = new Preference(mpConfig);

  const result = await preference.create({
    body: {
      items: [
        {
          id: params.paymentId,
          title: `Revelo — ${
            params.maxConvidados >= 100000 ? "unlimited guests" : `up to ${params.maxConvidados} guests`
          }`,
          description: params.eventNome,
          quantity: 1,
          currency_id: "USD",
          unit_price: params.precoCentavos / 100,
        },
      ],
      external_reference: params.paymentId,
      notification_url: `${params.siteUrl}/api/mercadopago/webhook`,
      back_urls: {
        success: `${params.siteUrl}/${params.slug}/host?created=1&paid=success`,
        pending: `${params.siteUrl}/${params.slug}/host?created=1&paid=pending`,
        failure: `${params.siteUrl}/${params.slug}/host?created=1&paid=cancelled`,
      },
      // Mercado Pago only accepts auto_return with HTTPS back_urls — on local
      // dev (http://localhost) that would break preference creation.
      ...(params.siteUrl.startsWith("https://") ? { auto_return: "approved" as const } : {}),
    },
  });

  return result;
}

export async function getPayment(paymentId: string) {
  const payment = new Payment(mpConfig);
  return payment.get({ id: paymentId });
}

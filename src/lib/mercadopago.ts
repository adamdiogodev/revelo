import "server-only";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

const accessToken = process.env.MP_ACCESS_TOKEN;
if (!accessToken) {
  throw new Error("Falta MP_ACCESS_TOKEN (.env.local).");
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
          title: `Revelo — até ${
            params.maxConvidados >= 100000 ? "convidados ilimitados" : `${params.maxConvidados} convidados`
          }`,
          description: params.eventNome,
          quantity: 1,
          currency_id: "BRL",
          unit_price: params.precoCentavos / 100,
        },
      ],
      external_reference: params.paymentId,
      notification_url: `${params.siteUrl}/api/mercadopago/webhook`,
      back_urls: {
        success: `${params.siteUrl}/${params.slug}/host?created=1&pago=sucesso`,
        pending: `${params.siteUrl}/${params.slug}/host?created=1&pago=pendente`,
        failure: `${params.siteUrl}/${params.slug}/host?created=1&pago=cancelado`,
      },
      // O Mercado Pago só aceita auto_return com back_urls em HTTPS —
      // em dev local (http://localhost) isso quebraria a criação da preferência.
      ...(params.siteUrl.startsWith("https://") ? { auto_return: "approved" as const } : {}),
    },
  });

  return result;
}

export async function getPayment(paymentId: string) {
  const payment = new Payment(mpConfig);
  return payment.get({ id: paymentId });
}

import { NextRequest, NextResponse } from "next/server";
import { WebhookSignatureValidator, InvalidWebhookSignatureError } from "mercadopago";
import { getPayment } from "@/lib/mercadopago";
import { getPaymentById, markPaymentPaid } from "@/lib/data/payments";
import { setEventMaxConvidados } from "@/lib/data/events";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  const dataId = req.nextUrl.searchParams.get("data.id") || req.nextUrl.searchParams.get("id");
  const type = req.nextUrl.searchParams.get("type");

  if (secret) {
    try {
      WebhookSignatureValidator.validate({
        xSignature: req.headers.get("x-signature"),
        xRequestId: req.headers.get("x-request-id"),
        dataId,
        secret,
      });
    } catch (err) {
      if (err instanceof InvalidWebhookSignatureError) {
        console.error("Assinatura do webhook Mercado Pago inválida:", err.reason);
        return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
      }
      throw err;
    }
  } else {
    console.warn("MP_WEBHOOK_SECRET não configurado — pulando validação de assinatura.");
  }

  // Sempre confirma lendo o pagamento na API do Mercado Pago (nunca confia
  // só no corpo da notificação) antes de liberar qualquer coisa.
  if (type === "payment" && dataId) {
    try {
      const mpPayment = await getPayment(dataId);
      const ourPaymentId = mpPayment.external_reference;

      if (ourPaymentId && mpPayment.status === "approved") {
        const payment = await getPaymentById(ourPaymentId);
        if (payment && payment.status === "pendente") {
          await markPaymentPaid(payment.id, String(mpPayment.id));
          await setEventMaxConvidados(payment.event_id, payment.max_convidados);
        }
      }
    } catch (err) {
      console.error("Erro processando webhook do Mercado Pago:", err);
      return NextResponse.json({ error: "Erro interno." }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}

export async function GET(req: NextRequest) {
  return POST(req);
}

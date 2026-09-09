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
        console.error("Invalid Mercado Pago webhook signature:", err.reason);
        return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
      }
      throw err;
    }
  } else {
    console.warn("MP_WEBHOOK_SECRET is not configured — skipping signature validation.");
  }

  // Always confirm by reading the payment from the Mercado Pago API (never trust
  // the notification body alone) before unlocking anything.
  //
  // Important: we always answer 200 to Mercado Pago here, even when the payment
  // is not recognized (their dashboard webhook test sends a fake data.id, for
  // example) — an HTTP error would make Mercado Pago think the endpoint is broken
  // and stop redelivering real notifications. Real problems stay in the logs.
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
      console.error("Erro processando webhook do Mercado Pago (data.id:", dataId, "):", err);
    }
  }

  return NextResponse.json({ received: true });
}

export async function GET(req: NextRequest) {
  return POST(req);
}

import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type PaymentProvider = "stripe" | "mercadopago";

export type PaymentRow = {
  id: string;
  event_id: string;
  max_convidados: number;
  valor_centavos: number;
  status: "pendente" | "pago" | "cortesia" | "cancelado";
  provider: PaymentProvider;
  mp_preference_id: string | null;
  mp_payment_id: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
  paid_at: string | null;
};

export async function createPendingPayment(params: {
  eventId: string;
  maxConvidados: number;
  valorCentavos: number;
  provider: PaymentProvider;
}): Promise<PaymentRow> {
  const { data, error } = await supabaseAdmin
    .from("payments")
    .insert({
      event_id: params.eventId,
      max_convidados: params.maxConvidados,
      valor_centavos: params.valorCentavos,
      status: "pendente",
      provider: params.provider,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message || "Falha ao registrar pagamento.");
  return data as PaymentRow;
}

/** Guarda a referência do gateway (session id do Stripe ou preference id do Mercado Pago). */
export async function setPaymentProviderRef(
  paymentId: string,
  provider: PaymentProvider,
  ref: string
) {
  const column = provider === "stripe" ? "stripe_session_id" : "mp_preference_id";
  const { error } = await supabaseAdmin
    .from("payments")
    .update({ [column]: ref })
    .eq("id", paymentId);

  if (error) throw new Error(error.message);
}

export async function getLatestPaymentForEvent(eventId: string): Promise<PaymentRow | null> {
  const { data, error } = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as PaymentRow | null;
}

export async function getPaymentById(paymentId: string): Promise<PaymentRow | null> {
  const { data, error } = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as PaymentRow | null;
}

export async function markPaymentPaid(paymentId: string, providerPaymentRef: string | null) {
  const payment = await getPaymentById(paymentId);
  if (!payment) return;

  const column = payment.provider === "stripe" ? "stripe_payment_intent_id" : "mp_payment_id";
  const { error } = await supabaseAdmin
    .from("payments")
    .update({ status: "pago", paid_at: new Date().toISOString(), [column]: providerPaymentRef })
    .eq("id", paymentId)
    .eq("status", "pendente");

  if (error) throw new Error(error.message);
}

export async function markPaymentCortesia(paymentId: string) {
  const { error } = await supabaseAdmin
    .from("payments")
    .update({ status: "cortesia", paid_at: new Date().toISOString() })
    .eq("id", paymentId);

  if (error) throw new Error(error.message);
}

import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type PaymentRow = {
  id: string;
  event_id: string;
  max_convidados: number;
  valor_centavos: number;
  status: "pendente" | "pago" | "cortesia" | "cancelado";
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
  paid_at: string | null;
};

export async function createPendingPayment(params: {
  eventId: string;
  maxConvidados: number;
  valorCentavos: number;
  stripeSessionId: string;
}): Promise<PaymentRow> {
  const { data, error } = await supabaseAdmin
    .from("payments")
    .insert({
      event_id: params.eventId,
      max_convidados: params.maxConvidados,
      valor_centavos: params.valorCentavos,
      status: "pendente",
      stripe_session_id: params.stripeSessionId,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message || "Falha ao registrar pagamento.");
  return data as PaymentRow;
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

export async function getPaymentByStripeSessionId(sessionId: string): Promise<PaymentRow | null> {
  const { data, error } = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as PaymentRow | null;
}

export async function markPaymentPaid(paymentId: string, paymentIntentId: string | null) {
  const { error } = await supabaseAdmin
    .from("payments")
    .update({ status: "pago", paid_at: new Date().toISOString(), stripe_payment_intent_id: paymentIntentId })
    .eq("id", paymentId)
    .eq("status", "pendente");

  if (error) throw new Error(error.message);
}

export async function updatePaymentStripeSession(paymentId: string, stripeSessionId: string) {
  const { error } = await supabaseAdmin
    .from("payments")
    .update({ stripe_session_id: stripeSessionId })
    .eq("id", paymentId);

  if (error) throw new Error(error.message);
}

export async function markPaymentCortesia(paymentId: string) {
  const { error } = await supabaseAdmin
    .from("payments")
    .update({ status: "cortesia", paid_at: new Date().toISOString() })
    .eq("id", paymentId);

  if (error) throw new Error(error.message);
}

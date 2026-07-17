import { NextRequest, NextResponse } from "next/server";
import { createEvent } from "@/lib/data/events";
import { createClient } from "@/lib/supabase/server";
import { CHALLENGE_PRESETS } from "@/lib/challenge-presets";
import { FREE_TIER, getTierByMaxConvidados } from "@/lib/pricing";
import { createCheckout, getActiveProvider } from "@/lib/payment-provider";
import { createPendingPayment, setPaymentProviderRef } from "@/lib/data/payments";

const VALID_POSES = [12, 18, 24];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Faça login para criar um evento." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const {
    nome,
    revealAt,
    posesPorConvidado,
    maxConvidados,
    modoDesafios,
    challenges,
    capaUrl,
  } = body as {
    nome?: string;
    revealAt?: string;
    posesPorConvidado?: number;
    maxConvidados?: number;
    modoDesafios?: boolean;
    challenges?: { titulo: string; emoji?: string }[];
    capaUrl?: string;
  };

  if (!nome || typeof nome !== "string" || !nome.trim()) {
    return NextResponse.json({ error: "Nome do evento é obrigatório." }, { status: 400 });
  }

  if (!revealAt || Number.isNaN(Date.parse(revealAt))) {
    return NextResponse.json({ error: "Data/hora de revelação inválida." }, { status: 400 });
  }

  const revealDate = new Date(revealAt);
  if (revealDate.getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "A revelação precisa ser em um horário no futuro." },
      { status: 400 }
    );
  }

  if (!posesPorConvidado || !VALID_POSES.includes(posesPorConvidado)) {
    return NextResponse.json({ error: "Poses por convidado inválido." }, { status: 400 });
  }

  const tier = getTierByMaxConvidados(maxConvidados ?? -1);
  if (!tier) {
    return NextResponse.json({ error: "Plano de convidados inválido." }, { status: 400 });
  }

  let finalCapaUrl: string | null = null;
  if (capaUrl && typeof capaUrl === "string") {
    const isPreset = capaUrl.startsWith("/covers/");
    const isUploaded = capaUrl.startsWith(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/covers/`
    );
    if (isPreset || isUploaded) finalCapaUrl = capaUrl;
  }

  let finalChallenges: { titulo: string; emoji: string }[] = [];
  if (modoDesafios) {
    const custom = (challenges || [])
      .map((c) => ({ titulo: (c.titulo || "").trim(), emoji: c.emoji || "📸" }))
      .filter((c) => c.titulo.length > 0);

    finalChallenges = custom.length > 0 ? custom : CHALLENGE_PRESETS;
  }

  try {
    // O evento sempre nasce no plano grátis — o limite de convidados só sobe
    // depois que o pagamento é confirmado pelo webhook do gateway. Nunca
    // confiamos no plano escolhido pelo cliente para liberar acesso na hora.
    const { slug, codigoAcesso, eventId } = await createEvent({
      hostUserId: user.id,
      nome: nome.trim().slice(0, 80),
      revealAt: revealDate,
      posesPorConvidado,
      maxConvidados: FREE_TIER.maxConvidados,
      modoDesafios: Boolean(modoDesafios),
      challenges: finalChallenges,
      capaUrl: finalCapaUrl,
    });

    if (tier.precoCentavos === 0) {
      return NextResponse.json({ slug, codigoAcesso });
    }

    const provider = getActiveProvider();
    const payment = await createPendingPayment({
      eventId,
      maxConvidados: tier.maxConvidados,
      valorCentavos: tier.precoCentavos,
      provider,
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
    const checkout = await createCheckout({
      provider,
      siteUrl,
      slug,
      paymentId: payment.id,
      eventNome: nome.trim(),
      maxConvidados: tier.maxConvidados,
      precoCentavos: tier.precoCentavos,
    });

    await setPaymentProviderRef(payment.id, provider, checkout.providerRef);

    return NextResponse.json({ slug, codigoAcesso, checkoutUrl: checkout.checkoutUrl });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Falha ao criar o evento. Tente novamente." }, { status: 500 });
  }
}

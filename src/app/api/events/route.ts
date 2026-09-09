import { NextRequest, NextResponse } from "next/server";
import { createEvent } from "@/lib/data/events";
import { createClient } from "@/lib/supabase/server";
import { CHALLENGE_PRESETS } from "@/lib/challenge-presets";
import { FREE_TIER, getTierByGuestLimit } from "@/lib/pricing";
import { createCheckout, getActiveProvider } from "@/lib/payment-provider";
import { createPendingPayment, setPaymentProviderRef } from "@/lib/data/payments";

const VALID_POSES = [12, 18, 24];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to create a party." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
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
    return NextResponse.json({ error: "The party needs a name." }, { status: 400 });
  }

  if (!revealAt || Number.isNaN(Date.parse(revealAt))) {
    return NextResponse.json({ error: "That reveal date and time is not valid." }, { status: 400 });
  }

  const revealDate = new Date(revealAt);
  if (revealDate.getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "The reveal has to be at a time in the future." },
      { status: 400 }
    );
  }

  if (!posesPorConvidado || !VALID_POSES.includes(posesPorConvidado)) {
    return NextResponse.json({ error: "That number of shots per guest is not valid." }, { status: 400 });
  }

  const tier = getTierByGuestLimit(maxConvidados ?? -1);
  if (!tier) {
    return NextResponse.json({ error: "That guest plan is not valid." }, { status: 400 });
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
    // A party is always born on the free plan — the guest limit only goes up
    // once the payment is confirmed by the gateway webhook. We never trust the
    // plan picked on the client to unlock access right away.
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
    return NextResponse.json({ error: "We could not create the party. Please try again." }, { status: 500 });
  }
}

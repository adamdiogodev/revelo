import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-8 bg-bg px-6 text-center text-ink">
      <Image src="/logo.png" alt="Revelo" width={220} height={111} priority className="h-auto w-52" />
      <div>
        <h1 className="font-display text-4xl italic leading-tight text-ink">
          A câmera descartável da sua festa
        </h1>
        <p className="mx-auto mt-4 max-w-xs text-sm text-muted">
          Convidados entram por QR code, tiram fotos sem ver o resultado, e tudo é revelado junto,
          na hora marcada.
        </p>
      </div>
      <Link
        href="/entrar"
        className="w-full max-w-xs rounded-full bg-ink py-3.5 text-base font-semibold text-bg"
      >
        Começar
      </Link>
    </div>
  );
}

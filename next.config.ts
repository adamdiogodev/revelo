import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ffmpeg-static resolve seu binário via __dirname em tempo de carregamento —
  // se o bundler processar o pacote, esse caminho vira algo tipo "/ROOT/..."
  // que não existe de verdade. Mantém o pacote fora do bundle (require normal).
  serverExternalPackages: ["ffmpeg-static", "fluent-ffmpeg"],
};

export default nextConfig;

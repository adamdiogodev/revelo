import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const input = path.join(publicDir, "logo-original.png");
const output = path.join(publicDir, "logo.png");

// --color-ink do design system (branco quente)
const INK = [0xf3, 0xef, 0xe6];

const img = sharp(input).ensureAlpha();
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

// O arquivo original já tem fundo transparente de verdade (alpha correto).
// Só precisamos recolorir o texto preto (que sumiria num fundo escuro) para
// o tom "ink" do app — o dourado do obturador fica exatamente como está.
for (let i = 0; i < data.length; i += channels) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const maxC = Math.max(r, g, b);
  const chroma = maxC - Math.min(r, g, b);

  if (chroma < 20) {
    data[i] = INK[0];
    data[i + 1] = INK[1];
    data[i + 2] = INK[2];
  }
}

await sharp(data, { raw: { width, height, channels } }).png().toFile(output);
console.log("done ->", output);

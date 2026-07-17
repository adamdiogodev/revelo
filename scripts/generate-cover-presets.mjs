import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "covers");

const W = 1080;
const H = 1920;

const presets = [
  { id: "preset-dourado", from: "#3a2f1c", via: "#0d0b09", to: "#0b0b0a" },
  { id: "preset-vinho", from: "#3a1420", via: "#160a0d", to: "#0b0b0a" },
  { id: "preset-verde", from: "#12241d", via: "#0c1512", to: "#0b0b0a" },
  { id: "preset-azul", from: "#101a2e", via: "#0a0f18", to: "#0b0b0a" },
];

function svgFor({ from, via, to }) {
  return `
  <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="60%" y2="100%">
        <stop offset="0%" stop-color="${from}"/>
        <stop offset="55%" stop-color="${via}"/>
        <stop offset="100%" stop-color="${to}"/>
      </linearGradient>
      <radialGradient id="r" cx="50%" cy="30%" r="75%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.06"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <rect width="${W}" height="${H}" fill="url(#r)"/>
  </svg>`;
}

for (const preset of presets) {
  const svg = Buffer.from(svgFor(preset));
  const base = sharp(svg).png();
  const { data, info } = await base.raw().toBuffer({ resolveWithObject: true });

  // grão sutil, mesmo estilo do filtro da câmera
  for (let i = 0; i < data.length; i += info.channels) {
    if (Math.random() < 0.5) {
      const n = Math.floor((Math.random() - 0.5) * 14);
      data[i] = Math.max(0, Math.min(255, data[i] + n));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
    }
  }

  await sharp(data, { raw: info })
    .jpeg({ quality: 85 })
    .toFile(path.join(outDir, `${preset.id}.jpg`));

  console.log("gerado:", preset.id);
}

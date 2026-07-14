import { FilterPreset } from "@/lib/filter-presets";

const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.8;

function applyGrain(ctx: CanvasRenderingContext2D, w: number, h: number, opacity: number) {
  if (opacity <= 0) return;

  const tileSize = 128;
  const tile = document.createElement("canvas");
  tile.width = tileSize;
  tile.height = tileSize;
  const tctx = tile.getContext("2d");
  if (!tctx) return;

  const imgData = tctx.createImageData(tileSize, tileSize);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    imgData.data[i] = v;
    imgData.data[i + 1] = v;
    imgData.data[i + 2] = v;
    imgData.data[i + 3] = 255;
  }
  tctx.putImageData(imgData, 0, 0);

  const pattern = ctx.createPattern(tile, "repeat");
  if (!pattern) return;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number, strength: number) {
  if (strength <= 0) return;

  const grad = ctx.createRadialGradient(
    w / 2,
    h / 2,
    Math.max(w, h) * 0.35,
    w / 2,
    h / 2,
    Math.max(w, h) * 0.72
  );
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, `rgba(0,0,0,${Math.min(0.6, 0.45 * strength)})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawTimestamp(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const text = `${dd}/${mm}/${yyyy}  ${hh}:${min}`;

  const fontSize = Math.max(16, Math.round(w * 0.03));
  ctx.font = `${fontSize}px 'Courier New', monospace`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  const pad = fontSize * 0.8;

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillText(text, w - pad + 1, h - pad + 1);
  ctx.fillStyle = "#ff8a00";
  ctx.fillText(text, w - pad, h - pad);
}

/**
 * Captura o frame atual do vídeo aplicando o filtro escolhido (o mesmo
 * exibido ao vivo no viewfinder) e retorna um JPEG comprimido pronto para
 * upload — tudo isso antes de qualquer envio, já que ninguém (nem o autor)
 * pode ver a foto crua.
 */
export function captureFilteredJpeg(
  video: HTMLVideoElement,
  mirror: boolean,
  preset: FilterPreset
): Promise<Blob> {
  const vw = video.videoWidth;
  const vh = video.videoHeight;

  let outW = vw;
  let outH = vh;
  if (Math.max(vw, vh) > MAX_SIDE) {
    const scale = MAX_SIDE / Math.max(vw, vh);
    outW = Math.round(vw * scale);
    outH = Math.round(vh * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas indisponível"));

  ctx.save();
  if (mirror) {
    ctx.translate(outW, 0);
    ctx.scale(-1, 1);
  }
  ctx.filter = preset.cssFilter;
  ctx.drawImage(video, 0, 0, outW, outH);
  ctx.restore();
  ctx.filter = "none";

  drawVignette(ctx, outW, outH, preset.vignetteStrength);
  applyGrain(ctx, outW, outH, preset.grainOpacity);
  drawTimestamp(ctx, outW, outH);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar imagem"))),
      "image/jpeg",
      JPEG_QUALITY
    );
  });
}

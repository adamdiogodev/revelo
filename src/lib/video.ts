import "server-only";
import path from "node:path";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import sharp from "sharp";

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);

const WIDTH = 1080;
const HEIGHT = 1920;
const TITLE_SECONDS = 2.5;
const PHOTO_SECONDS = 2;

const FONT_PATH = path.join(process.cwd(), "assets", "fonts", "Geist-Regular.ttf");
const FALLBACK_COVER_PATH = path.join(process.cwd(), "public", "covers", "preset-dourado.jpg");

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Monta o quadro de abertura (capa + nome do evento) via sharp: o texto é
 * renderizado pelo Pango do sharp apontando direto pro arquivo da fonte
 * (fontfile), sem depender do fontconfig do sistema nem do drawtext do
 * ffmpeg — em builds estáticas de Linux o ffmpeg pode vir sem esse suporte,
 * e SVG com @font-face embutido não é respeitado pelo librsvg.
 */
async function buildTitleFrame(coverBuffer: Buffer, eventNome: string): Promise<Buffer> {
  const bandHeight = 170;
  const bandY = Math.round(HEIGHT / 2 - bandHeight / 2);
  const markup = `<span foreground="white">${escapeXml(eventNome)}</span>`;

  const textPng = await sharp({
    text: {
      text: markup,
      fontfile: FONT_PATH,
      font: "Geist",
      width: WIDTH - 120,
      height: bandHeight - 30,
      align: "center",
      rgba: true,
    },
  })
    .png()
    .toBuffer();

  const textMeta = await sharp(textPng).metadata();
  const textLeft = Math.round((WIDTH - (textMeta.width ?? 0)) / 2);
  const textTop = Math.round(bandY + (bandHeight - (textMeta.height ?? 0)) / 2);

  const bandSvg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="${bandY}" width="${WIDTH}" height="${bandHeight}" fill="black" fill-opacity="0.45" />
  </svg>`;

  return sharp(coverBuffer)
    .resize(WIDTH, HEIGHT, { fit: "cover" })
    .composite([
      { input: Buffer.from(bandSvg), top: 0, left: 0 },
      { input: textPng, top: textTop, left: textLeft },
    ])
    .jpeg()
    .toBuffer();
}

export async function generateHighlightVideo(params: {
  eventNome: string;
  capaBuffer: Buffer | null;
  photoBuffers: Buffer[];
}): Promise<Buffer> {
  const dir = await mkdtemp(path.join(tmpdir(), "revelo-video-"));

  try {
    const titleSource = params.capaBuffer ?? (await readFile(FALLBACK_COVER_PATH));
    const titleBuffer = await buildTitleFrame(titleSource, params.eventNome);

    const frames: { file: string; seconds: number }[] = [];

    const titlePath = path.join(dir, "frame-000.jpg");
    await writeFile(titlePath, titleBuffer);
    frames.push({ file: titlePath, seconds: TITLE_SECONDS });

    for (let i = 0; i < params.photoBuffers.length; i++) {
      const framePath = path.join(dir, `frame-${String(i + 1).padStart(3, "0")}.jpg`);
      await writeFile(framePath, params.photoBuffers[i]);
      frames.push({ file: framePath, seconds: PHOTO_SECONDS });
    }

    const outputPath = path.join(dir, "output.mp4");

    const filterParts: string[] = [];
    frames.forEach((_, i) => {
      filterParts.push(
        `[${i}:v]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},setsar=1[v${i}]`
      );
    });
    const concatInputs = frames.map((_, i) => `[v${i}]`).join("");
    filterParts.push(`${concatInputs}concat=n=${frames.length}:v=1:a=0[outv]`);

    await new Promise<void>((resolve, reject) => {
      const command = ffmpeg();

      frames.forEach(({ file, seconds }) => {
        command.input(file).inputOptions([`-loop 1`, `-t ${seconds}`]);
      });

      command
        .complexFilter(filterParts.join(";"), "outv")
        .outputOptions(["-c:v libx264", "-pix_fmt yuv420p", "-movflags +faststart", "-an"])
        .output(outputPath)
        .on("error", (err) => reject(err))
        .on("end", () => resolve())
        .run();
    });

    return await readFile(outputPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

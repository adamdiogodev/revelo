import "server-only";
import path from "node:path";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);

const WIDTH = 1080;
const HEIGHT = 1920;
const TITLE_SECONDS = 2.5;
const PHOTO_SECONDS = 2;

const FONT_PATH = path.join(process.cwd(), "assets", "fonts", "Geist-Regular.ttf");
const FALLBACK_COVER_PATH = path.join(process.cwd(), "public", "covers", "preset-dourado.jpg");

/** Escapa texto para uso seguro dentro do filtro drawtext do ffmpeg. */
function escapeDrawtext(text: string): string {
  return text
    .replace(/\\/g, "\\\\\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "’")
    .replace(/%/g, "\\%");
}

export async function generateHighlightVideo(params: {
  eventNome: string;
  capaBuffer: Buffer | null;
  photoBuffers: Buffer[];
}): Promise<Buffer> {
  const dir = await mkdtemp(path.join(tmpdir(), "revelo-video-"));

  try {
    const titleBuffer = params.capaBuffer ?? (await readFile(FALLBACK_COVER_PATH));

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
    const text = escapeDrawtext(params.eventNome);
    // No Windows o caminho tem "C:" — dois-pontos quebra o parser de filtros
    // do ffmpeg (usa ":" pra separar opções), então escapa também aqui.
    const escapedFontPath = FONT_PATH.replace(/\\/g, "/").replace(/:/g, "\\:");

    const filterParts: string[] = [];
    frames.forEach((_, i) => {
      const base = `[${i}:v]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},setsar=1`;
      if (i === 0) {
        filterParts.push(
          `${base},drawtext=fontfile='${escapedFontPath}':text='${text}':fontsize=64:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.45:boxborderw=24[v${i}]`
        );
      } else {
        filterParts.push(`${base}[v${i}]`);
      }
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

export type FilterPreset = {
  id: string;
  nome: string;
  /** aplicado ao vivo no <video> e "queimado" na foto final via canvas */
  cssFilter: string;
  grainOpacity: number;
  vignetteStrength: number;
};

export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: "classico",
    nome: "Clássico",
    cssFilter: "saturate(65%) contrast(108%) brightness(103%) sepia(8%)",
    grainOpacity: 0.06,
    vignetteStrength: 1,
  },
  {
    id: "kodak",
    nome: "Kodak",
    cssFilter: "saturate(145%) contrast(112%) brightness(103%) hue-rotate(-4deg) sepia(10%)",
    grainOpacity: 0.05,
    vignetteStrength: 0.8,
  },
  {
    id: "pb",
    nome: "P&B",
    cssFilter: "grayscale(100%) contrast(115%) brightness(102%)",
    grainOpacity: 0.08,
    vignetteStrength: 1,
  },
  {
    id: "polaroid",
    nome: "Polaroid",
    cssFilter: "saturate(80%) contrast(90%) brightness(108%) sepia(15%)",
    grainOpacity: 0.03,
    vignetteStrength: 1.3,
  },
];

export const DEFAULT_FILTER_ID = FILTER_PRESETS[0].id;

export function getFilterPreset(id: string): FilterPreset {
  return FILTER_PRESETS.find((f) => f.id === id) || FILTER_PRESETS[0];
}

/** data-URI de ruído/grão via SVG feTurbulence — reutilizado no preview ao vivo (CSS) */
export const GRAIN_SVG_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

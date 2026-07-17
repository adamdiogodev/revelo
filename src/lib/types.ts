export type EventRow = {
  id: string;
  nome: string;
  slug: string;
  reveal_at: string;
  poses_por_convidado: number;
  modo_desafios: boolean;
  host_token: string;
  host_user_id: string | null;
  codigo_acesso: string;
  max_convidados: number;
  created_at: string;
  expires_at: string;
  capa_url: string | null;
};

export type ChallengeRow = {
  id: string;
  event_id: string;
  titulo: string;
  emoji: string;
  created_at: string;
};

export type GuestRow = {
  id: string;
  event_id: string;
  nome: string;
  guest_token: string;
  poses_usadas: number;
  created_at: string;
};

export type PhotoRow = {
  id: string;
  event_id: string;
  guest_id: string;
  storage_path: string;
  taken_at: string;
  challenge_id: string | null;
};

export type RevealPhoto = {
  id: string;
  guestNome: string;
  takenAt: string;
  viewUrl: string;
  downloadUrl: string;
  challengeId: string | null;
  challengeTitulo: string | null;
};

export type RevealChapter = {
  challengeId: string;
  titulo: string;
  emoji: string;
  photos: RevealPhoto[];
};

export type RevealPayload = {
  fase: "captura" | "revelada" | "expirada";
  nome: string;
  revealAt: string;
  expiresAt: string;
  capaUrl: string | null;
  freePhotos: RevealPhoto[];
  chapters: RevealChapter[];
  allPhotos: RevealPhoto[];
  guestNames: string[];
};

export type PublicEventInfo = {
  nome: string;
  slug: string;
  revealAt: string;
  expiresAt: string;
  posesPorConvidado: number;
  modoDesafios: boolean;
  challenges: { id: string; titulo: string; emoji: string }[];
  now: string;
  totalFotos: number;
  totalConvidados: number;
  maxConvidados: number;
  capaUrl: string | null;
  fase: "captura" | "revelada" | "expirada";
};

export type HostEventSummary = {
  slug: string;
  nome: string;
  revealAt: string;
  expiresAt: string;
  codigoAcesso: string;
  totalFotos: number;
  totalConvidados: number;
  maxConvidados: number;
  capaUrl: string | null;
  fase: "captura" | "revelada" | "expirada";
};

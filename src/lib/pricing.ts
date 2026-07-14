export type PricingTier = {
  maxConvidados: number;
  precoCentavos: number;
  label: string;
};

// Sentinela para "ilimitado": reaproveita toda a lógica de limite existente
// (comparação numérica simples) sem precisar de nenhum caso especial.
export const ILIMITADO = 100000;

export const PRICING_TIERS: PricingTier[] = [
  { maxConvidados: 5, precoCentavos: 0, label: "Até 5 convidados" },
  { maxConvidados: 10, precoCentavos: 1490, label: "Até 10 convidados" },
  { maxConvidados: 25, precoCentavos: 4999, label: "Até 25 convidados" },
  { maxConvidados: 50, precoCentavos: 9990, label: "Até 50 convidados" },
  { maxConvidados: 100, precoCentavos: 14990, label: "Até 100 convidados" },
  { maxConvidados: 150, precoCentavos: 24990, label: "Até 150 convidados" },
  { maxConvidados: 200, precoCentavos: 29990, label: "Até 200 convidados" },
  { maxConvidados: ILIMITADO, precoCentavos: 49990, label: "Ilimitado" },
];

export const FREE_TIER = PRICING_TIERS[0];

export function getTierByMaxConvidados(maxConvidados: number): PricingTier | undefined {
  return PRICING_TIERS.find((t) => t.maxConvidados === maxConvidados);
}

export function formatBRL(centavos: number): string {
  if (centavos === 0) return "Grátis";
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatConvidados(maxConvidados: number): string {
  return maxConvidados >= ILIMITADO ? "Ilimitado" : String(maxConvidados);
}

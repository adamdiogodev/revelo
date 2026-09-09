export type PricingTier = {
  maxConvidados: number;
  precoCentavos: number;
  label: string;
};

// Sentinel for "unlimited": reuses the existing limit logic (a plain numeric
// comparison) without needing any special case.
export const UNLIMITED = 100000;

export const PRICING_TIERS: PricingTier[] = [
  { maxConvidados: 5, precoCentavos: 0, label: "Up to 5 guests" },
  { maxConvidados: 10, precoCentavos: 499, label: "Up to 10 guests" },
  { maxConvidados: 25, precoCentavos: 1999, label: "Up to 25 guests" },
  { maxConvidados: 50, precoCentavos: 2999, label: "Up to 50 guests" },
  { maxConvidados: 100, precoCentavos: 4999, label: "Up to 100 guests" },
  { maxConvidados: 150, precoCentavos: 6999, label: "Up to 150 guests" },
  { maxConvidados: 200, precoCentavos: 8999, label: "Up to 200 guests" },
  { maxConvidados: UNLIMITED, precoCentavos: 14999, label: "Unlimited" },
];

export const FREE_TIER = PRICING_TIERS[0];

export function getTierByGuestLimit(maxConvidados: number): PricingTier | undefined {
  return PRICING_TIERS.find((t) => t.maxConvidados === maxConvidados);
}

export function formatPrice(centavos: number): string {
  if (centavos === 0) return "Free";
  return (centavos / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function formatGuestLimit(maxConvidados: number): string {
  return maxConvidados >= UNLIMITED ? "Unlimited" : String(maxConvidados);
}

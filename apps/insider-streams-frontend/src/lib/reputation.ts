export type ReputationTier =
  | "top-seller"
  | "trusted"
  | "reliable"
  | "unproven"
  | "new"
  | "risky";

type ReputationTierInfo = {
  tier: ReputationTier;
  label: string;
  colorClass: string;
  badgeBg: string;
  ringClass: string;
  scoreColorClass: string;
};

const TIER_MAP: Record<ReputationTier, Omit<ReputationTierInfo, "tier">> = {
  "top-seller": {
    label: "Top Seller",
    colorClass: "text-emerald-400",
    badgeBg:
      "border-emerald-500/40 bg-emerald-500/12 text-emerald-400",
    ringClass: "ring-emerald-500/30",
    scoreColorClass: "text-emerald-400",
  },
  trusted: {
    label: "Trusted",
    colorClass: "text-emerald-400/80",
    badgeBg:
      "border-emerald-500/30 bg-emerald-500/8 text-emerald-400/80",
    ringClass: "ring-emerald-500/20",
    scoreColorClass: "text-emerald-400/80",
  },
  reliable: {
    label: "Reliable",
    colorClass: "text-sky-400",
    badgeBg: "border-sky-500/30 bg-sky-500/8 text-sky-400",
    ringClass: "ring-sky-500/20",
    scoreColorClass: "text-sky-400",
  },
  unproven: {
    label: "Unproven",
    colorClass: "text-muted-foreground",
    badgeBg:
      "border-border bg-muted/40 text-muted-foreground",
    ringClass: "ring-border",
    scoreColorClass: "text-muted-foreground",
  },
  new: {
    label: "New",
    colorClass: "text-muted-foreground/60",
    badgeBg:
      "border-border/60 bg-muted/20 text-muted-foreground/70",
    ringClass: "ring-border/40",
    scoreColorClass: "text-muted-foreground/60",
  },
  risky: {
    label: "Risky",
    colorClass: "text-rose-400",
    badgeBg: "border-rose-500/30 bg-rose-500/8 text-rose-400",
    ringClass: "ring-rose-500/20",
    scoreColorClass: "text-rose-400",
  },
};

export function getReputationTier(
  score: number,
  totalAuctions: number,
): ReputationTierInfo {
  let tier: ReputationTier;

  if (totalAuctions === 0) {
    tier = "new";
  } else if (score >= 5) {
    tier = "top-seller";
  } else if (score >= 3) {
    tier = "trusted";
  } else if (score >= 1) {
    tier = "reliable";
  } else if (score < 0) {
    tier = "risky";
  } else {
    tier = "unproven";
  }

  return { tier, ...TIER_MAP[tier] };
}

export function getAccuracyPercent(
  correct: number,
  wrong: number,
): number | null {
  const scored = correct + wrong;
  if (scored === 0) return null;
  return Math.round((correct / scored) * 100);
}

export function formatScoreSigned(score: number): string {
  if (score > 0) return `+${score}`;
  return String(score);
}

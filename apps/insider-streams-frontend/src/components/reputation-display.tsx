import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getReputationTier,
  formatScoreSigned,
} from "@/lib/reputation";

export function AccuracyBar({
  correct,
  wrong,
  className,
}: {
  correct: number;
  wrong: number;
  className?: string;
}) {
  const total = correct + wrong;
  if (total === 0) return null;
  const correctPct = (correct / total) * 100;

  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-rose-500/20",
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-emerald-500/70 transition-all"
        style={{ width: `${correctPct}%` }}
      />
    </div>
  );
}

const SIZE_CONFIG = {
  sm: {
    wrapper: "gap-1.5",
    pill: "px-2 py-0.5 text-[10px]",
    icon: "size-2.5",
    label: "text-[10px] tracking-[0.14em]",
  },
  md: {
    wrapper: "gap-2",
    pill: "px-3 py-1 text-xs",
    icon: "size-3.5",
    label: "text-xs tracking-[0.16em]",
  },
} as const;

export function ReputationTierBadge({
  score,
  totalAuctions,
  size = "md",
}: {
  score: number;
  totalAuctions: number;
  size?: "sm" | "md";
}) {
  const tierInfo = getReputationTier(score, totalAuctions);
  const ScoreIcon =
    score > 0 ? TrendingUp : score < 0 ? TrendingDown : Minus;
  const cfg = SIZE_CONFIG[size];

  return (
    <span className={cn("inline-flex items-center", cfg.wrapper)}>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border font-semibold tracking-wide",
          cfg.pill,
          tierInfo.badgeBg,
        )}
      >
        <ScoreIcon className={cfg.icon} />
        {formatScoreSigned(score)}
      </span>
      <span
        className={cn(
          "font-medium uppercase",
          cfg.label,
          tierInfo.colorClass,
        )}
      >
        {tierInfo.label}
      </span>
    </span>
  );
}

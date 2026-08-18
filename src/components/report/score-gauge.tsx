"use client";

import { useEffect, useRef, useState } from "react";
import type { ScoreBand } from "@/lib/ats/types";
import { cn } from "@/lib/utils";

const BAND_COPY: Record<ScoreBand, { label: string; className: string }> = {
  excellent: { label: "Excellent", className: "text-success" },
  strong: { label: "Strong", className: "text-success" },
  fair: { label: "Needs work", className: "text-warning" },
  at_risk: { label: "At risk", className: "text-danger" },
};

interface ScoreGaugeProps {
  score: number;
  band: ScoreBand;
  benchmark?: { p50: number; p75: number; p90: number };
  size?: number;
  label?: string;
}

export function ScoreGauge({ score, band, benchmark, size = 208, label = "ATS score" }: ScoreGaugeProps) {
  const displayed = useCountUp(score);
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  // Three-quarter arc leaves room for the caption without cramping the number.
  const arc = 0.78;
  const dash = circumference * arc;
  const offset = dash * (1 - score / 100);

  const tone =
    band === "at_risk"
      ? "var(--danger)"
      : band === "fair"
        ? "var(--warning)"
        : "var(--success)";

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-[140deg]" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-sunken)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
        {benchmark ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth={2}
            strokeDasharray={`2 6`}
            strokeDashoffset={-dash * (benchmark.p75 / 100)}
            opacity={0.9}
          />
        ) : null}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>

      <div className="absolute inset-0 grid place-content-center text-center">
        <span className="tabular text-[54px] font-semibold leading-none tracking-tight">{displayed}</span>
        <span className={cn("mt-1.5 text-[12px] font-medium", BAND_COPY[band].className)}>{BAND_COPY[band].label}</span>
        <span className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-subtle">{label}</span>
      </div>

      <output className="sr-only" aria-live="polite">{`${label}: ${score} out of 100, ${BAND_COPY[band].label}.`}</output>
    </div>
  );
}

function useCountUp(target: number, duration = 1100): number {
  const [value, setValue] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const cancel = () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      frame.current = requestAnimationFrame(() => setValue(target));
      return cancel;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return cancel;
  }, [target, duration]);

  return value;
}

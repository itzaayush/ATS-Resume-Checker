"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { STAGES } from "@/lib/ats/stages";
import type { AnalysisStage } from "@/lib/ats/types";
import { useRenderCapability } from "@/components/three/use-webgl-support";
import { cn } from "@/lib/utils";

// The 3D bundle is never part of first paint; it loads only when a scan starts.
const ScanScene = dynamic(() => import("@/components/three/scan-scene"), {
  ssr: false,
  loading: () => null,
});

interface ScanLoaderProps {
  stage: AnalysisStage;
  fileName?: string;
}

export function ScanLoader({ stage, fileName }: ScanLoaderProps) {
  const capability = useRenderCapability();
  const currentIndex = Math.max(0, STAGES.findIndex((s) => s.id === stage));
  const progress = STAGES[currentIndex]?.progress ?? 0;
  const useWebgl = capability.ready && capability.webgl && !capability.reducedMotion;

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,320px)_1fr] md:items-center">
      <div className="relative mx-auto aspect-[3/4] w-full max-w-[300px] overflow-hidden rounded-2xl border border-border bg-surface-sunken">
        {useWebgl ? (
          <ScanScene progress={progress} simplified={capability.lowPower} />
        ) : (
          <FallbackScan progress={progress} animate={capability.ready && !capability.reducedMotion} />
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-surface-sunken to-transparent p-3 pt-8">
          <p className="truncate text-center font-mono text-[11px] text-subtle">{fileName ?? "resume.pdf"}</p>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">Analysis pipeline</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">{STAGES[currentIndex]?.label}</h2>
        <p className="mt-1 text-sm text-muted">{STAGES[currentIndex]?.detail}</p>

        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {`Stage ${currentIndex + 1} of ${STAGES.length}: ${STAGES[currentIndex]?.label}. ${Math.round(progress * 100)} percent complete.`}
        </div>

        <ol className="mt-6 space-y-1.5">
          {STAGES.map((item, index) => {
            const done = index < currentIndex;
            const active = index === currentIndex;
            return (
              <li
                key={item.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors",
                  active ? "bg-surface-raised text-foreground" : done ? "text-muted" : "text-subtle",
                )}
              >
                <span
                  className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                    done ? "border-success bg-success-soft text-success" : active ? "border-accent text-accent" : "border-border",
                  )}
                >
                  {done ? (
                    <Check className="h-3 w-3" />
                  ) : active ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <span className="h-1 w-1 rounded-full bg-current opacity-50" />
                  )}
                </span>
                <span className="flex-1">{item.label}</span>
                <AnimatePresence>
                  {active ? (
                    <motion.span
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="tabular text-[11px] text-subtle"
                    >
                      {Math.round(item.progress * 100)}%
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </li>
            );
          })}
        </ol>

        {capability.ready && !useWebgl ? (
          <p className="mt-4 text-[12px] text-subtle">
            {capability.reducedMotion
              ? "Reduced-motion mode is on, so the lightweight scanner is being used."
              : "WebGL is unavailable, so the lightweight scanner is being used. Nothing is missing from your report."}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** DOM/SVG scanner used when WebGL is unavailable or motion is reduced. */
function FallbackScan({ progress, animate }: { progress: number; animate: boolean }) {
  const rows = Array.from({ length: 26 });
  return (
    <div className="relative h-full w-full p-6">
      <div className="flex h-full flex-col justify-start gap-[7px]">
        {rows.map((_, index) => {
          const width = 40 + ((index * 37) % 55);
          const scanned = index / rows.length < progress;
          return (
            <span
              key={index}
              className={cn(
                "block h-[5px] rounded-full transition-colors duration-500",
                scanned ? "bg-accent/70" : "bg-border",
              )}
              style={{ width: `${width}%` }}
            />
          );
        })}
      </div>
      <div
        className={cn(
          "pointer-events-none absolute inset-x-4 h-[2px] rounded-full bg-accent shadow-[0_0_18px_4px_var(--glow)] transition-[top] duration-700 ease-out",
          animate ? "" : "transition-none",
        )}
        style={{ top: `${Math.max(4, progress * 100)}%` }}
      />
    </div>
  );
}

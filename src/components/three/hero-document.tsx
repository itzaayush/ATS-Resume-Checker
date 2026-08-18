"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useRenderCapability } from "./use-webgl-support";

const ScanScene = dynamic(() => import("./scan-scene"), { ssr: false, loading: () => null });

/**
 * Ambient hero scene. Unlike the analysis loader this one is decorative, so it is skipped
 * entirely when motion is reduced or the device is low powered.
 */
export function HeroDocument() {
  const capability = useRenderCapability();
  const [progress, setProgress] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!capability.ready || capability.reducedMotion) return;
    const start = performance.now();
    const loop = (now: number) => {
      const elapsed = ((now - start) / 5200) % 1;
      setProgress(elapsed);
      frame.current = requestAnimationFrame(loop);
    };
    frame.current = requestAnimationFrame(loop);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [capability.ready, capability.reducedMotion]);

  if (!capability.ready || !capability.webgl || capability.reducedMotion) {
    return <StaticDocument />;
  }

  return (
    <div className="h-full w-full">
      <ScanScene progress={progress} simplified={capability.lowPower} />
    </div>
  );
}

function StaticDocument() {
  const rows = Array.from({ length: 24 });
  return (
    <div className="grid h-full w-full place-items-center p-8" aria-hidden="true">
      <div className="w-full max-w-[240px] rounded-lg border border-border bg-surface p-5 shadow-[0_24px_60px_-30px_var(--glow)]">
        <div className="mb-3 h-2.5 w-1/2 rounded-full bg-accent/70" />
        <div className="mb-4 h-1.5 w-2/3 rounded-full bg-border" />
        <div className="space-y-[6px]">
          {rows.map((_, index) => (
            <span
              key={index}
              className="block h-[4px] rounded-full bg-border"
              style={{ width: `${45 + ((index * 29) % 50)}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

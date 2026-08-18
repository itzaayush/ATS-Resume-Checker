"use client";

import { useSyncExternalStore } from "react";

export interface RenderCapability {
  ready: boolean;
  webgl: boolean;
  reducedMotion: boolean;
  lowPower: boolean;
}

const SERVER_SNAPSHOT: RenderCapability = {
  ready: false,
  webgl: false,
  reducedMotion: false,
  lowPower: false,
};

let cached: RenderCapability | null = null;

function detect(): RenderCapability {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let webgl = false;
  try {
    const canvas = document.createElement("canvas");
    const context =
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl");
    webgl = Boolean(context);
    const lose = (context as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context");
    lose?.loseContext();
  } catch {
    webgl = false;
  }

  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const lowPower = cores <= 4 || memory <= 4 || (coarsePointer && window.innerWidth < 768);

  return { ready: true, webgl, reducedMotion, lowPower };
}

function getSnapshot(): RenderCapability {
  cached ??= detect();
  return cached;
}

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  const handler = () => {
    cached = detect();
    onChange();
  };
  media.addEventListener("change", handler);
  return () => media.removeEventListener("change", handler);
}

/**
 * Decides between the WebGL scene and the DOM fallback. The fallback is a genuine
 * alternative experience, not a degraded 3D scene: it carries the same stage labels and
 * the same progress semantics.
 */
export function useRenderCapability(): RenderCapability {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
}

"use client";

import { Check, Copy, Wand2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { BulletRewrite } from "@/lib/ats/types";
import { cn } from "@/lib/utils";

type Variant = "concise" | "standard" | "metricsHeavy";

const VARIANTS: { id: Variant; label: string; hint: string }[] = [
  { id: "concise", label: "Concise", hint: "Under 20 words" },
  { id: "standard", label: "Standard", hint: "Action, approach, outcome" },
  { id: "metricsHeavy", label: "Metrics-heavy", hint: "Maximum quantification" },
];

export function RewritePanel({ rewrites }: { rewrites: BulletRewrite[] }) {
  if (!rewrites.length) {
    return (
      <div className="px-5 py-10 text-center">
        <Wand2 className="mx-auto h-5 w-5 text-success" />
        <p className="mt-2 text-sm font-medium">No bullets needed rewriting.</p>
        <p className="mt-1 text-[13px] text-muted">Every bullet already opens with a verb and carries a number.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="border-b border-border px-5 py-3 text-[12px] leading-relaxed text-muted">
        Rewrites are generated from your own words. Nothing is invented — where a number is missing you get a
        placeholder token and a prompt telling you exactly what to measure.
      </p>
      <ul className="divide-y divide-border">
        {rewrites.map((rewrite, index) => (
          <RewriteRow key={index} rewrite={rewrite} index={index} />
        ))}
      </ul>
    </div>
  );
}

function RewriteRow({ rewrite, index }: { rewrite: BulletRewrite; index: number }) {
  const [variant, setVariant] = useState<Variant>("standard");
  const [copied, setCopied] = useState(false);
  const value = rewrite[variant];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <li className="px-5 py-4">
      <div className="rounded-lg border-l-2 border-danger/50 bg-danger-soft/40 px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">Your bullet {index + 1}</p>
        <p className="mt-1 text-[13px] leading-relaxed">{rewrite.original}</p>
      </div>

      {rewrite.issues.length ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {rewrite.issues.map((issue) => (
            <li key={issue}>
              <Badge tone="warning">{issue}</Badge>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {VARIANTS.map((option) => (
          <button
            key={option.id}
            onClick={() => setVariant(option.id)}
            aria-pressed={variant === option.id}
            title={option.hint}
            className={cn(
              "rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
              variant === option.id ? "bg-accent text-accent-contrast" : "bg-surface-raised text-muted hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
        <button
          onClick={copy}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-[12px] text-muted transition hover:text-foreground"
        >
          {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="mt-2 rounded-lg border-l-2 border-success/60 bg-success-soft/40 px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">Rewritten</p>
        <p className="mt-1 text-[13px] leading-relaxed">{value}</p>
      </div>

      {rewrite.placeholders.length ? (
        <dl className="mt-2 space-y-1.5">
          {rewrite.placeholders.map((placeholder) => (
            <div key={placeholder.token} className="flex gap-2">
              <dt>
                <code className="rounded bg-warning-soft px-1.5 py-0.5 font-mono text-[11px] text-warning">
                  {placeholder.token}
                </code>
              </dt>
              <dd className="text-[12px] leading-relaxed text-muted">{placeholder.prompt}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </li>
  );
}

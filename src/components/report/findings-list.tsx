"use client";

import { AlertTriangle, ChevronRight, CircleAlert, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { Finding, PillarId, Severity } from "@/lib/ats/types";
import { cn } from "@/lib/utils";

const SEVERITY_META: Record<Severity, { label: string; tone: "danger" | "warning" | "neutral"; Icon: typeof AlertTriangle }> = {
  critical: { label: "Critical", tone: "danger", Icon: CircleAlert },
  important: { label: "Important", tone: "warning", Icon: AlertTriangle },
  polish: { label: "Polish", tone: "neutral", Icon: Sparkles },
};

const PILLAR_LABEL: Record<PillarId, string> = {
  parseability: "Parseability",
  content_impact: "Impact",
  skills_keywords: "Skills",
  structure_consistency: "Structure",
  role_alignment: "Alignment",
  hygiene_language: "Language",
};

export function FindingsList({ findings }: { findings: Finding[] }) {
  const [filter, setFilter] = useState<Severity | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(findings[0]?.id ?? null);

  const counts = useMemo(() => {
    return findings.reduce<Record<string, number>>((acc, finding) => {
      acc[finding.severity] = (acc[finding.severity] ?? 0) + 1;
      return acc;
    }, {});
  }, [findings]);

  const visible = filter === "all" ? findings : findings.filter((f) => f.severity === filter);

  if (!findings.length) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="text-sm font-medium">Every check passed.</p>
        <p className="mt-1 text-[13px] text-muted">Tailor to a specific job description to find the remaining gaps.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 border-b border-border px-5 py-3">
        {(["all", "critical", "important", "polish"] as const).map((value) => {
          const active = filter === value;
          const count = value === "all" ? findings.length : (counts[value] ?? 0);
          return (
            <button
              key={value}
              onClick={() => setFilter(value)}
              aria-pressed={active}
              className={cn(
                "rounded-full px-3 py-1 text-[12px] font-medium capitalize transition-colors",
                active ? "bg-accent text-accent-contrast" : "bg-surface-raised text-muted hover:text-foreground",
              )}
            >
              {value} <span className="tabular opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      <ul className="divide-y divide-border">
        {visible.map((finding) => {
          const meta = SEVERITY_META[finding.severity];
          const open = expanded === finding.id;
          return (
            <li key={finding.id}>
              <button
                onClick={() => setExpanded(open ? null : finding.id)}
                aria-expanded={open}
                className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-raised"
              >
                <meta.Icon
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    finding.severity === "critical" ? "text-danger" : finding.severity === "important" ? "text-warning" : "text-subtle",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-medium">{finding.title}</span>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    <Badge>{PILLAR_LABEL[finding.pillar]}</Badge>
                  </div>
                  {!open ? <p className="mt-1 line-clamp-2 text-[12px] text-muted">{finding.reason}</p> : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="tabular rounded-md bg-surface-sunken px-2 py-1 text-[12px] font-medium text-foreground">
                    +{finding.pointsAtStake.toFixed(1)}
                  </span>
                  <ChevronRight className={cn("h-4 w-4 text-subtle transition-transform", open && "rotate-90")} />
                </div>
              </button>

              {open ? (
                <div className="space-y-3 bg-surface-sunken px-5 pb-5 pt-1">
                  <p className="text-[13px] leading-relaxed text-muted">{finding.reason}</p>
                  <div className="rounded-lg border border-accent/25 bg-accent-soft p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">How to fix it</p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-foreground">{finding.fix}</p>
                  </div>
                  {finding.evidence.length ? (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">From your resume</p>
                      <ul className="mt-2 space-y-1.5">
                        {finding.evidence.slice(0, 4).map((evidence, index) => (
                          <li
                            key={`${finding.id}-ev-${index}`}
                            className="rounded-md border-l-2 border-border-strong bg-surface px-3 py-2 font-mono text-[11px] leading-relaxed text-muted"
                          >
                            {evidence.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

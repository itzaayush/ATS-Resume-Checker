"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { CheckStatus, PillarResult } from "@/lib/ats/types";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<CheckStatus, "success" | "warning" | "danger"> = {
  pass: "success",
  partial: "warning",
  fail: "danger",
};

const STATUS_LABEL: Record<CheckStatus, string> = {
  pass: "Pass",
  partial: "Partial",
  fail: "Fail",
};

export function PillarBreakdown({ pillars, total }: { pillars: PillarResult[]; total: number }) {
  const [open, setOpen] = useState<string | null>(pillars[0]?.id ?? null);

  return (
    <div className="divide-y divide-border">
      {pillars.map((pillar) => {
        const expanded = open === pillar.id;
        const tone = pillar.score >= 80 ? "bg-success" : pillar.score >= 60 ? "bg-warning" : "bg-danger";
        return (
          <div key={pillar.id}>
            <button
              onClick={() => setOpen(expanded ? null : pillar.id)}
              aria-expanded={expanded}
              className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-raised"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[13px] font-medium">{pillar.label}</span>
                  <span className="tabular shrink-0 text-[13px] text-muted">
                    <span className="font-semibold text-foreground">{pillar.score.toFixed(0)}</span>
                    <span className="text-subtle">/100</span>
                  </span>
                </div>
                <Progress value={pillar.score} className="mt-2" barClassName={tone} label={`${pillar.label} score`} />
                <p className="mt-2 text-[12px] text-subtle">
                  Contributes {pillar.contribution.toFixed(1)} of {total} · weight {(pillar.weight * 100).toFixed(0)}%
                </p>
              </div>
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-subtle transition-transform", expanded && "rotate-180")} />
            </button>

            {expanded ? (
              <div className="bg-surface-sunken px-5 pb-5">
                <p className="pb-3 pt-1 text-[12px] leading-relaxed text-muted">{pillar.description}</p>
                <ul className="space-y-2">
                  {pillar.checks.map((check) => (
                    <li key={check.id} className="rounded-lg border border-border bg-surface p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={STATUS_TONE[check.status]}>{STATUS_LABEL[check.status]}</Badge>
                        <span className="text-[13px] font-medium">{check.label}</span>
                        <span className="tabular ml-auto text-[12px] text-subtle">
                          {check.points.toFixed(1)} / {check.max}
                        </span>
                      </div>
                      <p className="mt-2 text-[12px] leading-relaxed text-muted">{check.reason}</p>
                      {check.fix ? (
                        <p className="mt-2 rounded-md bg-accent-soft px-2.5 py-2 text-[12px] leading-relaxed text-accent">
                          {check.fix}
                        </p>
                      ) : null}
                      {check.evidence.length ? (
                        <ul className="mt-2 space-y-1">
                          {check.evidence.slice(0, 3).map((evidence, index) => (
                            <li
                              key={`${check.id}-${index}`}
                              className="truncate border-l-2 border-border-strong pl-2.5 font-mono text-[11px] text-subtle"
                            >
                              {evidence.text}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

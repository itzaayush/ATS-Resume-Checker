"use client";

import {
  BarChart3,
  Braces,
  FileSearch,
  Gauge,
  ListChecks,
  SpellCheck2,
  Target,
  Wand2,
} from "lucide-react";
import { useState } from "react";
import { FindingsList } from "./findings-list";
import { KeywordGapTable } from "./keyword-gap-table";
import { LanguagePanel } from "./language-panel";
import { LevelGap } from "./level-gap";
import { ParsePreview } from "./parse-preview";
import { PillarBreakdown } from "./pillar-breakdown";
import { RewritePanel } from "./rewrite-panel";
import { ScoreGauge } from "./score-gauge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LEVEL_LABELS, ROLE_PROFILES } from "@/lib/ats/rubric";
import type { AnalysisResult } from "@/lib/ats/types";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "findings", label: "Findings", Icon: ListChecks },
  { id: "pillars", label: "Score breakdown", Icon: BarChart3 },
  { id: "language", label: "Spelling & grammar", Icon: SpellCheck2 },
  { id: "rewrites", label: "Rewrites", Icon: Wand2 },
  { id: "level", label: "Level gap", Icon: Target },
  { id: "match", label: "Job match", Icon: Gauge },
  { id: "parse", label: "Parse preview", Icon: FileSearch },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ReportView({ result }: { result: AnalysisResult }) {
  const [tab, setTab] = useState<TabId>("findings");
  const role = ROLE_PROFILES.find((r) => r.id === result.targetRole);
  const critical = result.findings.filter((f) => f.severity === "critical").length;
  const recoverable = result.findings.reduce((sum, f) => sum + f.pointsAtStake, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="grid gap-8 p-6 md:grid-cols-[auto_1fr] md:items-center">
          <div className="mx-auto">
            <ScoreGauge score={result.overallScore} band={result.band} benchmark={result.benchmark} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">{role?.label ?? "Software Engineer"}</Badge>
              <Badge>{LEVEL_LABELS[result.targetLevel]}</Badge>
              <Badge>{result.stats.wordCount} words</Badge>
              <Badge>{result.stats.pageEstimate} page{result.stats.pageEstimate === 1 ? "" : "s"}</Badge>
            </div>

            <p className="mt-3 text-[15px] leading-relaxed">{result.interpretation}</p>

            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Critical findings" value={String(critical)} tone={critical ? "danger" : "success"} />
              <Stat label="Points recoverable" value={`+${recoverable.toFixed(0)}`} tone="accent" />
              <Stat
                label="Quantified bullets"
                value={`${result.stats.quantifiedBullets}/${result.stats.bulletCount}`}
                tone={result.stats.bulletCount && result.stats.quantifiedBullets / result.stats.bulletCount >= 0.5 ? "success" : "warning"}
              />
              <Stat
                label="Evidenced skills"
                value={`${result.stats.evidencedSkillCount}/${result.stats.skillCount}`}
                tone={result.stats.skillCount && result.stats.evidencedSkillCount / result.stats.skillCount >= 0.7 ? "success" : "warning"}
              />
            </dl>

            <p className="mt-4 text-[12px] text-subtle">
              Benchmark for {LEVEL_LABELS[result.targetLevel]}: median {result.benchmark.p50}, top quartile{" "}
              {result.benchmark.p75}, top decile {result.benchmark.p90}. Rubric {result.rubricVersion}.
            </p>
          </div>
        </CardContent>
      </Card>

      {result.jobMatch && result.jobMatch.jd.isJobDescription ? (
        <Card>
          <CardContent className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="mx-auto">
              <ScoreGauge
                score={result.jobMatch.matchScore}
                band={
                  result.jobMatch.matchScore >= 80
                    ? "excellent"
                    : result.jobMatch.matchScore >= 65
                      ? "strong"
                      : result.jobMatch.matchScore >= 50
                        ? "fair"
                        : "at_risk"
                }
                size={164}
                label="Match rate"
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold">
                {result.jobMatch.jd.title ?? "Target role"}
                {result.jobMatch.jd.company ? ` · ${result.jobMatch.jd.company}` : ""}
              </h3>
              <p className="mt-1 text-[13px] text-muted">
                A match rate of 75% or higher is the threshold most recruiters treat as a strong candidate.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Title match" value={`${result.jobMatch.titleMatch}%`} tone="neutral" />
                <Stat label="Required covered" value={`${result.jobMatch.requiredCoverage}%`} tone="neutral" />
                <Stat label="Preferred covered" value={`${result.jobMatch.preferredCoverage}%`} tone="neutral" />
                <Stat label="Responsibility fit" value={`${result.jobMatch.responsibilityAlignment}%`} tone="neutral" />
              </div>

              {result.jobMatch.plan.length ? (
                <ol className="mt-4 space-y-2">
                  {result.jobMatch.plan.map((action) => (
                    <li key={action.id} className="rounded-lg border border-border bg-surface-sunken px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-medium">{action.title}</span>
                        <Badge tone="accent">+{action.projectedDelta} projected</Badge>
                      </div>
                      <p className="mt-1 text-[12px] leading-relaxed text-muted">{action.detail}</p>
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2" role="tablist">
          {TABS.map((item) => {
            const active = tab === item.id;
            const disabled = item.id === "match" && !result.jobMatch?.jd.isJobDescription;
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={active}
                disabled={disabled}
                onClick={() => setTab(item.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                  active ? "bg-surface-raised text-foreground" : "text-muted hover:text-foreground",
                  disabled && "cursor-not-allowed opacity-40 hover:text-muted",
                )}
              >
                <item.Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>

        <div role="tabpanel">
          {tab === "findings" ? <FindingsList findings={result.findings} /> : null}
          {tab === "pillars" ? <PillarBreakdown pillars={result.pillars} total={result.overallScore} /> : null}
          {tab === "language" ? <LanguagePanel issues={result.spelling} /> : null}
          {tab === "rewrites" ? <RewritePanel rewrites={result.rewrites} /> : null}
          {tab === "level" ? <LevelGap signals={result.levelSignals} level={result.targetLevel} /> : null}
          {tab === "match" && result.jobMatch ? <KeywordGapTable match={result.jobMatch} /> : null}
          {tab === "parse" ? <ParsePreview resume={result.resume} /> : null}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Braces className="h-3.5 w-3.5 text-subtle" /> Score arithmetic
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5 font-mono text-[12px]">
            {result.pillars.map((pillar) => (
              <li key={pillar.id} className="flex items-center justify-between gap-4">
                <span className="truncate text-muted">{pillar.label}</span>
                <span className="tabular shrink-0">
                  {pillar.score.toFixed(1)} × {(pillar.weight * 100).toFixed(0)}% ={" "}
                  <span className="font-semibold">{pillar.contribution.toFixed(2)}</span>
                </span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-4 border-t border-border pt-1.5">
              <span className="font-semibold">Total</span>
              <span className="tabular font-semibold">{result.overallScore}</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "warning" | "danger" | "accent" | "neutral";
}) {
  const toneClass = {
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    accent: "text-accent",
    neutral: "text-foreground",
  }[tone];

  return (
    <div className="rounded-lg border border-border bg-surface-sunken px-3 py-2.5">
      <dt className="text-[11px] uppercase tracking-[0.1em] text-subtle">{label}</dt>
      <dd className={cn("tabular mt-1 text-[18px] font-semibold", toneClass)}>{value}</dd>
    </div>
  );
}

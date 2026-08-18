"use client";

import { ArrowUpDown, Download } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CoverageState, JobMatchResult } from "@/lib/ats/types";
import { cn } from "@/lib/utils";

const STATE_META: Record<CoverageState, { label: string; tone: "success" | "warning" | "danger" }> = {
  covered: { label: "Evidenced", tone: "success" },
  weak: { label: "Listed only", tone: "warning" },
  missing: { label: "Missing", tone: "danger" },
};

export function KeywordGapTable({ match }: { match: JobMatchResult }) {
  const [sort, setSort] = useState<"importance" | "state" | "name">("importance");
  const [filter, setFilter] = useState<CoverageState | "all">("all");

  const rows = useMemo(() => {
    const filtered = filter === "all" ? match.gaps : match.gaps.filter((g) => g.state === filter);
    const copy = [...filtered];
    if (sort === "name") copy.sort((a, b) => a.requirement.localeCompare(b.requirement));
    if (sort === "state") {
      const rank = { missing: 0, weak: 1, covered: 2 } as const;
      copy.sort((a, b) => rank[a.state] - rank[b.state]);
    }
    return copy;
  }, [match.gaps, sort, filter]);

  const exportCsv = () => {
    const header = "requirement,importance,coverage,matched_alias,suggested_section,note";
    const body = match.gaps
      .map((g) =>
        [g.requirement, g.importance, g.state, g.matchedAlias ?? "", g.suggestedSection, g.note]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "atsense-keyword-gap.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const counts = match.gaps.reduce<Record<string, number>>((acc, g) => {
    acc[g.state] = (acc[g.state] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
        {(["all", "missing", "weak", "covered"] as const).map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={cn(
              "rounded-full px-3 py-1 text-[12px] font-medium capitalize transition-colors",
              filter === value ? "bg-accent text-accent-contrast" : "bg-surface-raised text-muted hover:text-foreground",
            )}
          >
            {value === "all" ? "All" : STATE_META[value].label}{" "}
            <span className="tabular opacity-70">{value === "all" ? match.gaps.length : (counts[value] ?? 0)}</span>
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setSort(sort === "importance" ? "state" : sort === "state" ? "name" : "importance")}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-[12px] text-muted transition hover:text-foreground"
          >
            <ArrowUpDown className="h-3 w-3" /> Sort: {sort}
          </button>
          <Button variant="secondary" size="sm" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>
      </div>

      {match.stuffedTerms.length ? (
        <p className="border-b border-border bg-warning-soft px-5 py-3 text-[12px] leading-relaxed text-warning">
          {match.stuffedTerms.join(", ")} appear in your skills list and in this posting, but nowhere in your
          experience. Recruiters treat that pattern as keyword stuffing, so these are counted as unsupported
          rather than covered.
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-[0.1em] text-subtle">
              <th scope="col" className="px-5 py-2.5 font-medium">Requirement</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Importance</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Coverage</th>
              <th scope="col" className="px-5 py-2.5 font-medium">Where it should live</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={`${row.requirement}-${row.importance}`} className="align-top">
                <td className="px-5 py-3">
                  <span className="font-medium">{row.requirement}</span>
                  {row.matchedAlias ? (
                    <span className="ml-2 font-mono text-[11px] text-subtle">matched “{row.matchedAlias}”</span>
                  ) : null}
                  {row.evidence.length ? (
                    <p className="mt-1 line-clamp-2 font-mono text-[11px] text-subtle">{row.evidence[0].text}</p>
                  ) : null}
                </td>
                <td className="px-3 py-3">
                  <Badge tone={row.importance === "required" ? "accent" : "neutral"}>{row.importance}</Badge>
                </td>
                <td className="px-3 py-3">
                  <Badge tone={STATE_META[row.state].tone}>{STATE_META[row.state].label}</Badge>
                </td>
                <td className="px-5 py-3 text-muted">
                  <span className="capitalize text-foreground">{row.suggestedSection}</span>
                  <p className="mt-0.5 text-[12px] leading-relaxed">{row.note}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!rows.length ? <p className="px-5 py-8 text-center text-[13px] text-muted">Nothing in this filter.</p> : null}
    </div>
  );
}

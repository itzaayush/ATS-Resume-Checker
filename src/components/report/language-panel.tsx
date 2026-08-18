"use client";

import { Check, Copy, SpellCheck2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { SpellingIssue } from "@/lib/ats/types";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<SpellingIssue["kind"], string> = {
  spelling: "Spelling",
  confusable: "Wrong word",
  grammar: "Grammar",
  style: "Style",
  duplication: "Repeated",
  punctuation: "Punctuation",
  casing: "Casing",
};

const KIND_ORDER: SpellingIssue["kind"][] = [
  "spelling",
  "confusable",
  "grammar",
  "duplication",
  "casing",
  "punctuation",
  "style",
];

export function LanguagePanel({ issues }: { issues: SpellingIssue[] }) {
  const [kind, setKind] = useState<SpellingIssue["kind"] | "all">("all");
  const [copied, setCopied] = useState<string | null>(null);

  const counts = useMemo(() => {
    const map = new Map<SpellingIssue["kind"], number>();
    for (const issue of issues) map.set(issue.kind, (map.get(issue.kind) ?? 0) + 1);
    return map;
  }, [issues]);

  const visible = kind === "all" ? issues : issues.filter((i) => i.kind === kind);

  const copy = async (value: string, id: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  };

  if (!issues.length) {
    return (
      <div className="px-5 py-10 text-center">
        <SpellCheck2 className="mx-auto h-5 w-5 text-success" />
        <p className="mt-2 text-sm font-medium">No spelling, grammar or style issues found.</p>
        <p className="mt-1 text-[13px] text-muted">
          Checked against a full English dictionary plus a technical vocabulary, so product names were not
          flagged as errors.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 border-b border-border px-5 py-3">
        <FilterChip active={kind === "all"} onClick={() => setKind("all")} label="All" count={issues.length} />
        {KIND_ORDER.filter((k) => counts.get(k)).map((k) => (
          <FilterChip
            key={k}
            active={kind === k}
            onClick={() => setKind(k)}
            label={KIND_LABEL[k]}
            count={counts.get(k) ?? 0}
          />
        ))}
      </div>

      <ul className="divide-y divide-border">
        {visible.slice(0, 80).map((issue, index) => {
          const id = `${issue.kind}-${issue.start}-${index}`;
          const suggestion = issue.suggestions[0];
          return (
            <li key={id} className="px-5 py-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  tone={
                    issue.severity === "critical" ? "danger" : issue.severity === "important" ? "warning" : "neutral"
                  }
                >
                  {KIND_LABEL[issue.kind]}
                </Badge>
                <code className="rounded bg-danger-soft px-1.5 py-0.5 font-mono text-[12px] text-danger line-through decoration-danger/50">
                  {issue.word}
                </code>
                {suggestion ? (
                  <>
                    <span className="text-subtle">→</span>
                    <code className="rounded bg-success-soft px-1.5 py-0.5 font-mono text-[12px] text-success">
                      {suggestion}
                    </code>
                    <button
                      onClick={() => copy(suggestion, id)}
                      className="ml-auto inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted transition hover:text-foreground"
                    >
                      {copied === id ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                      {copied === id ? "Copied" : "Copy fix"}
                    </button>
                  </>
                ) : null}
              </div>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{issue.message}</p>
              {issue.suggestions.length > 1 ? (
                <p className="mt-1 text-[12px] text-subtle">
                  Other options: {issue.suggestions.slice(1).join(", ")}
                </p>
              ) : null}
              <p className="mt-1.5 rounded-md bg-surface-sunken px-2.5 py-1.5 font-mono text-[11px] leading-relaxed text-subtle">
                {issue.context}
              </p>
            </li>
          );
        })}
      </ul>

      {visible.length > 80 ? (
        <p className="border-t border-border px-5 py-3 text-[12px] text-subtle">
          Showing the first 80 of {visible.length} issues.
        </p>
      ) : null}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
        active ? "bg-accent text-accent-contrast" : "bg-surface-raised text-muted hover:text-foreground",
      )}
    >
      {label} <span className="tabular opacity-70">{count}</span>
    </button>
  );
}

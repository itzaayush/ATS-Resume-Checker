import { Badge } from "@/components/ui/badge";
import { LEVEL_LABELS } from "@/lib/ats/rubric";
import type { LevelSignal, SeniorityLevel } from "@/lib/ats/types";

const STATE_TONE = {
  present: "success",
  partial: "warning",
  absent: "danger",
} as const;

const DIMENSION_LABEL: Record<LevelSignal["dimension"], string> = {
  scope: "Scope",
  ownership: "Ownership",
  ambiguity: "Ambiguity",
  depth: "Technical depth",
  influence: "Influence",
  impact: "Business impact",
};

export function LevelGap({ signals, level }: { signals: LevelSignal[]; level: SeniorityLevel }) {
  const present = signals.filter((s) => s.state === "present").length;

  return (
    <div>
      <div className="border-b border-border px-5 py-4">
        <p className="text-[13px] text-muted">
          Expectations for <span className="font-medium text-foreground">{LEVEL_LABELS[level]}</span>. {present} of{" "}
          {signals.length} signals are fully evidenced.
        </p>
        <p className="mt-1.5 text-[12px] text-subtle">
          These rubrics approximate industry norms across large technology employers. They are not any single
          company&apos;s official standard.
        </p>
      </div>

      <ul className="divide-y divide-border">
        {signals.map((signal) => (
          <li key={signal.id} className="px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={STATE_TONE[signal.state]}>{signal.state}</Badge>
              <span className="text-[13px] font-medium">{signal.label}</span>
              <Badge>{DIMENSION_LABEL[signal.dimension]}</Badge>
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{signal.expectation}</p>

            {signal.evidence.length ? (
              <ul className="mt-2 space-y-1">
                {signal.evidence.map((evidence, index) => (
                  <li
                    key={`${signal.id}-${index}`}
                    className="rounded-md border-l-2 border-success/60 bg-success-soft px-3 py-1.5 font-mono text-[11px] leading-relaxed text-foreground"
                  >
                    {evidence.text}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-2 rounded-md bg-surface-sunken px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">
                  How this is usually phrased
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted">{signal.examplePhrasing}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

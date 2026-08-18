import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  BENCHMARKS,
  LEVEL_EXPECTATIONS,
  LEVEL_LABELS,
  LEVEL_ORDER,
  PILLARS,
  RUBRIC_VERSION,
  SCORE_BANDS,
  STRUCTURE_TARGETS,
} from "@/lib/ats/rubric";

export const metadata: Metadata = {
  title: "Scoring model",
  description:
    "The full ATSense rubric: six weighted pillars, the checks inside each one, level expectations, length targets and the benchmark distribution.",
};

export default function ScoringPage() {
  return (
    <div className="shell-narrow py-14">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Methodology</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">The scoring model, in full</h1>
      <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-muted">
        Published in full because a score you cannot audit is an opinion. Every pillar below is computed by
        deterministic rules; no language model participates in the number.
      </p>
      <p className="mt-3 font-mono text-[12px] text-subtle">Rubric version {RUBRIC_VERSION}</p>

      <section id="pillars" className="mt-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold tracking-tight">Pillar weights</h2>
        <div className="mt-5 space-y-3">
          {PILLARS.map((pillar) => (
            <Card key={pillar.id}>
              <CardContent className="p-5">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-[15px] font-medium">{pillar.label}</h3>
                  <span className="tabular text-[15px] font-semibold text-accent">
                    {(pillar.weight * 100).toFixed(0)}%
                  </span>
                </div>
                <Progress value={pillar.weight * 100 * 3.85} className="mt-3" label={`${pillar.label} weight`} />
                <p className="mt-3 text-[14px] leading-relaxed text-muted">{pillar.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-subtle">
          Parseability and impact carry 46% of the total between them because those two decide whether the
          document survives the screen and the skim that follows. Keyword coverage is deliberately worth less
          than the evidence behind it.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold tracking-tight">Score bands</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            { label: "Excellent", range: `${SCORE_BANDS.excellent}\u2013100`, tone: "success" as const, note: "Parses cleanly and reads convincingly. Tailor per requisition and apply." },
            { label: "Strong", range: `${SCORE_BANDS.strong}\u2013${SCORE_BANDS.excellent - 1}`, tone: "success" as const, note: "Will survive automated screening. Remaining gaps are about persuasion." },
            { label: "Needs work", range: `${SCORE_BANDS.fair}\u2013${SCORE_BANDS.strong - 1}`, tone: "warning" as const, note: "Readable but under-selling. Fix the critical findings first." },
            { label: "At risk", range: `0\u2013${SCORE_BANDS.fair - 1}`, tone: "danger" as const, note: "Real risk of being filtered out before a human sees it." },
          ].map((band) => (
            <div key={band.label} className="rounded-xl border border-border bg-surface px-4 py-4">
              <div className="flex items-center gap-2">
                <Badge tone={band.tone}>{band.label}</Badge>
                <span className="tabular text-[13px] text-muted">{band.range}</span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{band.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="levels" className="mt-14 scroll-mt-24">
        <h2 className="text-2xl font-semibold tracking-tight">Level expectations</h2>
        <p className="mt-3 text-[14px] leading-relaxed text-muted">
          Seniority is judged on scope, ownership, ambiguity, depth, influence and business impact. Each
          expectation applies from the level shown and upward.
        </p>
        <div className="mt-5 space-y-3">
          {LEVEL_EXPECTATIONS.map((expectation) => (
            <Card key={expectation.id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[15px] font-medium">{expectation.label}</h3>
                  <Badge tone="accent">{expectation.dimension}</Badge>
                  <Badge>from {LEVEL_LABELS[expectation.minLevel]}</Badge>
                </div>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">{expectation.expectation}</p>
                <p className="mt-3 rounded-lg bg-surface-sunken px-3 py-2 text-[13px] italic leading-relaxed">
                  “{expectation.examplePhrasing}”
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold tracking-tight">Length and density targets</h2>
        <div className="mt-5 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-surface-sunken text-[11px] uppercase tracking-[0.1em] text-subtle">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">Level</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Ideal words</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Pages</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Bullets / role</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Min metrics</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Benchmark p75</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {LEVEL_ORDER.map((level) => {
                const target = STRUCTURE_TARGETS[level];
                return (
                  <tr key={level}>
                    <td className="px-4 py-2.5 font-medium">{LEVEL_LABELS[level]}</td>
                    <td className="tabular px-4 py-2.5 text-muted">
                      {target.idealWords[0]}–{target.idealWords[1]}
                    </td>
                    <td className="tabular px-4 py-2.5 text-muted">{target.maxPages}</td>
                    <td className="tabular px-4 py-2.5 text-muted">
                      {target.minBulletsPerRole}–{target.maxBulletsPerRole}
                    </td>
                    <td className="tabular px-4 py-2.5 text-muted">{target.minMetrics}</td>
                    <td className="tabular px-4 py-2.5 text-muted">{BENCHMARKS[level].p75}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold tracking-tight">What the model deliberately does not do</h2>
        <ul className="mt-4 space-y-2.5 text-[14px] leading-relaxed text-muted">
          <li>It does not penalise employment gaps. Gaps are surfaced as a neutral observation with framing guidance.</li>
          <li>It does not reward long skill lists. An unevidenced skill counts as unsupported, not as coverage.</li>
          <li>It does not use a language model anywhere in the numeric score, so the score cannot drift between runs.</li>
          <li>It does not invent metrics in rewrites. Missing numbers become placeholder tokens with a prompt.</li>
          <li>It does not claim to reproduce any specific vendor&apos;s proprietary ranking algorithm.</li>
        </ul>
      </section>
    </div>
  );
}

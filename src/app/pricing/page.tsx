import { Check, Minus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Guest, Free, Pro and Coach plans for ATSense resume scanning and job-description tailoring.",
};

const PLANS = [
  {
    id: "guest",
    name: "Guest",
    price: "Free",
    cadence: "no account",
    summary: "One scan a day. Nothing stored.",
    cta: "Scan now",
    href: "/analyze",
    highlight: false,
    features: [
      ["Full six-pillar score", true],
      ["Top three findings", true],
      ["Spelling and grammar corrections", true],
      ["Parse preview", false],
      ["Job-description tailoring", false],
      ["Saved history", false],
    ],
  },
  {
    id: "free",
    name: "Free",
    price: "$0",
    cadence: "per month",
    summary: "Three scans a month with the complete report.",
    cta: "Create an account",
    href: "/analyze",
    highlight: false,
    features: [
      ["Full six-pillar score", true],
      ["Every finding with evidence", true],
      ["Spelling and grammar corrections", true],
      ["Parse preview", true],
      ["Job-description tailoring", false],
      ["Saved history (7 days)", true],
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$12",
    cadence: "per month",
    summary: "Unlimited scans, tailoring and version comparison.",
    cta: "Go Pro",
    href: "/analyze",
    highlight: true,
    features: [
      ["Everything in Free", true],
      ["Unlimited scans", true],
      ["Job-description tailoring and match rate", true],
      ["Keyword gap table with CSV export", true],
      ["Level-gap analysis", true],
      ["Version comparison and 1-year history", true],
    ],
  },
  {
    id: "coach",
    name: "Coach",
    price: "$39",
    cadence: "per month",
    summary: "Cohort workspaces for career services and bootcamps.",
    cta: "Talk to us",
    href: "/analyze",
    highlight: false,
    features: [
      ["Everything in Pro", true],
      ["Cohort workspaces", true],
      ["Batch upload", true],
      ["Aggregate cohort reporting", true],
      ["Shared rubric presets", true],
      ["Priority support", true],
    ],
  },
] as const;

export default function PricingPage() {
  return (
    <div className="shell py-14">
      <div className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Pricing</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Pay for tailoring, not for a score</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-muted">
          The full deterministic score is free forever, including every spelling and grammar correction. The
          paid tiers exist for people applying repeatedly and tailoring per requisition.
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={cn(
              "flex flex-col",
              plan.highlight && "border-accent shadow-[0_20px_60px_-40px_var(--glow)]",
            )}
          >
            <CardContent className="flex flex-1 flex-col p-5">
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-semibold">{plan.name}</h2>
                {plan.highlight ? <Badge tone="accent">Most popular</Badge> : null}
              </div>
              <p className="mt-3">
                <span className="text-3xl font-semibold tracking-tight">{plan.price}</span>{" "}
                <span className="text-[13px] text-subtle">{plan.cadence}</span>
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{plan.summary}</p>

              <ul className="mt-5 flex-1 space-y-2">
                {plan.features.map(([label, included]) => (
                  <li key={String(label)} className="flex items-start gap-2 text-[13px]">
                    {included ? (
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                    ) : (
                      <Minus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-subtle" />
                    )}
                    <span className={included ? "" : "text-subtle"}>{label}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={cn(
                  "mt-6 inline-flex h-10 items-center justify-center rounded-lg text-[13px] font-medium transition",
                  plan.highlight
                    ? "bg-accent text-accent-contrast hover:brightness-110"
                    : "border border-border-strong hover:bg-surface-raised",
                )}
              >
                {plan.cta}
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-8 text-[13px] leading-relaxed text-subtle">
        Plan quotas are enforced server-side and cannot be bypassed from the client. Downgrading preserves your
        stored analyses and restricts Pro features at the end of the billing period.
      </p>
    </div>
  );
}

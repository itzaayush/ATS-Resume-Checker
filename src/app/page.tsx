import {
  ArrowRight,
  BadgeCheck,
  Braces,
  FileSearch,
  Gauge,
  Layers,
  Quote,
  ScanLine,
  ShieldCheck,
  SpellCheck2,
  Target,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { HeroDocument } from "@/components/three/hero-document";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PILLARS } from "@/lib/ats/rubric";
import { STAGES } from "@/lib/ats/stages";

const ATS_PLATFORMS = [
  "Workday",
  "Greenhouse",
  "Lever",
  "Ashby",
  "iCIMS",
  "Taleo",
  "SuccessFactors",
  "SmartRecruiters",
  "Jobvite",
  "BambooHR",
];

const PILLAR_ICONS = [ScanLine, TrendingUp, Layers, Braces, Target, SpellCheck2];

const FAQ = [
  {
    q: "Is the score deterministic?",
    a: "Yes. Every pillar is computed by rules, not by a language model. The same file scored against the same rubric version always returns the same number, and the arithmetic is shown on the report.",
  },
  {
    q: "Why is my score lower here than on other checkers?",
    a: "Most checkers count keywords. We weight parseability and evidenced impact far more heavily, because those are what actually decide whether a resume survives the screen and the recruiter skim that follows it.",
  },
  {
    q: "Will you invent achievements for me?",
    a: "Never. Rewrites are built from your own words. Where a number is missing you get an explicit placeholder token and a prompt describing what to measure and where to find it.",
  },
  {
    q: "What happens to my file?",
    a: "A guest scan is processed in memory and discarded once the response is sent. No file is written to disk, no text is logged, and nothing is sent to a model provider.",
  },
  {
    q: "Does a high score guarantee an interview?",
    a: "No, and any tool that claims otherwise is selling you something. A high score means the document will be read correctly and reads convincingly. The rest is fit, timing and volume.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 grid-backdrop" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 aurora opacity-70" aria-hidden="true" />

        <div className="shell relative grid gap-12 pb-20 pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:pb-28 lg:pt-24">
          <div>
            <Badge tone="accent" className="mb-5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="pulse-ring absolute inline-flex h-full w-full rounded-full bg-accent" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              Deterministic rubric · no model in the score
            </Badge>

            <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[56px] xl:text-[64px]">
              Your resume is being read by a machine.{" "}
              <span className="text-accent">See what it reads.</span>
            </h1>

            <p className="mt-5 max-w-2xl text-pretty text-[16px] leading-relaxed text-muted xl:text-[17px]">
              ATSense rebuilds your document the way an applicant tracking system does — glyph positions,
              reading order, section buckets, date fields — then scores it on six weighted pillars with every
              point traced back to the line that caused it.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/analyze"
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-accent px-6 text-[15px] font-medium text-accent-contrast transition hover:brightness-110"
              >
                Scan my resume <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/scoring"
                className="inline-flex h-12 items-center gap-2 rounded-lg border border-border-strong px-6 text-[15px] font-medium transition hover:bg-surface-raised"
              >
                Read the scoring model
              </Link>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-subtle">
              <li className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> Nothing stored on a guest scan
              </li>
              <li className="inline-flex items-center gap-1.5">
                <BadgeCheck className="h-3.5 w-3.5" /> PDF, DOCX and TXT
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5" /> Report in seconds
              </li>
            </ul>
          </div>

          <div className="relative mx-auto aspect-[3/4] w-full max-w-[380px] xl:max-w-[460px]">
            <div className="absolute inset-0 rounded-3xl border border-border bg-surface-sunken/60 backdrop-blur-sm" />
            <div className="absolute inset-0 overflow-hidden rounded-3xl">
              <HeroDocument />
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------ platforms */}
        <div className="relative border-y border-border bg-surface-sunken/50 py-5">
          <p className="mb-3 text-center text-[11px] uppercase tracking-[0.16em] text-subtle">
            Tuned against the parsing behaviour of
          </p>
          <div className="relative overflow-hidden" aria-hidden="true">
            <div className="marquee flex w-max gap-10 px-5">              {[...ATS_PLATFORMS, ...ATS_PLATFORMS].map((name, index) => (
                <span key={`${name}-${index}`} className="text-[15px] font-medium text-subtle">
                  {name}
                </span>
              ))}
            </div>
          </div>
          <p className="sr-only">{ATS_PLATFORMS.join(", ")}</p>
        </div>
      </section>

      {/* --------------------------------------------------------- problem */}
      <section className="shell py-20">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">The problem</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            A keyword count is not a screening outcome
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            Most resume checkers tally words and call it a score. That is why a resume can read 92 on one tool
            and still be rejected without a screen. Screening fails for structural reasons long before it fails
            for keyword reasons.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "The parser lost half your resume",
              body: "Two columns interleave your sidebar with your experience. Table cells flatten out of order. A phone icon replaces the word “Phone”, so the number is stored under no label at all.",
              Icon: FileSearch,
            },
            {
              title: "Your dates never became a field",
              body: "Recruiters filter on years of experience. “Jan ’21 – Mar ’23” and “2021 – 2023” frequently import as nothing, which removes you from that filter entirely.",
              Icon: Braces,
            },
            {
              title: "Your bullets describe duties",
              body: "“Responsible for the payments service” tells a recruiter what your job title already told them. It carries no scale, no outcome and no evidence of ownership.",
              Icon: Quote,
            },
          ].map((item) => (
            <Card key={item.title}>
              <CardContent className="p-5">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-danger-soft text-danger">
                  <item.Icon className="h-4 w-4" />
                </span>
                <h3 className="mt-4 text-[15px] font-medium">{item.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{item.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- pillars */}
      <section className="border-y border-border bg-surface-sunken/40">
        <div className="shell py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">The rubric</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Six weighted pillars</h2>
              <p className="mt-4 text-[15px] leading-relaxed text-muted">
                Weights are published, versioned and immutable. Nothing about your score depends on a language
                model, so it cannot drift between runs.
              </p>
            </div>
            <Link href="/scoring" className="text-[13px] font-medium text-accent hover:underline">
              Full methodology →
            </Link>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((pillar, index) => {
              const Icon = PILLAR_ICONS[index] ?? ScanLine;
              return (
                <Card key={pillar.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-soft text-accent">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="tabular text-[13px] font-semibold text-accent">
                        {(pillar.weight * 100).toFixed(0)}%
                      </span>
                    </div>
                    <h3 className="mt-4 text-[15px] font-medium">{pillar.label}</h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-muted">{pillar.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- flow */}
      <section className="shell py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">The pipeline</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Seven stages, and the loader tells the truth about all of them
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              The scanning animation is bound to real server events streamed back as each phase completes. It is
              not a timer pretending to be progress. When motion is reduced or WebGL is unavailable, an
              equivalent DOM scanner runs with identical stage labels.
            </p>
            <Link
              href="/how-it-works"
              className="mt-6 inline-flex items-center gap-2 text-[14px] font-medium text-accent hover:underline"
            >
              How parsing actually works <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <ol className="space-y-2">
            {STAGES.map((stage, index) => (
              <li key={stage.id} className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3">
                <span className="tabular mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-surface-sunken text-[11px] font-semibold text-subtle">
                  {index + 1}
                </span>
                <div>
                  <p className="text-[14px] font-medium">{stage.label}</p>
                  <p className="text-[12px] text-muted">{stage.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------------- feature */}
      <section className="border-y border-border bg-surface-sunken/40">
        <div className="shell py-20">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="p-6">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
                  <SpellCheck2 className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-xl font-semibold tracking-tight">Spelling that understands engineering</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-muted">
                  A full English dictionary plus a curated technical vocabulary, so “Kubernetes” and “gRPC” are
                  never flagged while “acheived” and “manger” always are. On top of it: real-word confusions a
                  spell checker cannot see, tense consistency inside each role, repeated words, product-name
                  casing and cliché detection — each with the exact replacement.
                </p>
                <div className="mt-4 space-y-1.5 font-mono text-[12px]">
                  <p>
                    <span className="rounded bg-danger-soft px-1.5 py-0.5 text-danger line-through">acheived</span>{" "}
                    <span className="text-subtle">→</span>{" "}
                    <span className="rounded bg-success-soft px-1.5 py-0.5 text-success">achieved</span>
                  </p>
                  <p>
                    <span className="rounded bg-danger-soft px-1.5 py-0.5 text-danger line-through">Lead a team</span>{" "}
                    <span className="text-subtle">→</span>{" "}
                    <span className="rounded bg-success-soft px-1.5 py-0.5 text-success">Led a team</span>
                  </p>
                  <p>
                    <span className="rounded bg-danger-soft px-1.5 py-0.5 text-danger line-through">javascript</span>{" "}
                    <span className="text-subtle">→</span>{" "}
                    <span className="rounded bg-success-soft px-1.5 py-0.5 text-success">JavaScript</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
                  <Target className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-xl font-semibold tracking-tight">Tailoring that refuses to reward stuffing</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-muted">
                  Paste a posting and every requirement resolves through a skill taxonomy, so “k8s” matches
                  “Kubernetes” and “GCP” matches “Google Cloud Platform”. Each requirement lands in one of three
                  states, and a skill listed with nothing behind it is scored as unsupported — not as covered.
                </p>
                <div className="mt-4 space-y-1.5">
                  {[
                    { label: "Kubernetes", state: "Evidenced", tone: "success" as const },
                    { label: "Observability", state: "Listed only", tone: "warning" as const },
                    { label: "On-call ownership", state: "Missing", tone: "danger" as const },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between rounded-lg border border-border bg-surface-sunken px-3 py-2"
                    >
                      <span className="text-[13px]">{row.label}</span>
                      <Badge tone={row.tone}>{row.state}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- faq */}
      <section className="shell-narrow py-20">
        <h2 className="text-3xl font-semibold tracking-tight">Questions worth asking</h2>
        <div className="mt-8 divide-y divide-border border-y border-border">
          {FAQ.map((item) => (
            <details key={item.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium">
                {item.q}
                <span className="text-subtle transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-[14px] leading-relaxed text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- cta */}
      <section className="shell pb-8">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface-sunken px-6 py-14 text-center">
          <div className="pointer-events-none absolute inset-0 aurora opacity-60" aria-hidden="true" />
          <div className="relative">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Find out in the next sixty seconds
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-muted">
              No account, no card, no storage. Upload once and read the findings in the order they are worth
              fixing.
            </p>
            <Link
              href="/analyze"
              className="mt-7 inline-flex h-12 items-center gap-2 rounded-lg bg-accent px-7 text-[15px] font-medium text-accent-contrast transition hover:brightness-110"
            >
              Scan my resume <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

import type { Metadata } from "next";
import { AnalyzeWorkspace } from "@/components/analyze/analyze-workspace";

export const metadata: Metadata = {
  title: "Analyze a resume",
  description:
    "Upload a PDF, DOCX or TXT resume and get a deterministic six-pillar ATS score with evidence-linked findings, spelling corrections and job-description tailoring.",
};

export default function AnalyzePage() {
  return (
    <div className="shell py-10 sm:py-14">
      <header className="mb-8 max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Resume scan</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          See exactly what a screen sees
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Every score below is deterministic: the same file and the same rubric version always produce the same
          number, and every point is traceable to a named check.
        </p>
      </header>

      <AnalyzeWorkspace />
    </div>
  );
}

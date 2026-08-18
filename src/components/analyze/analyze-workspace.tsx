"use client";

import { AlertCircle, ArrowRight, Info, RotateCcw, ShieldCheck } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { ScanLoader } from "./scan-loader";
import { UploadDropzone } from "./upload-dropzone";
import { ReportView } from "@/components/report/report-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LEVEL_LABELS, LEVEL_ORDER, ROLE_PROFILES } from "@/lib/ats/rubric";
import type { AnalysisResult, AnalysisStage, DocumentValidation, SeniorityLevel } from "@/lib/ats/types";

type Phase = "idle" | "running" | "done" | "error";

interface FailureState {
  code: string;
  message: string;
  validation?: DocumentValidation;
}

export function AnalyzeWorkspace() {
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState("software-engineer");
  const [level, setLevel] = useState<SeniorityLevel | "auto">("auto");
  const [jobDescription, setJobDescription] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [stage, setStage] = useState<AnalysisStage>("upload");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [failure, setFailure] = useState<FailureState | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setPhase("idle");
    setResult(null);
    setFailure(null);
    setWarnings([]);
    setStage("upload");
  }, []);

  const run = useCallback(async () => {
    if (!file) return;

    const controller = new AbortController();
    abortRef.current = controller;

    setPhase("running");
    setStage("upload");
    setFailure(null);
    setResult(null);
    setWarnings([]);

    const form = new FormData();
    form.append("resume", file);
    form.append("targetRole", role);
    form.append("targetLevel", level);
    if (jobDescription.trim()) form.append("jobDescription", jobDescription);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: form,
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        setFailure({
          code: payload?.code ?? "REQUEST_FAILED",
          message: payload?.message ?? "The request failed before analysis started.",
        });
        setPhase("error");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newline = buffer.indexOf("\n");
        while (newline !== -1) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          newline = buffer.indexOf("\n");
          if (!line) continue;

          const event = JSON.parse(line) as
            | { type: "stage"; stage: AnalysisStage }
            | { type: "result"; result: AnalysisResult; warnings: string[] }
            | { type: "error"; code: string; message: string; validation?: DocumentValidation };

          if (event.type === "stage") setStage(event.stage);
          if (event.type === "result") {
            setResult(event.result);
            setWarnings(event.warnings ?? []);
            setPhase("done");
          }
          if (event.type === "error") {
            setFailure({ code: event.code, message: event.message, validation: event.validation });
            setPhase("error");
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setFailure({
        code: "NETWORK",
        message: "The connection dropped during analysis. Your file was not stored. Try again.",
      });
      setPhase("error");
    }
  }, [file, role, level, jobDescription]);

  if (phase === "running") {
    return (
      <Card>
        <CardContent className="p-6 sm:p-8">
          <ScanLoader stage={stage} fileName={file?.name} />
          <div className="mt-8 flex justify-center">
            <Button variant="ghost" size="sm" onClick={reset}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (phase === "done" && result) {
    return (
      <div className="space-y-6">
        {warnings.map((warning) => (
          <div
            key={warning}
            className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-[13px] leading-relaxed text-warning"
          >
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{warning}</p>
          </div>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Analysis report</h1>
            <p className="text-[13px] text-muted">
              {result.fileName} · {new Date(result.analyzedAt).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => window.print()}>
              Export report
            </Button>
            <Button variant="outline" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" /> New scan
            </Button>
          </div>
        </div>

        <ReportView result={result} />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-start">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>1 · Upload your resume</CardTitle>
            <CardDescription>
              Guest scans are processed in memory and discarded when the response is sent. Nothing is stored and
              nothing is sent to a model provider.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <UploadDropzone file={file} onFile={setFile} />

            {failure ? (
              <div
                role="alert"
                className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3.5 text-[13px] leading-relaxed text-danger"
              >
                <p className="flex items-start gap-2 font-medium">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {failure.message}
                </p>
                {failure.validation ? (
                  <ul className="mt-3 space-y-1.5">
                    {failure.validation.signals.map((signal) => (
                      <li key={signal.id} className="flex items-start gap-2">
                        <Badge tone={signal.passed ? "success" : "danger"}>{signal.passed ? "pass" : "fail"}</Badge>
                        <span className="text-foreground/80">
                          <span className="font-medium">{signal.label}:</span> {signal.detail}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="mt-3 font-mono text-[11px] opacity-70">{failure.code}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card id="job-description">
          <CardHeader>
            <CardTitle>3 · Paste a job description (optional)</CardTitle>
            <CardDescription>
              Adding a posting switches on match rate, the keyword gap table and a prioritised tailoring plan.
              Paste at least 200 characters.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <label htmlFor="jd" className="sr-only">
              Job description
            </label>
            <textarea
              id="jd"
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              rows={9}
              placeholder="Paste the full posting: responsibilities, minimum qualifications and preferred qualifications."
              className="w-full resize-y rounded-xl border border-border bg-surface-raised px-3.5 py-3 text-[13px] leading-relaxed outline-none transition focus:border-accent"
            />
            <p className="flex items-center gap-1.5 text-[12px] text-subtle">
              <Info className="h-3 w-3" />
              {jobDescription.trim().length} characters. Posting text is treated strictly as data, never as an
              instruction.
            </p>
          </CardContent>
        </Card>

        <Button size="lg" className="w-full" disabled={!file} onClick={run}>
          Run the analysis <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <Card className="lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle>2 · Target role and level</CardTitle>
          <CardDescription>
            Expectations differ sharply by level. Scoring the same resume against SDE I and Senior produces
            deliberately different results.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <label htmlFor="role" className="text-[12px] font-medium text-muted">
              Role family
            </label>
            <select
              id="role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-[13px] outline-none transition focus:border-accent"
            >
              {ROLE_PROFILES.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="level" className="text-[12px] font-medium text-muted">
              Target level
            </label>
            <select
              id="level"
              value={level}
              onChange={(event) => setLevel(event.target.value as SeniorityLevel | "auto")}
              className="mt-1.5 w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-[13px] outline-none transition focus:border-accent"
            >
              <option value="auto">Infer from my resume</option>
              {LEVEL_ORDER.map((value) => (
                <option key={value} value={value}>
                  {LEVEL_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border border-border bg-surface-sunken px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">
              What gets checked
            </p>
            <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-muted">
              <li>Reading order, tables, fonts, bullet glyphs and date parsing</li>
              <li>Quantified impact, verb strength and responsibility language</li>
              <li>Skills that are listed versus skills that are evidenced</li>
              <li>Spelling, grammar, tense consistency and clichés</li>
              <li>Scope, ownership and influence signals for your level</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

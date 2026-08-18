import { analyzeLanguage } from "./language";
import { matchResumeToJob, parseJobDescription } from "./job-match";
import { parseResume } from "./parser";
import { buildRewrites } from "./rewrite";
import { BENCHMARKS, DEFAULT_ROLE_ID, RUBRIC_VERSION } from "./rubric";
import { bandFor, scoreResume } from "./scoring";
import { hashString } from "./text-utils";
import type {
  AnalysisResult,
  AnalysisStage,
  DocumentValidation,
  LayoutSignals,
  SeniorityLevel,
  StructuredResume,
} from "./types";

export interface AnalyzeOptions {
  text: string;
  layout: Partial<LayoutSignals>;
  fileName: string;
  targetRoleId?: string;
  targetLevel?: SeniorityLevel | "auto";
  jobDescription?: string | null;
  /** Called as each pipeline phase actually completes, so the UI never fakes progress. */
  onStage?: (stage: AnalysisStage) => void | Promise<void>;
}

export interface AnalyzeOutcome {
  ok: true;
  result: AnalysisResult;
  cacheKey: string;
}

export interface AnalyzeRejection {
  ok: false;
  validation: DocumentValidation;
}

export async function analyzeResume(options: AnalyzeOptions): Promise<AnalyzeOutcome | AnalyzeRejection> {
  const emit = async (stage: AnalysisStage) => {
    await options.onStage?.(stage);
  };

  const resume = parseResume({ text: options.text, layout: options.layout });
  const validation = validateDocument(resume);
  await emit("structure");

  if (!validation.isResume) {
    return { ok: false, validation };
  }

  const targetRoleId = options.targetRoleId ?? DEFAULT_ROLE_ID;
  const targetLevel: SeniorityLevel =
    !options.targetLevel || options.targetLevel === "auto" ? resume.inferredLevel : options.targetLevel;

  const language = await analyzeLanguage(resume);
  await emit("language");

  const { pillars, overallScore, findings, levelSignals, stats } = scoreResume({
    resume,
    language,
    targetRoleId,
    targetLevel,
  });
  await emit("score");

  const rewrites = buildRewrites(resume, 8);

  let jobMatch = null;
  if (options.jobDescription && options.jobDescription.trim().length > 0) {
    const jd = parseJobDescription(sanitizeUntrustedText(options.jobDescription));
    jobMatch = jd.isJobDescription ? matchResumeToJob(resume, jd) : { ...emptyMatch(jd) };
  }
  await emit("match");

  const { band, interpretation } = bandFor(overallScore);

  const result: AnalysisResult = {
    rubricVersion: RUBRIC_VERSION,
    analyzedAt: new Date().toISOString(),
    fileName: options.fileName,
    overallScore,
    band,
    interpretation,
    pillars,
    findings,
    spelling: language.issues,
    resume,
    validation,
    targetRole: targetRoleId,
    targetLevel,
    levelSignals,
    rewrites,
    jobMatch,
    benchmark: BENCHMARKS[targetLevel],
    stats,
  };

  const cacheKey = hashString(
    `${RUBRIC_VERSION}|${hashString(resume.normalizedText)}|${targetRoleId}|${targetLevel}|${hashString(options.jobDescription ?? "")}`,
  );

  await emit("insights");

  return { ok: true, result, cacheKey };
}

function emptyMatch(jd: ReturnType<typeof parseJobDescription>) {
  return {
    matchScore: 0,
    titleMatch: 0,
    requiredCoverage: 0,
    preferredCoverage: 0,
    responsibilityAlignment: 0,
    gaps: [],
    stuffedTerms: [],
    jd,
    plan: [],
  };
}

/**
 * Document classification.
 *
 * The prototype accepted anything with an email and the word "skills". Real screening
 * needs to fail closed on invoices, cover letters and transcripts, so we require several
 * independent structural signals rather than a single keyword hit.
 */
export function validateDocument(resume: StructuredResume): DocumentValidation {
  const wordCount = resume.layout.wordCount;
  const canonicalSections = resume.sections.filter(
    (s) => s.heading && ["experience", "education", "skills", "projects", "summary", "certifications"].includes(s.id),
  );
  const uniqueSections = new Set(canonicalSections.map((s) => s.id));

  const hasContact = Boolean(resume.contact.email || resume.contact.phone || resume.contact.linkedin);
  const hasSections = uniqueSections.size >= 2;
  const hasVolume = wordCount >= 120;
  const hasEntities =
    resume.experience.length + resume.education.length + resume.projects.length >= 1 ||
    resume.skills.length >= 5;
  const hasDates = resume.experience.some((e) => e.dates?.startYear) || resume.education.some((e) => e.dates);

  const signals = [
    {
      id: "contact",
      label: "Contact block",
      passed: hasContact,
      detail: hasContact ? "Found an email, phone number or LinkedIn URL." : "No email, phone number or LinkedIn URL was found.",
    },
    {
      id: "sections",
      label: "Canonical sections",
      passed: hasSections,
      detail: hasSections
        ? `Found ${uniqueSections.size} standard sections: ${Array.from(uniqueSections).join(", ")}.`
        : "Fewer than two standard resume sections were detected.",
    },
    {
      id: "volume",
      label: "Minimum content",
      passed: hasVolume,
      detail: `${wordCount} words extracted (minimum 120).`,
    },
    {
      id: "entities",
      label: "Structured entities",
      passed: hasEntities,
      detail: hasEntities
        ? `Parsed ${resume.experience.length} roles, ${resume.education.length} education entries and ${resume.skills.length} skills.`
        : "No roles, education entries or recognisable skills could be parsed.",
    },
    {
      id: "dates",
      label: "Dated history",
      passed: hasDates,
      detail: hasDates ? "At least one dated entry was found." : "No dated entries were found.",
    },
  ];

  const passed = signals.filter((s) => s.passed).length;
  const isResume = hasContact && hasSections && hasVolume && hasEntities;
  const confidence = passed / signals.length;

  return {
    isResume,
    confidence,
    signals,
    reason: isResume
      ? undefined
      : "This document does not have the structure of a resume. The signals below explain what was missing.",
  };
}

/**
 * Resume and job-description text is untrusted input. It is never interpreted as an
 * instruction anywhere in this codebase; this strips the control sequences that would
 * otherwise be used to attempt prompt injection if the text is later handed to a model.
 */
export function sanitizeUntrustedText(input: string): string {
  return input
    .replace(/\u0000/g, "")
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, "")
    .slice(0, 40_000);
}

const INJECTION_PATTERNS = [
  /ignore (?:all )?(?:previous|prior|above) instructions?/i,
  /disregard (?:the )?(?:previous|prior|above)/i,
  /you are (?:now )?a[n]? (?:helpful )?(?:assistant|ai|system)/i,
  /system prompt/i,
  /return (?:a )?(?:score of )?100/i,
  /rate this resume (?:as )?(?:perfect|100)/i,
  /<\|.*?\|>/,
];

export function detectInjectionAttempt(text: string): string[] {
  return INJECTION_PATTERNS.filter((p) => p.test(text)).map((p) => p.source);
}

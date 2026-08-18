/**
 * ATSense scoring engine — shared type contracts.
 * Rubric output is deterministic: same input + same rubric version => same score.
 */

export type PillarId =
  | "parseability"
  | "content_impact"
  | "skills_keywords"
  | "structure_consistency"
  | "role_alignment"
  | "hygiene_language";

export type Severity = "critical" | "important" | "polish";
export type CheckStatus = "pass" | "partial" | "fail";

export interface EvidenceSpan {
  /** Raw text quoted from the resume that triggered the check. */
  text: string;
  /** Character offset into the normalized resume text, -1 when the finding is a missing section. */
  start: number;
  end: number;
  section?: SectionId;
}

export interface CheckResult {
  id: string;
  pillar: PillarId;
  label: string;
  status: CheckStatus;
  /** Points awarded out of `max`. */
  points: number;
  max: number;
  severity: Severity;
  /** Why the check landed where it did. */
  reason: string;
  /** Concrete, copy-ready remediation. */
  fix?: string;
  evidence: EvidenceSpan[];
}

export interface PillarResult {
  id: PillarId;
  label: string;
  description: string;
  /** 0-100 normalized pillar score. */
  score: number;
  /** Points this pillar contributes to the overall 0-100 score. */
  contribution: number;
  weight: number;
  earned: number;
  max: number;
  checks: CheckResult[];
}

export type SectionId =
  | "contact"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "awards"
  | "publications"
  | "volunteer"
  | "languages"
  | "interests"
  | "references"
  | "unknown";

export interface ResumeBullet {
  text: string;
  start: number;
  end: number;
  /** Index of the owning experience/project entry, -1 when orphaned. */
  entryIndex: number;
  section: SectionId;
}

export interface DateRange {
  raw: string;
  startMonth: number | null;
  startYear: number | null;
  endMonth: number | null;
  endYear: number | null;
  isCurrent: boolean;
  /** Parsed duration in months, null when undeterminable. */
  months: number | null;
  formatStyle: DateFormatStyle | null;
}

export type DateFormatStyle =
  | "MonthYear"
  | "MM/YYYY"
  | "YearOnly"
  | "ApostropheYear"
  | "MM/DD/YYYY"
  | "Unknown";

export interface ExperienceEntry {
  raw: string;
  title: string | null;
  company: string | null;
  location: string | null;
  dates: DateRange | null;
  bullets: ResumeBullet[];
  start: number;
  end: number;
  confidence: number;
}

export interface EducationEntry {
  raw: string;
  degree: string | null;
  institution: string | null;
  dates: DateRange | null;
  gpa: number | null;
  confidence: number;
}

export interface ContactBlock {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
  github: string | null;
  website: string | null;
  headline: string | null;
}

export interface SkillMention {
  /** Canonical taxonomy name, e.g. "Kubernetes". */
  canonical: string;
  /** The literal surface form found in the resume, e.g. "k8s". */
  surface: string;
  category: string;
  /** Where the skill was observed. */
  inSkillsSection: boolean;
  inExperience: boolean;
  inProjects: boolean;
  inSummary: boolean;
  occurrences: number;
}

export interface ParsedSection {
  id: SectionId;
  heading: string | null;
  headingIsCanonical: boolean;
  start: number;
  end: number;
  body: string;
  lines: string[];
}

export interface LayoutSignals {
  pageCount: number;
  wordCount: number;
  charCount: number;
  hasTextLayer: boolean;
  usedOcr: boolean;
  /** Heuristic: multi-column reading order likely scrambled. */
  multiColumnSuspected: boolean;
  columnEvidence: string[];
  tableSuspected: boolean;
  glyphCorruption: number;
  nonStandardBulletChars: string[];
  emojiOrIconChars: string[];
  imageOnlyPages: number;
  headerFooterSuspected: boolean;
  excessiveWhitespaceRuns: number;
  fonts: string[];
  unsafeFonts: string[];
  producer: string | null;
  encrypted: boolean;
}

export interface SpellingIssue {
  word: string;
  start: number;
  end: number;
  suggestions: string[];
  kind: "spelling" | "confusable" | "grammar" | "style" | "duplication" | "punctuation" | "casing";
  message: string;
  context: string;
  severity: Severity;
}

export interface Finding {
  id: string;
  pillar: PillarId;
  severity: Severity;
  title: string;
  reason: string;
  fix: string;
  /** Points recoverable by resolving this finding. */
  pointsAtStake: number;
  evidence: EvidenceSpan[];
}

export type CoverageState = "covered" | "weak" | "missing";

export interface KeywordGapRow {
  requirement: string;
  canonical: string;
  category: string;
  importance: "required" | "preferred" | "mentioned";
  weight: number;
  state: CoverageState;
  matchedAlias: string | null;
  evidence: EvidenceSpan[];
  /** Where the user should add or evidence this term. */
  suggestedSection: SectionId;
  note: string;
}

export interface LevelSignal {
  id: string;
  dimension: "scope" | "ownership" | "ambiguity" | "depth" | "influence" | "impact";
  label: string;
  expectation: string;
  state: "present" | "partial" | "absent";
  evidence: EvidenceSpan[];
  examplePhrasing: string;
}

export interface JobDescriptionParse {
  title: string | null;
  company: string | null;
  seniority: SeniorityLevel;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  yearsRequired: number | null;
  domain: string | null;
  isJobDescription: boolean;
  rejectionReason?: string;
}

export type SeniorityLevel = "intern" | "entry" | "mid" | "senior" | "staff" | "principal";

export interface JobMatchResult {
  matchScore: number;
  titleMatch: number;
  requiredCoverage: number;
  preferredCoverage: number;
  responsibilityAlignment: number;
  gaps: KeywordGapRow[];
  stuffedTerms: string[];
  jd: JobDescriptionParse;
  plan: TailoringAction[];
}

export interface TailoringAction {
  id: string;
  priority: number;
  title: string;
  detail: string;
  projectedDelta: number;
  targetSection: SectionId;
}

export interface BulletRewrite {
  original: string;
  concise: string;
  standard: string;
  metricsHeavy: string;
  /** Tokens the user must fill in — we never invent numbers. */
  placeholders: { token: string; prompt: string }[];
  issues: string[];
}

export interface StructuredResume {
  contact: ContactBlock;
  sections: ParsedSection[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: SkillMention[];
  projects: ExperienceEntry[];
  certifications: string[];
  bullets: ResumeBullet[];
  rawText: string;
  normalizedText: string;
  layout: LayoutSignals;
  inferredLevel: SeniorityLevel;
  inferredLevelSignals: string[];
  totalExperienceMonths: number | null;
}

export interface DocumentValidation {
  isResume: boolean;
  confidence: number;
  signals: { id: string; label: string; passed: boolean; detail: string }[];
  reason?: string;
}

export interface AnalysisResult {
  rubricVersion: string;
  analyzedAt: string;
  fileName: string;
  overallScore: number;
  band: ScoreBand;
  interpretation: string;
  pillars: PillarResult[];
  findings: Finding[];
  spelling: SpellingIssue[];
  resume: StructuredResume;
  validation: DocumentValidation;
  targetRole: string;
  targetLevel: SeniorityLevel;
  levelSignals: LevelSignal[];
  rewrites: BulletRewrite[];
  jobMatch: JobMatchResult | null;
  benchmark: { p50: number; p75: number; p90: number };
  stats: ResumeStats;
}

export interface ResumeStats {
  wordCount: number;
  bulletCount: number;
  quantifiedBullets: number;
  actionVerbBullets: number;
  weakVerbBullets: number;
  uniqueActionVerbs: number;
  avgBulletWords: number;
  skillCount: number;
  evidencedSkillCount: number;
  readingTimeSeconds: number;
  pageEstimate: number;
}

export type ScoreBand = "excellent" | "strong" | "fair" | "at_risk";

export type AnalysisStage =
  | "upload"
  | "extract"
  | "structure"
  | "language"
  | "score"
  | "match"
  | "insights"
  | "done";

import type { LanguageReport } from "./language";
import {
  ALL_STRONG_VERBS,
  BULLET_LENGTH,
  DEFAULT_ROLE_ID,
  IMPACT_NOUNS,
  LEVEL_EXPECTATIONS,
  LEVEL_ORDER,
  METRIC_PATTERNS,
  PILLARS,
  ROLE_PROFILES,
  STRUCTURE_TARGETS,
  WEAK_OPENERS,
} from "./rubric";
import { resolveSkill } from "./taxonomy";
import { clamp, contextAround, round, uniqueBy, words } from "./text-utils";
import type {
  CheckResult,
  CheckStatus,
  EvidenceSpan,
  Finding,
  LevelSignal,
  PillarId,
  PillarResult,
  ResumeStats,
  Severity,
  SeniorityLevel,
  StructuredResume,
} from "./types";

export interface ScoreInput {
  resume: StructuredResume;
  language: LanguageReport;
  targetRoleId: string;
  targetLevel: SeniorityLevel;
}

export interface ScoreOutput {
  pillars: PillarResult[];
  overallScore: number;
  findings: Finding[];
  levelSignals: LevelSignal[];
  stats: ResumeStats;
}

interface Builder {
  pillar: PillarId;
  checks: CheckResult[];
  add: (check: Omit<CheckResult, "pillar">) => void;
}

function builder(pillar: PillarId): Builder {
  const checks: CheckResult[] = [];
  return {
    pillar,
    checks,
    add: (check) => checks.push({ ...check, pillar }),
  };
}

function statusFor(ratio: number): CheckStatus {
  if (ratio >= 0.999) return "pass";
  if (ratio <= 0.001) return "fail";
  return "partial";
}

function span(text: string, start: number, end: number, section?: EvidenceSpan["section"]): EvidenceSpan {
  return { text: contextAround(text, start, end, 30), start, end, section };
}

const MISSING: EvidenceSpan[] = [];

export function scoreResume(input: ScoreInput): ScoreOutput {
  const stats = computeStats(input.resume);
  const levelSignals = evaluateLevelSignals(input.resume, input.targetLevel);

  const pillarBuilders: Record<PillarId, Builder> = {
    parseability: scoreParseability(input),
    content_impact: scoreContentImpact(input, stats),
    skills_keywords: scoreSkills(input, stats),
    structure_consistency: scoreStructure(input, stats),
    role_alignment: scoreAlignment(input, levelSignals),
    hygiene_language: scoreHygiene(input),
  };

  const pillars: PillarResult[] = PILLARS.map((config) => {
    const checks = pillarBuilders[config.id].checks;
    const earned = checks.reduce((sum, c) => sum + c.points, 0);
    const max = checks.reduce((sum, c) => sum + c.max, 0) || 1;
    const score = clamp(round((earned / max) * 100, 1));
    return {
      id: config.id,
      label: config.label,
      description: config.description,
      score,
      contribution: round(score * config.weight, 2),
      weight: config.weight,
      earned: round(earned, 2),
      max: round(max, 2),
      checks,
    };
  });

  const overallScore = Math.round(
    clamp(pillars.reduce((sum, p) => sum + p.contribution, 0)),
  );

  const findings = buildFindings(pillars);

  return { pillars, overallScore, findings, levelSignals, stats };
}

/* ------------------------------------------------------------- statistics */

export function computeStats(resume: StructuredResume): ResumeStats {
  const bullets = resume.bullets;
  const quantified = bullets.filter((b) => countMetrics(b.text) > 0).length;
  const verbStarts = bullets.filter((b) => startsWithStrongVerb(b.text));
  const weak = bullets.filter((b) => matchWeakOpener(b.text) !== null).length;
  const uniqueVerbs = new Set(
    verbStarts.map((b) => b.text.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, "")),
  );
  const totalWords = bullets.reduce((sum, b) => sum + words(b.text).length, 0);
  const evidenced = resume.skills.filter((s) => s.inExperience || s.inProjects).length;
  const wordCount = resume.layout.wordCount;

  return {
    wordCount,
    bulletCount: bullets.length,
    quantifiedBullets: quantified,
    actionVerbBullets: verbStarts.length,
    weakVerbBullets: weak,
    uniqueActionVerbs: uniqueVerbs.size,
    avgBulletWords: bullets.length ? round(totalWords / bullets.length, 1) : 0,
    skillCount: resume.skills.length,
    evidencedSkillCount: evidenced,
    readingTimeSeconds: Math.round((wordCount / 240) * 60),
    pageEstimate: resume.layout.pageCount,
  };
}

export function countMetrics(text: string): number {
  let total = 0;
  for (const pattern of METRIC_PATTERNS) {
    const re = new RegExp(pattern.pattern.source, pattern.pattern.flags);
    const matches = text.match(re);
    if (matches) total += matches.length;
  }
  return total;
}

export function startsWithStrongVerb(text: string): boolean {
  const first = text.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z-]/g, "") ?? "";
  return ALL_STRONG_VERBS.has(first);
}

export function matchWeakOpener(text: string): (typeof WEAK_OPENERS)[number] | null {
  const trimmed = text.trim();
  for (const opener of WEAK_OPENERS) {
    if (opener.pattern.test(trimmed)) return opener;
  }
  return null;
}

function hasImpactNoun(text: string): boolean {
  const lower = text.toLowerCase();
  return IMPACT_NOUNS.some((noun) => lower.includes(noun));
}

/* ----------------------------------------------------------- parseability */

function scoreParseability({ resume }: ScoreInput): Builder {
  const b = builder("parseability");
  const { layout, sections, normalizedText, contact } = resume;

  const textLayerRatio = layout.usedOcr ? 0.35 : layout.hasTextLayer ? 1 : 0;
  b.add({
    id: "parse.text-layer",
    label: "Machine-readable text layer",
    status: statusFor(textLayerRatio),
    points: 12 * textLayerRatio,
    max: 12,
    severity: "critical",
    reason: layout.usedOcr
      ? "Your file has no selectable text, so it had to be read with OCR. Most applicant tracking systems do not run OCR and will import a blank record."
      : layout.hasTextLayer
        ? "Text extracts cleanly without OCR."
        : "No text could be extracted from this document.",
    fix: layout.usedOcr || !layout.hasTextLayer
      ? "Re-export from your source document as a text-based PDF (File → Save as PDF), never as a scan or an exported image."
      : undefined,
    evidence: MISSING,
  });

  const columnRatio = layout.multiColumnSuspected ? 0 : 1;
  b.add({
    id: "parse.single-column",
    label: "Single-column reading order",
    status: statusFor(columnRatio),
    points: 14 * columnRatio,
    max: 14,
    severity: "critical",
    reason: layout.multiColumnSuspected
      ? "A multi-column layout was detected. Parsers read left-to-right across the page, which interleaves your sidebar with your experience and scrambles both."
      : "Content reads top-to-bottom in a single column.",
    fix: layout.multiColumnSuspected
      ? "Rebuild on a single-column template. Move any sidebar content (skills, contact, links) into the main flow."
      : undefined,
    evidence: layout.columnEvidence.map((text) => ({ text, start: -1, end: -1 })).slice(0, 3),
  });

  const tableRatio = layout.tableSuspected ? 0 : 1;
  b.add({
    id: "parse.no-tables",
    label: "No tables or text boxes",
    status: statusFor(tableRatio),
    points: 10 * tableRatio,
    max: 10,
    severity: "critical",
    reason: layout.tableSuspected
      ? "Table or text-box structures were detected. Many parsers flatten table cells in the wrong order or skip them entirely."
      : "No table or text-box structures detected.",
    fix: layout.tableSuspected ? "Replace tables with plain paragraphs and bullet lists." : undefined,
    evidence: MISSING,
  });

  const bulletRatio = layout.nonStandardBulletChars.length === 0 ? 1 : Math.max(0, 1 - layout.nonStandardBulletChars.length * 0.34);
  b.add({
    id: "parse.standard-bullets",
    label: "Standard bullet glyphs",
    status: statusFor(bulletRatio),
    points: 6 * bulletRatio,
    max: 6,
    severity: "important",
    reason: layout.nonStandardBulletChars.length
      ? `Decorative bullet characters (${layout.nonStandardBulletChars.join(" ")}) often import as question marks or random letters.`
      : "Bullet characters are parser-safe.",
    fix: layout.nonStandardBulletChars.length ? "Use a plain round bullet (•) or a hyphen for every list item." : undefined,
    evidence: MISSING,
  });

  const iconRatio = layout.emojiOrIconChars.length === 0 ? 1 : 0;
  b.add({
    id: "parse.no-icons",
    label: "No icon or emoji characters",
    status: statusFor(iconRatio),
    points: 6 * iconRatio,
    max: 6,
    severity: "important",
    reason: layout.emojiOrIconChars.length
      ? `Icon glyphs were found (${layout.emojiOrIconChars.slice(0, 6).join(" ")}). A phone icon instead of the word "Phone" means the parser stores your number under no label at all.`
      : "No icon fonts or emoji detected.",
    fix: layout.emojiOrIconChars.length ? 'Replace icons with words: "Phone:", "Email:", "LinkedIn:".' : undefined,
    evidence: MISSING,
  });

  const corruptionRatio = clamp(1 - layout.glyphCorruption / 12, 0, 1);
  b.add({
    id: "parse.glyph-integrity",
    label: "Glyph integrity",
    status: statusFor(corruptionRatio),
    points: 8 * corruptionRatio,
    max: 8,
    severity: layout.glyphCorruption > 4 ? "critical" : "polish",
    reason: layout.glyphCorruption
      ? `${layout.glyphCorruption} suspicious character sequences were found, which usually means a non-embedded or decorative font is degrading on extraction.`
      : "Characters extracted cleanly with no substitution artefacts.",
    fix: layout.glyphCorruption
      ? "Switch to a web-safe font (Arial, Calibri, Georgia, Helvetica, Garamond) and re-export."
      : undefined,
    evidence: MISSING,
  });

  const headings = sections.filter((s) => s.heading);
  const canonicalHeadings = headings.filter((s) => s.headingIsCanonical);
  const headingRatio = headings.length ? canonicalHeadings.length / headings.length : 0;
  const creative = headings.filter((s) => !s.headingIsCanonical);
  b.add({
    id: "parse.canonical-headings",
    label: "Standard section headings",
    status: statusFor(headingRatio),
    points: 14 * headingRatio,
    max: 14,
    severity: "critical",
    reason: creative.length
      ? `${creative.length} heading(s) use non-standard wording (${creative.map((c) => `"${c.heading}"`).join(", ")}). Parsers bucket content by matching heading text, so creative titles push your work into the wrong field or drop it.`
      : headings.length
        ? "All detected headings use wording an applicant tracking system recognises."
        : "No section headings were detected at all.",
    fix: creative.length || !headings.length
      ? 'Use exactly these words: "Work Experience", "Education", "Skills", "Projects", "Certifications".'
      : undefined,
    evidence: creative.map((c) => span(normalizedText, c.start, c.start + (c.heading?.length ?? 0), c.id)),
  });

  const required: { id: "experience" | "education" | "skills"; label: string }[] = [
    { id: "experience", label: "Work Experience" },
    { id: "education", label: "Education" },
    { id: "skills", label: "Skills" },
  ];
  const present = required.filter((r) => sections.some((s) => s.id === r.id));
  const sectionRatio = present.length / required.length;
  b.add({
    id: "parse.essential-sections",
    label: "Essential sections detected",
    status: statusFor(sectionRatio),
    points: 12 * sectionRatio,
    max: 12,
    severity: "critical",
    reason: `${present.length} of ${required.length} essential sections were detected${
      present.length < required.length
        ? `. Missing: ${required.filter((r) => !present.includes(r)).map((r) => r.label).join(", ")}.`
        : "."
    }`,
    fix: present.length < required.length ? "Add the missing sections with their standard headings." : undefined,
    evidence: MISSING,
  });

  const contactPosition = contact.email ? normalizedText.indexOf(contact.email) : -1;
  const contactInBody = contact.email !== null && contactPosition >= 0 && contactPosition < normalizedText.length * 0.2;
  b.add({
    id: "parse.contact-in-body",
    label: "Contact details in the document body",
    status: contactInBody ? "pass" : contact.email ? "partial" : "fail",
    points: contactInBody ? 8 : contact.email ? 4 : 0,
    max: 8,
    severity: "critical",
    reason: contactInBody
      ? "Contact details sit at the top of the main text flow where every parser will find them."
      : contact.email
        ? "Contact details were found, but not at the top of the document. If they live in a header, footer or text box, most parsers will not import them."
        : "No email address was found in the extracted text.",
    fix: contactInBody ? undefined : "Move your name, phone, email and links into the first lines of the document body.",
    evidence: contact.email && contactPosition >= 0 ? [span(normalizedText, contactPosition, contactPosition + contact.email.length, "contact")] : MISSING,
  });

  const datedEntries = resume.experience.filter((e) => e.dates?.startYear).length;
  const dateRatio = resume.experience.length ? datedEntries / resume.experience.length : 0;
  b.add({
    id: "parse.date-extraction",
    label: "Dates parse on every role",
    status: statusFor(dateRatio),
    points: 14 * dateRatio,
    max: 14,
    severity: "critical",
    reason: resume.experience.length
      ? `${datedEntries} of ${resume.experience.length} roles produced a machine-readable date range. Recruiters filter on years of experience, and an unparsed date means you are excluded from that filter.`
      : "No dated roles were found.",
    fix: dateRatio < 1 ? 'Write every range as "Mar 2022 – Present" or "03/2022 – 01/2024". Never use apostrophe years (\'22) or a bare year.' : undefined,
    evidence: resume.experience
      .filter((e) => !e.dates?.startYear)
      .slice(0, 3)
      .map((e) => span(normalizedText, e.start, e.end, "experience")),
  });

  const pageTarget = layout.pageCount <= 2 ? 1 : layout.pageCount === 3 ? 0.5 : 0;
  b.add({
    id: "parse.page-count",
    label: "Reasonable page count",
    status: statusFor(pageTarget),
    points: 6 * pageTarget,
    max: 6,
    severity: "polish",
    reason: `Estimated ${layout.pageCount} page(s) from the extracted text volume.`,
    fix: pageTarget < 1 ? "Trim to two pages; recruiters skim the first page and rarely reach a third." : undefined,
    evidence: MISSING,
  });

  return b;
}

/* --------------------------------------------------------- content & impact */

function scoreContentImpact({ resume, targetLevel }: ScoreInput, stats: ResumeStats): Builder {
  const b = builder("content_impact");
  const text = resume.normalizedText;
  const bullets = resume.bullets;
  const targets = STRUCTURE_TARGETS[targetLevel];

  const quantRatio = bullets.length ? stats.quantifiedBullets / bullets.length : 0;
  // Recruiters expect roughly half of all bullets to carry a number.
  const quantScore = clamp(quantRatio / 0.5, 0, 1);
  b.add({
    id: "content.quantified-bullets",
    label: "Quantified achievements",
    status: statusFor(quantScore),
    points: 25 * quantScore,
    max: 25,
    severity: "critical",
    reason: bullets.length
      ? `${stats.quantifiedBullets} of ${bullets.length} bullets (${Math.round(quantRatio * 100)}%) contain a number. Target is 50% or more.`
      : "No bullet points were detected to evaluate.",
    fix: quantScore < 1
      ? "Add scale or outcome to each bullet: how many users, how much money, how much faster, how many percent. If you do not know the number, estimate the order of magnitude and label it."
      : undefined,
    evidence: bullets
      .filter((bl) => countMetrics(bl.text) === 0)
      .slice(0, 4)
      .map((bl) => span(text, bl.start, bl.end, bl.section)),
  });

  const metricCount = countMetrics(text);
  const metricScore = clamp(metricCount / targets.minMetrics, 0, 1);
  b.add({
    id: "content.metric-density",
    label: "Metric density for target level",
    status: statusFor(metricScore),
    points: 12 * metricScore,
    max: 12,
    severity: "important",
    reason: `${metricCount} distinct metrics found. A ${targetLevel}-level resume typically carries at least ${targets.minMetrics}.`,
    fix: metricScore < 1 ? "Every role should show at least one metric of scale and one of outcome." : undefined,
    evidence: MISSING,
  });

  const verbRatio = bullets.length ? stats.actionVerbBullets / bullets.length : 0;
  const verbScore = clamp(verbRatio / 0.8, 0, 1);
  b.add({
    id: "content.action-verbs",
    label: "Bullets open with a strong verb",
    status: statusFor(verbScore),
    points: 18 * verbScore,
    max: 18,
    severity: "critical",
    reason: bullets.length
      ? `${stats.actionVerbBullets} of ${bullets.length} bullets start with a strong action verb.`
      : "No bullets detected.",
    fix: verbScore < 1 ? "Start every bullet with a past-tense outcome verb: Led, Built, Reduced, Migrated, Automated, Shipped." : undefined,
    evidence: bullets
      .filter((bl) => !startsWithStrongVerb(bl.text))
      .slice(0, 4)
      .map((bl) => span(text, bl.start, bl.end, bl.section)),
  });

  const weakBullets = bullets.filter((bl) => matchWeakOpener(bl.text) !== null);
  const weakScore = bullets.length ? clamp(1 - weakBullets.length / Math.max(1, bullets.length * 0.25), 0, 1) : 0;
  b.add({
    id: "content.no-weak-openers",
    label: "No responsibility-style openers",
    status: statusFor(weakScore),
    points: 14 * weakScore,
    max: 14,
    severity: "critical",
    reason: weakBullets.length
      ? `${weakBullets.length} bullets open with responsibility language ("responsible for", "worked on", "helped with"). These describe a job description, not your contribution.`
      : "No responsibility-style openers found.",
    fix: weakBullets.length
      ? `Rewrite as ownership: ${weakBullets
          .slice(0, 2)
          .map((bl) => `"${bl.text.slice(0, 42)}…" → "${matchWeakOpener(bl.text)?.replacement} …"`)
          .join("; ")}`
      : undefined,
    evidence: weakBullets.slice(0, 4).map((bl) => span(text, bl.start, bl.end, bl.section)),
  });

  const varietyTarget = Math.min(12, Math.max(4, Math.round(bullets.length * 0.6)));
  const varietyScore = clamp(stats.uniqueActionVerbs / varietyTarget, 0, 1);
  b.add({
    id: "content.verb-variety",
    label: "Verb variety",
    status: statusFor(varietyScore),
    points: 8 * varietyScore,
    max: 8,
    severity: "polish",
    reason: `${stats.uniqueActionVerbs} unique opening verbs across ${bullets.length} bullets.`,
    fix: varietyScore < 1 ? "Repeating the same verb makes every bullet read the same. Vary between build, improve, lead and analyse verbs." : undefined,
    evidence: MISSING,
  });

  const lengthOk = bullets.filter(
    (bl) => {
      const n = words(bl.text).length;
      return n >= BULLET_LENGTH.min && n <= BULLET_LENGTH.max;
    },
  ).length;
  const lengthScore = bullets.length ? lengthOk / bullets.length : 0;
  b.add({
    id: "content.bullet-length",
    label: "Bullet length in the readable band",
    status: statusFor(lengthScore),
    points: 10 * lengthScore,
    max: 10,
    severity: "polish",
    reason: `Average bullet is ${stats.avgBulletWords} words. The readable band is ${BULLET_LENGTH.ideal[0]}–${BULLET_LENGTH.ideal[1]} words; anything under ${BULLET_LENGTH.min} carries no detail and anything over ${BULLET_LENGTH.max} gets skipped.`,
    fix: lengthScore < 1 ? "Split long bullets into two, and merge fragments that carry no outcome." : undefined,
    evidence: bullets
      .filter((bl) => {
        const n = words(bl.text).length;
        return n < BULLET_LENGTH.min || n > BULLET_LENGTH.max;
      })
      .slice(0, 3)
      .map((bl) => span(text, bl.start, bl.end, bl.section)),
  });

  const outcomeBullets = bullets.filter((bl) => hasImpactNoun(bl.text) && countMetrics(bl.text) > 0);
  const outcomeScore = bullets.length ? clamp(outcomeBullets.length / Math.max(2, bullets.length * 0.35), 0, 1) : 0;
  b.add({
    id: "content.outcome-framing",
    label: "Numbers attached to a business outcome",
    status: statusFor(outcomeScore),
    points: 15 * outcomeScore,
    max: 15,
    severity: "important",
    reason: `${outcomeBullets.length} bullets pair a number with an outcome noun (latency, revenue, churn, uptime, cost, conversion). A number without an outcome is decoration.`,
    fix: outcomeScore < 1
      ? 'Convert "processed 1M records" into "cut nightly batch time 62% by processing 1M records in parallel".'
      : undefined,
    evidence: outcomeBullets.slice(0, 3).map((bl) => span(text, bl.start, bl.end, bl.section)),
  });

  const summarySection = resume.sections.find((s) => s.id === "summary");
  const summaryText = summarySection?.body.trim() ?? "";
  const summaryWords = words(summaryText).length;
  const summaryHasMetric = countMetrics(summaryText) > 0;
  const summaryScore = !summaryText
    ? 0
    : summaryWords < 20
      ? 0.35
      : summaryWords > 90
        ? 0.6
        : summaryHasMetric
          ? 1
          : 0.75;
  b.add({
    id: "content.summary",
    label: "Headline summary",
    status: statusFor(summaryScore),
    points: 10 * summaryScore,
    max: 10,
    severity: "important",
    reason: !summaryText
      ? "No professional summary was found. The three lines under your name are the highest-value real estate on the page and the first thing a recruiter reads."
      : `Summary is ${summaryWords} words${summaryHasMetric ? " and carries a metric" : " but carries no metric"}.`,
    fix: summaryScore < 1
      ? "Write 2–3 lines: target title, years of experience, domain, and one headline number. Include the exact job title you are applying for."
      : undefined,
    evidence: summarySection ? [span(text, summarySection.start, Math.min(summarySection.end, summarySection.start + 160), "summary")] : MISSING,
  });

  const rolesWithEnoughBullets = resume.experience.filter(
    (e) => e.bullets.length >= targets.minBulletsPerRole,
  ).length;
  const densityScore = resume.experience.length ? rolesWithEnoughBullets / resume.experience.length : 0;
  b.add({
    id: "content.bullets-per-role",
    label: "Enough detail per role",
    status: statusFor(densityScore),
    points: 8 * densityScore,
    max: 8,
    severity: "important",
    reason: resume.experience.length
      ? `${rolesWithEnoughBullets} of ${resume.experience.length} roles carry at least ${targets.minBulletsPerRole} bullets.`
      : "No roles found.",
    fix: densityScore < 1
      ? `Give your two most recent roles ${targets.minBulletsPerRole}–${targets.maxBulletsPerRole} bullets each and compress older roles to one or two.`
      : undefined,
    evidence: resume.experience
      .filter((e) => e.bullets.length < targets.minBulletsPerRole)
      .slice(0, 3)
      .map((e) => span(text, e.start, e.end, "experience")),
  });

  return b;
}

/* -------------------------------------------------------- skills & keywords */

function scoreSkills({ resume, targetRoleId }: ScoreInput, stats: ResumeStats): Builder {
  const b = builder("skills_keywords");
  const profile = ROLE_PROFILES.find((r) => r.id === targetRoleId) ?? ROLE_PROFILES[0];

  const hasSkillsSection = resume.sections.some((s) => s.id === "skills");
  b.add({
    id: "skills.section-present",
    label: "Dedicated skills section",
    status: hasSkillsSection ? "pass" : "fail",
    points: hasSkillsSection ? 15 : 0,
    max: 15,
    severity: "critical",
    reason: hasSkillsSection
      ? "A dedicated skills section was found, which is where recruiter keyword searches land first."
      : "No dedicated skills section. Recruiters filter candidates by skill before they read anything else.",
    fix: hasSkillsSection ? undefined : 'Add a "Skills" section grouped by category: Languages, Frameworks, Infrastructure, Data, Practices.',
    evidence: MISSING,
  });

  const hardSkills = resume.skills.filter((s) => s.category !== "soft");
  const countScore = clamp(hardSkills.length / 14, 0, 1);
  b.add({
    id: "skills.hard-skill-count",
    label: "Hard skill coverage",
    status: statusFor(countScore),
    points: 18 * countScore,
    max: 18,
    severity: "important",
    reason: `${hardSkills.length} recognised hard skills detected. Screens typically look for 12–20 concrete technologies.`,
    fix: countScore < 1
      ? "List the specific technologies you have actually used, including cloud, data store, CI and testing tooling — not just languages."
      : undefined,
    evidence: MISSING,
  });

  const evidenceRatio = resume.skills.length ? stats.evidencedSkillCount / resume.skills.length : 0;
  const evidenceScore = clamp(evidenceRatio / 0.7, 0, 1);
  const unsupported = resume.skills.filter((s) => s.inSkillsSection && !s.inExperience && !s.inProjects);
  b.add({
    id: "skills.evidence",
    label: "Skills evidenced in real work",
    status: statusFor(evidenceScore),
    points: 25 * evidenceScore,
    max: 25,
    severity: "critical",
    reason: unsupported.length
      ? `${unsupported.length} skills appear only in your skills list with no supporting bullet: ${unsupported
          .slice(0, 8)
          .map((s) => s.canonical)
          .join(", ")}. Recruiters treat unsupported keyword lists as noise and, at worst, as stuffing.`
      : "Listed skills are backed by evidence in your experience or projects.",
    fix: unsupported.length
      ? "For each claimed skill, make sure at least one bullet shows where you used it and what it produced. Delete anything you cannot evidence."
      : undefined,
    evidence: MISSING,
  });

  const stuffingRatio = resume.skills.length ? unsupported.length / resume.skills.length : 0;
  const stuffingScore = clamp(1 - stuffingRatio / 0.6, 0, 1);
  b.add({
    id: "skills.no-stuffing",
    label: "No keyword stuffing",
    status: statusFor(stuffingScore),
    points: 12 * stuffingScore,
    max: 12,
    severity: "important",
    reason:
      stuffingRatio > 0.5
        ? `${Math.round(stuffingRatio * 100)}% of your skills have no supporting evidence. That ratio reads as a keyword dump.`
        : "Skill list length is proportional to the evidence behind it.",
    fix: stuffingRatio > 0.5 ? "Cut the list to the technologies you would be comfortable being interviewed on." : undefined,
    evidence: MISSING,
  });

  const categories = new Set(hardSkills.map((s) => s.category));
  const categoryScore = clamp(categories.size / 5, 0, 1);
  b.add({
    id: "skills.category-breadth",
    label: "Breadth across skill categories",
    status: statusFor(categoryScore),
    points: 8 * categoryScore,
    max: 8,
    severity: "polish",
    reason: `${categories.size} distinct skill categories represented (${Array.from(categories).slice(0, 6).join(", ")}).`,
    fix: categoryScore < 1 ? "Add the adjacent categories a screen expects: testing, CI/CD, cloud, data store, observability." : undefined,
    evidence: MISSING,
  });

  const coreCovered = profile.coreSkills.filter((skill) =>
    resume.skills.some((s) => s.canonical === skill),
  );
  const coreScore = profile.coreSkills.length ? coreCovered.length / profile.coreSkills.length : 1;
  const missingCore = profile.coreSkills.filter((s) => !coreCovered.includes(s));
  b.add({
    id: "skills.role-core",
    label: `Core skills for ${profile.label}`,
    status: statusFor(coreScore),
    points: 18 * coreScore,
    max: 18,
    severity: "critical",
    reason: missingCore.length
      ? `Missing core ${profile.label} skills: ${missingCore.join(", ")}. These appear in the majority of requisitions for this role.`
      : `All core ${profile.label} skills are present.`,
    fix: missingCore.length
      ? `If you have used these, name them explicitly in both your skills list and a bullet. If you have not, they are your learning backlog.`
      : undefined,
    evidence: MISSING,
  });

  const dated = resume.skills.filter((s) => resolveSkill(s.canonical)?.dated);
  const datedScore = dated.length === 0 ? 1 : clamp(1 - dated.length / Math.max(3, resume.skills.length * 0.3), 0, 1);
  b.add({
    id: "skills.recency",
    label: "Current, not dated, technology",
    status: statusFor(datedScore),
    points: 4 * datedScore,
    max: 4,
    severity: "polish",
    reason: dated.length
      ? `Dated technologies detected (${dated.map((d) => d.canonical).join(", ")}). Keep them only if the target role asks for them.`
      : "No obviously dated technologies dominating the skills list.",
    fix: dated.length ? "Lead with current stack; move legacy technology to the end of the list." : undefined,
    evidence: MISSING,
  });

  return b;
}

/* ------------------------------------------------------ structure & consistency */

function scoreStructure({ resume, targetLevel }: ScoreInput, stats: ResumeStats): Builder {
  const b = builder("structure_consistency");
  const text = resume.normalizedText;
  const targets = STRUCTURE_TARGETS[targetLevel];

  const wanted: { id: "summary" | "experience" | "education" | "skills" | "projects"; label: string; weight: number }[] = [
    { id: "summary", label: "Summary", weight: 1 },
    { id: "experience", label: "Work Experience", weight: 2 },
    { id: "education", label: "Education", weight: 1.5 },
    { id: "skills", label: "Skills", weight: 2 },
    { id: "projects", label: "Projects", weight: targetLevel === "intern" || targetLevel === "entry" ? 1.5 : 0.5 },
  ];
  const totalWeight = wanted.reduce((s, w) => s + w.weight, 0);
  const gotWeight = wanted
    .filter((w) => resume.sections.some((s) => s.id === w.id))
    .reduce((s, w) => s + w.weight, 0);
  const sectionScore = gotWeight / totalWeight;
  b.add({
    id: "structure.sections",
    label: "Section completeness",
    status: statusFor(sectionScore),
    points: 18 * sectionScore,
    max: 18,
    severity: "important",
    reason: `Missing: ${wanted.filter((w) => !resume.sections.some((s) => s.id === w.id)).map((w) => w.label).join(", ") || "nothing"}.`,
    fix: sectionScore < 1 ? "Add the missing sections; for early-career resumes Projects carries as much weight as Experience." : undefined,
    evidence: MISSING,
  });

  const dated = resume.experience.filter((e) => e.dates?.startYear);
  let inversions = 0;
  for (let i = 1; i < dated.length; i += 1) {
    const prev = dated[i - 1].dates!;
    const curr = dated[i].dates!;
    const prevKey = (prev.isCurrent ? 9999 : prev.endYear ?? prev.startYear ?? 0) * 12 + (prev.endMonth ?? 12);
    const currKey = (curr.isCurrent ? 9999 : curr.endYear ?? curr.startYear ?? 0) * 12 + (curr.endMonth ?? 12);
    if (currKey > prevKey) inversions += 1;
  }
  const chronoScore = dated.length > 1 ? clamp(1 - inversions / (dated.length - 1), 0, 1) : 1;
  b.add({
    id: "structure.reverse-chronological",
    label: "Reverse-chronological order",
    status: statusFor(chronoScore),
    points: 12 * chronoScore,
    max: 12,
    severity: "important",
    reason: inversions
      ? `${inversions} role(s) appear out of order. Recruiters and parsers both assume the newest role is first.`
      : "Roles are listed newest first.",
    fix: inversions ? "Reorder roles newest first within each section." : undefined,
    evidence: MISSING,
  });

  const styles = new Set(dated.map((e) => e.dates?.formatStyle).filter(Boolean));
  const riskyStyle = dated.some((e) => e.dates?.formatStyle === "ApostropheYear" || e.dates?.formatStyle === "YearOnly");
  const dateFormatScore = styles.size <= 1 ? (riskyStyle ? 0.4 : 1) : riskyStyle ? 0.15 : 0.5;
  b.add({
    id: "structure.date-format",
    label: "Consistent, parseable date format",
    status: statusFor(dateFormatScore),
    points: 14 * dateFormatScore,
    max: 14,
    severity: "critical",
    reason:
      styles.size > 1
        ? `Mixed date formats detected (${Array.from(styles).join(", ")}). Inconsistent formats break the years-of-experience calculation recruiters filter on.`
        : riskyStyle
          ? "Dates use a year-only or apostrophe format. Without a month the system cannot compute tenure, and apostrophes are frequently dropped entirely."
          : "Date format is consistent and machine-readable.",
    fix: dateFormatScore < 1 ? 'Use one format everywhere: "Mar 2022 – Jan 2024" or "03/2022 – 01/2024".' : undefined,
    evidence: dated
      .filter((e) => e.dates?.formatStyle === "ApostropheYear" || e.dates?.formatStyle === "YearOnly")
      .slice(0, 3)
      .map((e) => span(text, e.start, e.end, "experience")),
  });

  const inBand = resume.experience.filter(
    (e) => e.bullets.length >= targets.minBulletsPerRole && e.bullets.length <= targets.maxBulletsPerRole,
  ).length;
  const bulletBandScore = resume.experience.length ? inBand / resume.experience.length : 0;
  b.add({
    id: "structure.bullet-band",
    label: "Bullets per role within range",
    status: statusFor(bulletBandScore),
    points: 10 * bulletBandScore,
    max: 10,
    severity: "polish",
    reason: `${inBand} of ${resume.experience.length} roles fall in the ${targets.minBulletsPerRole}–${targets.maxBulletsPerRole} bullet range.`,
    fix: bulletBandScore < 1 ? "Over six bullets in one role dilutes the strongest ones; under three reads as a placeholder." : undefined,
    evidence: MISSING,
  });

  const wc = stats.wordCount;
  const lengthScore =
    wc >= targets.idealWords[0] && wc <= targets.idealWords[1]
      ? 1
      : wc >= targets.minWords && wc <= targets.maxWords
        ? 0.7
        : wc < targets.minWords
          ? clamp(wc / targets.minWords, 0, 0.6)
          : clamp(targets.maxWords / wc, 0, 0.6);
  b.add({
    id: "structure.length",
    label: "Length appropriate for level",
    status: statusFor(lengthScore),
    points: 12 * lengthScore,
    max: 12,
    severity: "important",
    reason: `${wc} words. A ${targetLevel}-level resume reads best between ${targets.idealWords[0]} and ${targets.idealWords[1]} words.`,
    fix:
      wc < targets.minWords
        ? "Too thin — add outcome detail to your two most recent roles rather than padding with adjectives."
        : wc > targets.maxWords
          ? "Too long — cut roles older than ten years to a single line and remove anything not relevant to the target role."
          : undefined,
    evidence: MISSING,
  });

  const contactFields = [
    { key: "email", value: resume.contact.email, weight: 4, label: "Email" },
    { key: "phone", value: resume.contact.phone, weight: 3, label: "Phone" },
    { key: "location", value: resume.contact.location, weight: 1.5, label: "City / region" },
    { key: "linkedin", value: resume.contact.linkedin, weight: 2.5, label: "LinkedIn" },
    { key: "name", value: resume.contact.name, weight: 3, label: "Name" },
  ];
  const contactTotal = contactFields.reduce((s, f) => s + f.weight, 0);
  const contactGot = contactFields.filter((f) => f.value).reduce((s, f) => s + f.weight, 0);
  const contactScore = contactGot / contactTotal;
  b.add({
    id: "structure.contact",
    label: "Contact completeness",
    status: statusFor(contactScore),
    points: 14 * contactScore,
    max: 14,
    severity: "critical",
    reason: `Missing: ${contactFields.filter((f) => !f.value).map((f) => f.label).join(", ") || "nothing"}.`,
    fix: contactScore < 1 ? "Put name, city, phone, email and LinkedIn on separate lines or on one line separated by a pipe." : undefined,
    evidence: MISSING,
  });

  const portfolio = Boolean(resume.contact.github || resume.contact.website);
  b.add({
    id: "structure.portfolio",
    label: "Portfolio or code link",
    status: portfolio ? "pass" : "fail",
    points: portfolio ? 6 : 0,
    max: 6,
    severity: "polish",
    reason: portfolio ? "A GitHub or portfolio link is present." : "No GitHub or portfolio link found.",
    fix: portfolio ? undefined : "Add a GitHub or portfolio URL. For engineering roles it is the cheapest credibility signal you have.",
    evidence: MISSING,
  });

  const gaps = detectGaps(resume);
  const gapScore = gaps.length === 0 ? 1 : clamp(1 - gaps.length * 0.34, 0, 1);
  b.add({
    id: "structure.timeline",
    label: "Timeline continuity",
    status: statusFor(gapScore),
    points: 6 * gapScore,
    max: 6,
    severity: "polish",
    reason: gaps.length
      ? `Gap(s) of ${gaps.map((g) => `${g} months`).join(", ")} between dated roles. A gap is not a disqualifier, but an unexplained one invites a question you will not be in the room to answer.`
      : "No unexplained gaps longer than six months between dated roles.",
    fix: gaps.length ? "Label the period explicitly: sabbatical, caregiving, study, contract work, or job search." : undefined,
    evidence: MISSING,
  });

  const education = resume.education.length > 0;
  b.add({
    id: "structure.education",
    label: "Education present and parseable",
    status: education ? (resume.education.some((e) => e.degree && e.institution) ? "pass" : "partial") : "fail",
    points: education ? (resume.education.some((e) => e.degree && e.institution) ? 8 : 4) : 0,
    max: 8,
    severity: "important",
    reason: education
      ? "Education entries were detected."
      : "No education section could be parsed. Many large employers auto-reject records with an empty education field.",
    fix: education ? undefined : 'Add "Education" with degree, institution and graduation year on separate lines.',
    evidence: MISSING,
  });

  return b;
}

function detectGaps(resume: StructuredResume): number[] {
  const dated = resume.experience
    .map((e) => e.dates)
    .filter((d): d is NonNullable<typeof d> => Boolean(d?.startYear))
    .map((d) => {
      const now = new Date();
      const start = (d.startYear as number) * 12 + (d.startMonth ?? 1);
      const end = d.isCurrent
        ? now.getFullYear() * 12 + now.getMonth() + 1
        : (d.endYear ?? d.startYear ?? 0) * 12 + (d.endMonth ?? 12);
      return { start, end: Math.max(start, end) };
    })
    .sort((a, b) => a.start - b.start);

  const gaps: number[] = [];
  for (let i = 1; i < dated.length; i += 1) {
    const gap = dated[i].start - dated[i - 1].end;
    if (gap > 6) gaps.push(gap);
  }
  return gaps;
}

/* ---------------------------------------------------------- role alignment */

function scoreAlignment(
  { resume, targetRoleId, targetLevel }: ScoreInput,
  levelSignals: LevelSignal[],
): Builder {
  const b = builder("role_alignment");
  const profile = ROLE_PROFILES.find((r) => r.id === targetRoleId) ?? ROLE_PROFILES[0];
  const text = resume.normalizedText.toLowerCase();

  const titleHit = profile.titleAliases.some((alias) => text.includes(alias));
  const headlineHit = profile.titleAliases.some((alias) =>
    (resume.contact.headline ?? "").toLowerCase().includes(alias),
  );
  const titleScore = headlineHit ? 1 : titleHit ? 0.6 : 0;
  b.add({
    id: "align.title",
    label: "Target job title appears on the page",
    status: statusFor(titleScore),
    points: 20 * titleScore,
    max: 20,
    severity: "critical",
    reason: headlineHit
      ? `Your headline contains the target title, which is the single highest-leverage keyword on the document.`
      : titleHit
        ? `The title "${profile.label}" appears somewhere in the body but not in your headline.`
        : `The target title "${profile.label}" does not appear anywhere on the resume.`,
    fix: titleScore < 1
      ? `Put the exact target title directly under your name, e.g. "${profile.label} · ${resume.totalExperienceMonths ? Math.floor(resume.totalExperienceMonths / 12) : 3}+ years".`
      : undefined,
    evidence: MISSING,
  });

  const core = profile.coreSkills;
  const covered = core.filter((skill) =>
    resume.skills.some((s) => s.canonical === skill && (s.inExperience || s.inProjects)),
  );
  const coreScore = core.length ? covered.length / core.length : 1;
  b.add({
    id: "align.core-skills",
    label: "Role-critical skills evidenced",
    status: statusFor(coreScore),
    points: 22 * coreScore,
    max: 22,
    severity: "critical",
    reason: `${covered.length} of ${core.length} role-critical skills are evidenced inside real work, not just listed.`,
    fix: coreScore < 1 ? `Evidence these in a bullet: ${core.filter((c) => !covered.includes(c)).join(", ")}.` : undefined,
    evidence: MISSING,
  });

  const relevant = levelSignals.filter((s) => s.state !== "absent");
  const levelScore = levelSignals.length ? relevant.length / levelSignals.length : 1;
  b.add({
    id: "align.level-signals",
    label: `Seniority signals for ${targetLevel} level`,
    status: statusFor(levelScore),
    points: 32 * levelScore,
    max: 32,
    severity: "critical",
    reason: `${relevant.length} of ${levelSignals.length} expected signals for this level are present or partially present.`,
    fix: levelScore < 1
      ? `Absent: ${levelSignals.filter((s) => s.state === "absent").map((s) => s.label).join(", ")}. Each one has an example phrasing in the level-gap panel.`
      : undefined,
    evidence: relevant.flatMap((s) => s.evidence).slice(0, 3),
  });

  const mostRecent = resume.experience.find((e) => e.dates?.isCurrent) ?? resume.experience[0];
  const recentText = mostRecent ? mostRecent.bullets.map((x) => x.text).join(" ").toLowerCase() : "";
  const recentCore = core.filter((skill) => {
    const node = resolveSkill(skill);
    if (!node) return false;
    return [node.canonical, ...node.aliases].some((surface) => recentText.includes(surface.toLowerCase()));
  });
  const recencyScore = core.length ? clamp(recentCore.length / Math.max(2, core.length * 0.4), 0, 1) : 1;
  b.add({
    id: "align.recency",
    label: "Core skills used recently",
    status: statusFor(recencyScore),
    points: 14 * recencyScore,
    max: 14,
    severity: "important",
    reason: mostRecent
      ? `${recentCore.length} role-critical skills appear in your most recent role. Recruiters discount skills last used more than three years ago.`
      : "No recent role found to evaluate skill recency.",
    fix: recencyScore < 1 ? "Surface the current-stack technologies inside your latest role's bullets, not only in the skills list." : undefined,
    evidence: MISSING,
  });

  const levelIndex = LEVEL_ORDER.indexOf(targetLevel);
  const inferredIndex = LEVEL_ORDER.indexOf(resume.inferredLevel);
  const stretch = levelIndex - inferredIndex;
  const stretchScore = stretch <= 0 ? 1 : stretch === 1 ? 0.6 : 0.25;
  b.add({
    id: "align.level-fit",
    label: "Target level matches evidenced level",
    status: statusFor(stretchScore),
    points: 12 * stretchScore,
    max: 12,
    severity: stretch >= 2 ? "important" : "polish",
    reason:
      stretch <= 0
        ? `Your resume evidences ${resume.inferredLevel} level, at or above the ${targetLevel} target.`
        : `Your resume evidences ${resume.inferredLevel} level while you are targeting ${targetLevel}. ${
            stretch === 1 ? "That is a reasonable stretch if the seniority signals are strong." : "That is a two-level stretch and will be screened out on tenure alone at most large employers."
          }`,
    fix: stretch > 0 ? "Close the gap with scope and ownership evidence, or target the level your work actually demonstrates." : undefined,
    evidence: MISSING,
  });

  return b;
}

export function evaluateLevelSignals(
  resume: StructuredResume,
  targetLevel: SeniorityLevel,
): LevelSignal[] {
  const targetIndex = LEVEL_ORDER.indexOf(targetLevel);
  const text = resume.normalizedText;
  const bulletCorpus = resume.bullets;

  return LEVEL_EXPECTATIONS.filter(
    (exp) => LEVEL_ORDER.indexOf(exp.minLevel) <= targetIndex,
  ).map((exp) => {
    const evidence: EvidenceSpan[] = [];
    let hits = 0;
    for (const pattern of exp.evidence) {
      const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
      const bullet = bulletCorpus.find((bl) => re.test(bl.text));
      if (bullet) {
        hits += 1;
        if (evidence.length < 2) {
          evidence.push({ text: bullet.text.slice(0, 160), start: bullet.start, end: bullet.end, section: bullet.section });
        }
      } else if (new RegExp(pattern.source, pattern.flags).test(text)) {
        hits += 0.5;
      }
    }
    const state: LevelSignal["state"] = hits >= 2 ? "present" : hits >= 0.5 ? "partial" : "absent";
    return {
      id: exp.id,
      dimension: exp.dimension,
      label: exp.label,
      expectation: exp.expectation,
      state,
      evidence,
      examplePhrasing: exp.examplePhrasing,
    };
  });
}

/* ------------------------------------------------------- language & hygiene */

const RED_FLAG_PATTERNS: { id: string; pattern: RegExp; label: string; fix: string }[] = [
  { id: "dob", pattern: /\b(date of birth|d\.o\.b\.?|dob)\b/i, label: "Date of birth", fix: "Remove it. In most markets it invites age-discrimination risk and adds no hiring signal." },
  { id: "marital", pattern: /\b(marital status|married|single|unmarried)\b/i, label: "Marital status", fix: "Remove personal status fields entirely." },
  { id: "gender", pattern: /\b(gender|sex)\s*[:\-]/i, label: "Gender field", fix: "Remove it." },
  { id: "photo", pattern: /\b(photograph|photo attached|passport size)\b/i, label: "Photo reference", fix: "Remove photos; several ATS platforms fail to parse pages containing large images." },
  { id: "references", pattern: /\breferences?\s+(?:available|furnished)\s+(?:up)?on\s+request\b/i, label: "References line", fix: "Delete it — references are assumed and the line wastes a slot." },
  { id: "salary", pattern: /\b(current|expected)\s+(?:ctc|salary|compensation)\b/i, label: "Salary expectation", fix: "Never put compensation on a resume; it anchors the negotiation against you." },
  { id: "objective-generic", pattern: /\bseeking a challenging (?:position|role|opportunity)\b/i, label: "Generic objective", fix: "Replace with a targeted summary naming the role and your headline metric." },
  { id: "father", pattern: /\bfather'?s name\b/i, label: "Family details", fix: "Remove family details." },
  { id: "nationality", pattern: /\bnationality\s*[:\-]/i, label: "Nationality field", fix: "Remove unless the posting explicitly requires work-authorisation detail." },
];

function scoreHygiene({ resume, language }: ScoreInput): Builder {
  const b = builder("hygiene_language");
  const text = resume.normalizedText;
  const wordCount = Math.max(1, resume.layout.wordCount);

  const spellingPer100 = (language.misspellingCount / wordCount) * 100;
  const spellingScore = language.misspellingCount === 0 ? 1 : clamp(1 - spellingPer100 / 1.2, 0, 1);
  b.add({
    id: "hygiene.spelling",
    label: "Spelling",
    status: statusFor(spellingScore),
    points: 28 * spellingScore,
    max: 28,
    severity: "critical",
    reason: language.misspellingCount
      ? `${language.misspellingCount} spelling error(s) found. Surveys of hiring managers consistently put spelling errors in the top three instant-rejection reasons.`
      : language.dictionaryAvailable
        ? "No spelling errors detected against a full English dictionary plus a technical vocabulary."
        : "No spelling errors detected against the curated error list.",
    fix: language.misspellingCount ? "Fix every flagged word in the Language panel, then read the document backwards one line at a time." : undefined,
    evidence: language.issues
      .filter((i) => i.kind === "spelling")
      .slice(0, 5)
      .map((i) => ({ text: i.context, start: i.start, end: i.end })),
  });

  const grammarScore = clamp(1 - language.grammarCount / 6, 0, 1);
  b.add({
    id: "hygiene.grammar",
    label: "Grammar and word choice",
    status: statusFor(grammarScore),
    points: 18 * grammarScore,
    max: 18,
    severity: "important",
    reason: language.grammarCount
      ? `${language.grammarCount} grammar or real-word confusion issue(s) found — the kind a spell checker never catches.`
      : "No grammar or confusable-word issues detected.",
    fix: language.grammarCount ? "Review the Language panel; each item has the exact replacement." : undefined,
    evidence: language.issues
      .filter((i) => i.kind === "grammar" || i.kind === "confusable")
      .slice(0, 4)
      .map((i) => ({ text: i.context, start: i.start, end: i.end })),
  });

  const tenseScore = clamp(1 - language.tenseIssueCount / 4, 0, 1);
  b.add({
    id: "hygiene.tense",
    label: "Verb tense consistency",
    status: statusFor(tenseScore),
    points: 12 * tenseScore,
    max: 12,
    severity: "important",
    reason: language.tenseIssueCount
      ? `${language.tenseIssueCount} tense inconsistency issue(s). Current roles take present tense, past roles take past tense, and no role mixes both.`
      : "Verb tense is consistent within every role.",
    fix: language.tenseIssueCount ? "Pick the tense per role and apply it to every bullet in that role." : undefined,
    evidence: MISSING,
  });

  const fillerScore = clamp(1 - language.fillerCount / 5, 0, 1);
  b.add({
    id: "hygiene.filler",
    label: "No filler or cliché language",
    status: statusFor(fillerScore),
    points: 10 * fillerScore,
    max: 10,
    severity: "polish",
    reason: language.fillerCount
      ? `${language.fillerCount} cliché phrase(s) found ("team player", "results-driven", "detail-oriented"). None of these are verifiable, so none of them earn credit.`
      : "No filler clichés detected.",
    fix: language.fillerCount ? "Delete each cliché and replace the line with a measurable result." : undefined,
    evidence: language.issues.filter((i) => i.kind === "style").slice(0, 3).map((i) => ({ text: i.context, start: i.start, end: i.end })),
  });

  const pronounScore = clamp(1 - language.pronounCount / 4, 0, 1);
  b.add({
    id: "hygiene.pronouns",
    label: "No first-person pronouns",
    status: statusFor(pronounScore),
    points: 6 * pronounScore,
    max: 6,
    severity: "polish",
    reason: language.pronounCount
      ? `${language.pronounCount} first-person pronoun(s). Resumes use implied first person.`
      : "No first-person pronouns.",
    fix: language.pronounCount ? 'Delete "I", "my" and "we"; start with the verb instead.' : undefined,
    evidence: MISSING,
  });

  const casingIssues = language.issues.filter((i) => i.kind === "casing" || i.kind === "punctuation").length;
  const casingScore = clamp(1 - casingIssues / 8, 0, 1);
  b.add({
    id: "hygiene.presentation",
    label: "Casing and punctuation",
    status: statusFor(casingScore),
    points: 8 * casingScore,
    max: 8,
    severity: "polish",
    reason: casingIssues
      ? `${casingIssues} casing or punctuation defect(s), including product names written in the wrong case.`
      : "Product names and punctuation are correctly cased.",
    fix: casingIssues ? 'Write product names exactly: "JavaScript", "PostgreSQL", "GitHub", "Kubernetes".' : undefined,
    evidence: MISSING,
  });

  const redFlags = RED_FLAG_PATTERNS.filter((flag) => flag.pattern.test(text));
  const redFlagScore = clamp(1 - redFlags.length * 0.3, 0, 1);
  b.add({
    id: "hygiene.red-flags",
    label: "No disqualifying personal fields",
    status: statusFor(redFlagScore),
    points: 12 * redFlagScore,
    max: 12,
    severity: redFlags.length ? "important" : "polish",
    reason: redFlags.length
      ? `Found: ${redFlags.map((f) => f.label).join(", ")}.`
      : "No date of birth, marital status, photo reference or salary expectation on the page.",
    fix: redFlags.length ? redFlags.map((f) => f.fix).join(" ") : undefined,
    evidence: redFlags
      .map((f) => {
        const m = text.match(f.pattern);
        if (!m || m.index === undefined) return null;
        return span(text, m.index, m.index + m[0].length);
      })
      .filter((x): x is EvidenceSpan => x !== null),
  });

  return b;
}

/* ------------------------------------------------------------------ findings */

function buildFindings(pillars: PillarResult[]): Finding[] {
  const findings: Finding[] = [];
  for (const pillar of pillars) {
    for (const check of pillar.checks) {
      if (check.status === "pass") continue;
      const atStake = round((check.max - check.points) * pillar.weight, 1);
      if (atStake < 0.15) continue;
      findings.push({
        id: check.id,
        pillar: pillar.id,
        severity: escalate(check.severity, check.status, atStake),
        title: check.label,
        reason: check.reason,
        fix: check.fix ?? "Review this check in the pillar breakdown.",
        pointsAtStake: atStake,
        evidence: check.evidence,
      });
    }
  }
  return findings.sort((a, b) => b.pointsAtStake - a.pointsAtStake);
}

function escalate(severity: Severity, status: CheckStatus, atStake: number): Severity {
  if (status === "fail" && severity === "critical") return "critical";
  if (status === "fail" && atStake >= 2) return "critical";
  if (severity === "critical" && atStake >= 1.5) return "important";
  return severity === "critical" ? "important" : severity;
}

export function bandFor(score: number): { band: "excellent" | "strong" | "fair" | "at_risk"; interpretation: string } {
  if (score >= 88) {
    return {
      band: "excellent",
      interpretation:
        "This resume parses cleanly and reads like a strong candidate. Tailor it per requisition and apply.",
    };
  }
  if (score >= 75) {
    return {
      band: "strong",
      interpretation:
        "This resume will survive automated screening. The remaining gaps are about how convincing it is to the human who reads it next.",
    };
  }
  if (score >= 60) {
    return {
      band: "fair",
      interpretation:
        "This resume is readable but under-sells you. The critical findings below are worth more than any further formatting work.",
    };
  }
  return {
    band: "at_risk",
    interpretation:
      "This resume is at real risk of being filtered out before a human sees it. Start with the critical findings — they are ordered by how many points each one is worth.",
  };
}

export const ROLE_OPTIONS = ROLE_PROFILES.map((r) => ({ id: r.id, label: r.label }));
export { DEFAULT_ROLE_ID };
export const uniqueEvidence = (spans: EvidenceSpan[]) => uniqueBy(spans, (s) => `${s.start}:${s.end}`);

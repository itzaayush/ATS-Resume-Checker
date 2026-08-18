import { SKILL_TAXONOMY, TAXONOMY_INDEX, TAXONOMY_SURFACES, resolveSkill } from "./taxonomy";
import { clamp, cosineLemmaSimilarity, round, tokenize } from "./text-utils";
import type {
  CoverageState,
  EvidenceSpan,
  JobDescriptionParse,
  JobMatchResult,
  KeywordGapRow,
  SectionId,
  SeniorityLevel,
  StructuredResume,
  TailoringAction,
} from "./types";

const JD_SIGNALS: { id: string; pattern: RegExp; weight: number }[] = [
  { id: "responsibilities", pattern: /\b(responsibilities|what you.?ll do|the role|your impact|day to day)\b/i, weight: 2 },
  { id: "qualifications", pattern: /\b(qualifications|requirements|what you.?ll need|who you are|about you|must have)\b/i, weight: 2 },
  { id: "experience-years", pattern: /\b\d\+?\s*(?:\+|to|-)?\s*\d?\s*years?(?:'|\s+of)?\s+(?:relevant\s+)?experience\b/i, weight: 1.5 },
  { id: "second-person", pattern: /\byou (?:will|should|are|have|bring)\b/i, weight: 1 },
  { id: "company-voice", pattern: /\bwe (?:are|offer|believe|value|build)\b/i, weight: 1 },
  { id: "eeo", pattern: /\b(equal opportunity|eeo|we are committed to diversity)\b/i, weight: 1.5 },
  { id: "benefits", pattern: /\b(benefits|compensation|salary range|perks|equity|401k)\b/i, weight: 1 },
  { id: "apply", pattern: /\b(apply now|submit your application|join (?:our|the) team)\b/i, weight: 1 },
];

const REQUIRED_HEADING =
  /\b(minimum qualifications|basic qualifications|required qualifications|requirements|what you.?ll need|must have|you have|essential)\b/i;
const PREFERRED_HEADING =
  /\b(preferred qualifications|nice to have|bonus points|plus(?:es)?|desirable|good to have|it.?s a plus)\b/i;
const RESPONSIBILITY_HEADING =
  /\b(responsibilities|what you.?ll do|the role|your impact|in this role|day.to.day|duties)\b/i;

const SENIORITY_PATTERNS: { level: SeniorityLevel; pattern: RegExp }[] = [
  { level: "principal", pattern: /\b(principal|distinguished|fellow|l7|l8|architect)\b/i },
  { level: "staff", pattern: /\b(staff engineer|staff software|l6|sde\s?(?:iii|3))\b/i },
  { level: "senior", pattern: /\b(senior|sr\.?|lead|l5|sde\s?(?:ii|2)\b)/i },
  { level: "mid", pattern: /\b(engineer ii|software engineer 2|mid.level|l4)\b/i },
  { level: "entry", pattern: /\b(junior|jr\.?|associate|new grad|university grad|entry.level|l3|sde\s?(?:i|1)\b)/i },
  { level: "intern", pattern: /\b(intern|internship|co.?op|trainee)\b/i },
];

export function parseJobDescription(raw: string): JobDescriptionParse {
  const text = raw.replace(/\r\n?/g, "\n").trim();
  const lines = text.split("\n").map((l) => l.trim());

  const signalScore = JD_SIGNALS.reduce((sum, s) => sum + (s.pattern.test(text) ? s.weight : 0), 0);
  const longEnough = text.length >= 200;
  const isJobDescription = longEnough && signalScore >= 3;

  if (!isJobDescription) {
    return {
      title: null,
      company: null,
      seniority: "mid",
      requiredSkills: [],
      preferredSkills: [],
      responsibilities: [],
      yearsRequired: null,
      domain: null,
      isJobDescription: false,
      rejectionReason: !longEnough
        ? "Paste at least 200 characters. A short snippet cannot be matched reliably."
        : "This text does not read like a job description — no responsibilities, qualifications or requirement language was found.",
    };
  }

  const title = extractTitle(lines);
  const company = extractCompany(text);
  const seniority = SENIORITY_PATTERNS.find((s) => s.pattern.test(title ?? text))?.level ?? "mid";
  const yearsMatch = text.match(/\b(\d{1,2})\s*\+?\s*years?(?:'|\s+of)?\s+(?:relevant\s+|professional\s+|industry\s+)?experience\b/i);

  const regions = splitRegions(lines);
  const requiredSkills = skillsIn(regions.required || text);
  const preferredSkillsRaw = skillsIn(regions.preferred || "");
  const preferredSkills = preferredSkillsRaw.filter((s) => !requiredSkills.includes(s));
  const responsibilities = extractResponsibilities(regions.responsibilities || text);

  return {
    title,
    company,
    seniority,
    requiredSkills,
    preferredSkills,
    responsibilities,
    yearsRequired: yearsMatch ? Number(yearsMatch[1]) : null,
    domain: inferDomain(text),
    isJobDescription: true,
  };
}

function extractTitle(lines: string[]): string | null {
  const labelled = lines.find((l) => /^(job title|position|role)\s*[:\-]/i.test(l));
  if (labelled) return labelled.replace(/^(job title|position|role)\s*[:\-]\s*/i, "").trim();
  for (const line of lines.slice(0, 8)) {
    if (!line || line.length > 80) continue;
    if (/\b(engineer|developer|manager|analyst|scientist|designer|architect|specialist|lead|director|intern)\b/i.test(line)) {
      return line.replace(/\s*[-–|]\s*(full.time|remote|hybrid|onsite).*$/i, "").trim();
    }
  }
  return lines.find((l) => l.length > 3 && l.length < 70) ?? null;
}

function extractCompany(text: string): string | null {
  const labelled = text.match(/^(?:company|employer|organization)\s*[:\-]\s*(.+)$/im);
  if (labelled) return labelled[1].trim();
  const at = text.match(/\bat\s+([A-Z][A-Za-z0-9&.\- ]{2,40})\b/);
  return at ? at[1].trim() : null;
}

function splitRegions(lines: string[]): { required?: string; preferred?: string; responsibilities?: string } {
  const regions: { required?: string; preferred?: string; responsibilities?: string } = {};
  let current: keyof typeof regions | null = null;
  const buffers: Record<string, string[]> = { required: [], preferred: [], responsibilities: [] };

  for (const line of lines) {
    if (PREFERRED_HEADING.test(line) && line.length < 90) {
      current = "preferred";
      continue;
    }
    if (REQUIRED_HEADING.test(line) && line.length < 90) {
      current = "required";
      continue;
    }
    if (RESPONSIBILITY_HEADING.test(line) && line.length < 90) {
      current = "responsibilities";
      continue;
    }
    if (current) buffers[current].push(line);
  }

  for (const key of Object.keys(buffers) as (keyof typeof regions)[]) {
    if (buffers[key].length) regions[key] = buffers[key].join("\n");
  }
  return regions;
}

function skillsIn(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const found = new Map<string, number>();
  for (const surface of TAXONOMY_SURFACES) {
    const node = TAXONOMY_INDEX.get(surface)?.node;
    if (!node) continue;
    const escaped = surface.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<![A-Za-z0-9+#.])${escaped}(?![A-Za-z0-9+#])`, "g");
    const count = (lower.match(re) ?? []).length;
    if (count) found.set(node.canonical, (found.get(node.canonical) ?? 0) + count);
  }
  return Array.from(found.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([canonical]) => canonical);
}

function extractResponsibilities(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^\s*[^\w\s]{1,2}\s*/, "").trim())
    .filter((l) => l.length >= 25 && l.length <= 260)
    .slice(0, 14);
}

function inferDomain(text: string): string | null {
  const domains: [string, RegExp][] = [
    ["Fintech / payments", /\b(payments?|fintech|banking|ledger|trading|risk|fraud)\b/i],
    ["E-commerce", /\b(e.?commerce|marketplace|checkout|catalog|storefront|retail)\b/i],
    ["Healthcare", /\b(healthcare|clinical|patient|hipaa|ehr|medical)\b/i],
    ["Infrastructure / platform", /\b(platform|infrastructure|developer experience|internal tools)\b/i],
    ["Data / analytics", /\b(data platform|analytics|warehouse|etl|bi)\b/i],
    ["AI / ML", /\b(machine learning|artificial intelligence|llm|model training)\b/i],
    ["Security", /\b(security|appsec|threat|vulnerability|compliance)\b/i],
    ["Gaming", /\b(game|gaming|unreal|unity)\b/i],
  ];
  return domains.find(([, re]) => re.test(text))?.[0] ?? null;
}

/* ------------------------------------------------------------------ matching */

export function matchResumeToJob(resume: StructuredResume, jd: JobDescriptionParse): JobMatchResult {
  const gaps: KeywordGapRow[] = [];

  const evaluate = (canonical: string, importance: "required" | "preferred") => {
    const node = resolveSkill(canonical);
    const mention = resume.skills.find((s) => s.canonical === canonical);
    const evidence: EvidenceSpan[] = [];
    let state: CoverageState = "missing";
    let matchedAlias: string | null = null;

    if (mention) {
      matchedAlias = mention.surface !== canonical.toLowerCase() ? mention.surface : null;
      const evidenced = mention.inExperience || mention.inProjects;
      state = evidenced ? "covered" : "weak";
      const bullet = resume.bullets.find((b) =>
        new RegExp(`(?<![A-Za-z0-9+#.])${escapeRe(mention.surface)}(?![A-Za-z0-9+#])`, "i").test(b.text),
      );
      if (bullet) {
        evidence.push({ text: bullet.text.slice(0, 180), start: bullet.start, end: bullet.end, section: bullet.section });
      }
    }

    const suggestedSection: SectionId = state === "weak" ? "experience" : mention ? "experience" : "skills";
    gaps.push({
      requirement: canonical,
      canonical,
      category: node?.category ?? "tooling",
      importance,
      weight: (node?.weight ?? 1) * (importance === "required" ? 1.6 : 1),
      state,
      matchedAlias,
      evidence,
      suggestedSection,
      note:
        state === "covered"
          ? "Evidenced inside real work."
          : state === "weak"
            ? "Listed but never demonstrated. Recruiters discount unsupported keywords."
            : importance === "required"
              ? "Required by this posting and absent from your resume."
              : "Preferred by this posting and absent from your resume.",
    });
  };

  for (const skill of jd.requiredSkills) evaluate(skill, "required");
  for (const skill of jd.preferredSkills) evaluate(skill, "preferred");

  const scoreOf = (rows: KeywordGapRow[]) => {
    const total = rows.reduce((s, r) => s + r.weight, 0);
    if (!total) return 1;
    const earned = rows.reduce(
      (s, r) => s + r.weight * (r.state === "covered" ? 1 : r.state === "weak" ? 0.45 : 0),
      0,
    );
    return earned / total;
  };

  const requiredRows = gaps.filter((g) => g.importance === "required");
  const preferredRows = gaps.filter((g) => g.importance === "preferred");
  const requiredCoverage = scoreOf(requiredRows);
  const preferredCoverage = scoreOf(preferredRows);

  const titleMatch = computeTitleMatch(resume, jd);
  const responsibilityAlignment = computeResponsibilityAlignment(resume, jd);

  const matchScore = Math.round(
    clamp(
      (titleMatch * 0.15 + requiredCoverage * 0.5 + preferredCoverage * 0.13 + responsibilityAlignment * 0.22) * 100,
    ),
  );

  const stuffedTerms = resume.skills
    .filter((s) => s.inSkillsSection && !s.inExperience && !s.inProjects)
    .map((s) => s.canonical)
    .filter((canonical) => jd.requiredSkills.includes(canonical) || jd.preferredSkills.includes(canonical));

  return {
    matchScore,
    titleMatch: round(titleMatch * 100),
    requiredCoverage: round(requiredCoverage * 100),
    preferredCoverage: round(preferredCoverage * 100),
    responsibilityAlignment: round(responsibilityAlignment * 100),
    gaps: gaps.sort(sortGaps),
    stuffedTerms,
    jd,
    plan: buildPlan(gaps, jd, titleMatch, responsibilityAlignment),
  };
}

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sortGaps(a: KeywordGapRow, b: KeywordGapRow): number {
  const stateRank = (s: CoverageState) => (s === "missing" ? 0 : s === "weak" ? 1 : 2);
  if (a.importance !== b.importance) return a.importance === "required" ? -1 : 1;
  if (stateRank(a.state) !== stateRank(b.state)) return stateRank(a.state) - stateRank(b.state);
  return b.weight - a.weight;
}

function computeTitleMatch(resume: StructuredResume, jd: JobDescriptionParse): number {
  if (!jd.title) return 0.5;
  const target = jd.title.toLowerCase();
  const headline = (resume.contact.headline ?? "").toLowerCase();
  const titles = resume.experience.map((e) => (e.title ?? "").toLowerCase()).join(" ");
  const core = target
    .replace(/\b(senior|sr|junior|jr|staff|principal|lead|i{1,3}|[0-9]|remote|hybrid|full.time|contract)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (headline.includes(core) && core.length > 3) return 1;
  if (titles.includes(core) && core.length > 3) return 0.8;
  const overlap = cosineLemmaSimilarity(target, `${headline} ${titles}`);
  return clamp(overlap, 0, 1);
}

function computeResponsibilityAlignment(resume: StructuredResume, jd: JobDescriptionParse): number {
  if (!jd.responsibilities.length || !resume.bullets.length) return 0.4;
  let total = 0;
  for (const responsibility of jd.responsibilities) {
    let best = 0;
    for (const bullet of resume.bullets) {
      const sim = cosineLemmaSimilarity(responsibility, bullet.text);
      if (sim > best) best = sim;
    }
    total += Math.min(1, best / 0.45);
  }
  return clamp(total / jd.responsibilities.length, 0, 1);
}

function buildPlan(
  gaps: KeywordGapRow[],
  jd: JobDescriptionParse,
  titleMatch: number,
  responsibilityAlignment: number,
): TailoringAction[] {
  const actions: TailoringAction[] = [];

  if (titleMatch < 0.9 && jd.title) {
    actions.push({
      id: "plan.title",
      priority: 1,
      title: `Put "${jd.title}" in your headline`,
      detail:
        "The job title is the highest-weighted keyword in every ATS search. Place it directly under your name alongside your years of experience.",
      projectedDelta: 6,
      targetSection: "summary",
    });
  }

  const missingRequired = gaps.filter((g) => g.importance === "required" && g.state === "missing");
  if (missingRequired.length) {
    actions.push({
      id: "plan.missing-required",
      priority: 2,
      title: `Add ${missingRequired.length} missing required skill${missingRequired.length > 1 ? "s" : ""}`,
      detail: `Absent: ${missingRequired.map((g) => g.requirement).join(", ")}. Only add what you have genuinely used, then evidence each one in a bullet.`,
      projectedDelta: Math.min(22, missingRequired.length * 4),
      targetSection: "skills",
    });
  }

  const weakRequired = gaps.filter((g) => g.importance === "required" && g.state === "weak");
  if (weakRequired.length) {
    actions.push({
      id: "plan.evidence-weak",
      priority: 3,
      title: `Evidence ${weakRequired.length} listed-but-unproven skill${weakRequired.length > 1 ? "s" : ""}`,
      detail: `${weakRequired.map((g) => g.requirement).join(", ")} appear in your skills list with nothing behind them. Move each into a bullet that shows the outcome it produced.`,
      projectedDelta: Math.min(16, weakRequired.length * 3),
      targetSection: "experience",
    });
  }

  if (responsibilityAlignment < 0.6) {
    actions.push({
      id: "plan.mirror-responsibilities",
      priority: 4,
      title: "Mirror the posting's language in your top three bullets",
      detail:
        "Your bullets and the posting's responsibilities describe similar work in different vocabulary. Rewrite your strongest three bullets using the nouns the posting uses.",
      projectedDelta: 9,
      targetSection: "experience",
    });
  }

  const missingPreferred = gaps.filter((g) => g.importance === "preferred" && g.state === "missing");
  if (missingPreferred.length >= 3) {
    actions.push({
      id: "plan.preferred",
      priority: 5,
      title: "Pick up two preferred skills",
      detail: `Preferred but absent: ${missingPreferred.slice(0, 6).map((g) => g.requirement).join(", ")}. Covering two of these separates you from candidates who only meet the minimum bar.`,
      projectedDelta: 5,
      targetSection: "skills",
    });
  }

  return actions.sort((a, b) => a.priority - b.priority);
}

export const ALL_SKILL_NAMES = SKILL_TAXONOMY.map((s) => s.canonical);
export const tokenCount = (text: string) => tokenize(text).length;

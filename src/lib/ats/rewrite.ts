import { ALL_STRONG_VERBS, IMPACT_NOUNS } from "./rubric";
import { TAXONOMY_INDEX, TAXONOMY_SURFACES } from "./taxonomy";
import { words } from "./text-utils";
import { countMetrics, matchWeakOpener, startsWithStrongVerb } from "./scoring";
import type { BulletRewrite, ResumeBullet, StructuredResume } from "./types";

/**
 * Deterministic, grounded bullet rewriting.
 *
 * Hard rule: nothing is invented. The rewriter may reorder, re-verb and restructure the
 * candidate's own words, and it may insert an explicit placeholder token where a number
 * is missing — it never fabricates a metric, employer, technology or title.
 */

const PLACEHOLDER_PROMPTS: Record<string, string> = {
  "[X%]": "The percentage change. Check your dashboards, a before/after benchmark, or the ticket that tracked the work.",
  "[N]": "The absolute count: users, requests per second, records, services, or people.",
  "[$Y]": "The money involved: revenue influenced, cost removed, or budget owned.",
  "[T]": "The time saved or the latency before and after.",
  "[TEAM]": "How many engineers were involved and whether you led them.",
};

const OUTCOME_TEMPLATES = [
  "cutting {metric} by [X%]",
  "reducing {metric} from [T] to [T]",
  "increasing {metric} by [X%]",
  "unlocking [$Y] in annual savings",
  "supporting [N] users at peak",
];

export function rewriteBullet(bullet: string): BulletRewrite {
  const original = bullet.trim().replace(/\s+/g, " ");
  const issues: string[] = [];
  const placeholders: BulletRewrite["placeholders"] = [];

  const weak = matchWeakOpener(original);
  const hasMetric = countMetrics(original) > 0;
  const tech = detectTechnologies(original);
  const impactNoun = IMPACT_NOUNS.find((n) => original.toLowerCase().includes(n)) ?? null;

  if (weak) issues.push(weak.note);
  if (!hasMetric) issues.push("No number anywhere in this bullet — a recruiter cannot size your contribution.");
  if (!startsWithStrongVerb(original) && !weak) issues.push("Does not open with an action verb.");
  if (words(original).length < 8) issues.push("Too short to carry both an action and an outcome.");
  if (words(original).length > 34) issues.push("Too long — it will be skimmed past.");
  if (/\b(i|my|we|our)\b/i.test(original)) issues.push("Contains first-person pronouns.");

  const core = stripOpener(original, weak?.pattern);
  const verb = chooseVerb(original, weak?.replacement);
  const subject = decapitalize(core);

  const conciseBody = trimToWords(subject, 16);
  const concise = finalize(`${verb} ${conciseBody}`);

  const techClause = tech.length ? ` using ${formatList(tech.slice(0, 3))}` : "";
  const standardOutcome = hasMetric ? "" : ` — ${outcomeTemplate(impactNoun)}`;
  const standard = finalize(`${verb} ${trimToWords(subject, 22)}${techClause}${standardOutcome}`);

  const metricsClause = hasMetric
    ? " and sustained the result across [N] releases"
    : `, ${outcomeTemplate(impactNoun)} and serving [N] ${guessUnit(original)}`;
  const metricsHeavy = finalize(`${verb} ${trimToWords(subject, 20)}${techClause}${metricsClause}`);

  for (const token of Object.keys(PLACEHOLDER_PROMPTS)) {
    if ([standard, metricsHeavy, concise].some((v) => v.includes(token))) {
      placeholders.push({ token, prompt: PLACEHOLDER_PROMPTS[token] });
    }
  }

  return { original, concise, standard, metricsHeavy, placeholders, issues };
}

function stripOpener(text: string, pattern?: RegExp): string {
  let out = text;
  if (pattern) out = out.replace(new RegExp(pattern.source, "i"), "").trim();
  out = out.replace(/^(?:and|then|also)\s+/i, "");
  out = out.replace(/^[,;:\-–—]\s*/, "");
  // Drop a leading verb so we can substitute a stronger one without duplicating it.
  const first = out.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
  if (ALL_STRONG_VERBS.has(first)) out = out.split(/\s+/).slice(1).join(" ");
  return out.trim();
}

function chooseVerb(original: string, suggested?: string): string {
  if (suggested) return suggested;
  const first = original.trim().split(/\s+/)[0] ?? "";
  const normalized = first.replace(/[^A-Za-z]/g, "");
  if (ALL_STRONG_VERBS.has(normalized.toLowerCase())) {
    return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
  }
  const lower = original.toLowerCase();
  if (/\b(reduc|decreas|cut|optimi|improv|speed|faster)\w*/.test(lower)) return "Reduced";
  if (/\b(build|built|creat|develop|implement|design)\w*/.test(lower)) return "Built";
  if (/\b(lead|led|manag|coordinat|mentor)\w*/.test(lower)) return "Led";
  if (/\b(migrat|port|upgrad|refactor)\w*/.test(lower)) return "Migrated";
  if (/\b(automat|script|pipeline)\w*/.test(lower)) return "Automated";
  if (/\b(analy|research|investigat)\w*/.test(lower)) return "Analyzed";
  if (/\b(launch|ship|releas|deploy)\w*/.test(lower)) return "Shipped";
  return "Delivered";
}

function detectTechnologies(text: string): string[] {
  const lower = text.toLowerCase();
  const hits = new Set<string>();
  for (const surface of TAXONOMY_SURFACES) {
    const node = TAXONOMY_INDEX.get(surface)?.node;
    if (!node || node.category === "soft") continue;
    const escaped = surface.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(?<![A-Za-z0-9+#.])${escaped}(?![A-Za-z0-9+#])`).test(lower)) hits.add(node.canonical);
  }
  return Array.from(hits);
}

function outcomeTemplate(impactNoun: string | null): string {
  const metric = impactNoun ?? "the key metric";
  const template = OUTCOME_TEMPLATES[metric.length % OUTCOME_TEMPLATES.length];
  return template.replace("{metric}", metric);
}

function guessUnit(text: string): string {
  const lower = text.toLowerCase();
  if (/\b(user|customer|client|member)\w*/.test(lower)) return "users";
  if (/\b(request|api|endpoint|traffic)\w*/.test(lower)) return "requests/day";
  if (/\b(record|row|document|file)\w*/.test(lower)) return "records";
  if (/\b(order|transaction|payment)\w*/.test(lower)) return "transactions";
  return "monthly active users";
}

function formatList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function trimToWords(text: string, max: number): string {
  const tokens = words(text);
  if (tokens.length <= max) return text.replace(/[.\s]+$/, "");
  return `${tokens.slice(0, max).join(" ").replace(/[,;]$/, "")}`;
}

function decapitalize(text: string): string {
  if (!text) return text;
  const first = text.split(/\s+/)[0];
  // Preserve acronyms and product names.
  if (first === first.toUpperCase() && first.length > 1) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function finalize(text: string): string {
  return text
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;])/g, "$1")
    .replace(/,\s*—/g, " —")
    .replace(/[.\s]+$/, "")
    .trim();
}

/** Picks the bullets worth rewriting first: weakest signal, highest recoverable value. */
export function selectRewriteTargets(resume: StructuredResume, limit = 6): ResumeBullet[] {
  return [...resume.bullets]
    .map((bullet) => ({ bullet, score: weaknessScore(bullet.text) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.bullet);
}

function weaknessScore(text: string): number {
  let score = 0;
  if (matchWeakOpener(text)) score += 4;
  if (countMetrics(text) === 0) score += 3;
  if (!startsWithStrongVerb(text)) score += 2;
  const n = words(text).length;
  if (n < 8) score += 2;
  if (n > 34) score += 1;
  if (!IMPACT_NOUNS.some((noun) => text.toLowerCase().includes(noun))) score += 1;
  return score;
}

export function buildRewrites(resume: StructuredResume, limit = 6): BulletRewrite[] {
  return selectRewriteTargets(resume, limit).map((bullet) => rewriteBullet(bullet.text));
}

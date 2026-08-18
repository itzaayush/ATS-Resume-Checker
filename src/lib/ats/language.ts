import {
  COMMON_MISSPELLINGS,
  CONFUSABLE_RULES,
  RESUME_WHITELIST,
  SPACING_ERRORS,
  TECH_WHITELIST,
} from "./dictionary";
import { ALL_STRONG_VERBS, FILLER_PHRASES } from "./rubric";
import { SKILL_VOCABULARY } from "./taxonomy";
import { contextAround, levenshtein, similarity, tokenize } from "./text-utils";
import type { SpellingIssue, StructuredResume } from "./types";

/**
 * Correct capitalisation for product and company names. Recruiters read these as a
 * signal of technical care, and some parsers key on exact casing.
 */
export const BRAND_CASING: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  nodejs: "Node.js",
  "node.js": "Node.js",
  reactjs: "React.js",
  nextjs: "Next.js",
  vuejs: "Vue.js",
  angularjs: "AngularJS",
  jquery: "jQuery",
  mysql: "MySQL",
  postgresql: "PostgreSQL",
  postgres: "PostgreSQL",
  mongodb: "MongoDB",
  dynamodb: "DynamoDB",
  graphql: "GraphQL",
  restful: "RESTful",
  github: "GitHub",
  gitlab: "GitLab",
  bitbucket: "Bitbucket",
  linkedin: "LinkedIn",
  kubernetes: "Kubernetes",
  docker: "Docker",
  terraform: "Terraform",
  jenkins: "Jenkins",
  kafka: "Kafka",
  redis: "Redis",
  elasticsearch: "Elasticsearch",
  tensorflow: "TensorFlow",
  pytorch: "PyTorch",
  keras: "Keras",
  numpy: "NumPy",
  pandas: "pandas",
  scikit: "scikit-learn",
  matplotlib: "Matplotlib",
  django: "Django",
  flask: "Flask",
  fastapi: "FastAPI",
  laravel: "Laravel",
  dotnet: ".NET",
  aspnet: "ASP.NET",
  webpack: "webpack",
  eslint: "ESLint",
  npm: "npm",
  ios: "iOS",
  macos: "macOS",
  android: "Android",
  linux: "Linux",
  ubuntu: "Ubuntu",
  windows: "Windows",
  microsoft: "Microsoft",
  google: "Google",
  amazon: "Amazon",
  openai: "OpenAI",
  nvidia: "NVIDIA",
  intel: "Intel",
  oracle: "Oracle",
  salesforce: "Salesforce",
  atlassian: "Atlassian",
  jira: "Jira",
  figma: "Figma",
  html: "HTML",
  css: "CSS",
  sql: "SQL",
  json: "JSON",
  yaml: "YAML",
  api: "API",
  aws: "AWS",
  gcp: "GCP",
  azure: "Azure",
  saas: "SaaS",
  ci: "CI",
  cd: "CD",
  ux: "UX",
  ui: "UI",
};

export interface SpellChecker {
  correct(word: string): boolean;
  suggest(word: string): string[];
  available: boolean;
}

/** Words the general dictionary should never flag on a technical resume. */
const BASE_WHITELIST = new Set<string>([
  ...TECH_WHITELIST,
  ...RESUME_WHITELIST,
  ...SKILL_VOCABULARY,
  ...Object.keys(BRAND_CASING),
  ...ALL_STRONG_VERBS,
]);

let cachedChecker: SpellChecker | null = null;

/**
 * Loaded through a runtime specifier so the build does not require type declarations for
 * these optional packages, and so the bundler leaves them alone.
 */
type SpellModule = {
  default: (dict: { aff: Buffer; dic: Buffer }) => {
    correct(word: string): boolean;
    suggest(word: string): string[];
  };
};

type DictionaryModule = {
  default:
    | { aff: Buffer; dic: Buffer }
    | (() => Promise<{ aff: Buffer; dic: Buffer }>);
};

async function loadOptional<T>(specifier: string): Promise<T> {
  return (await import(/* webpackIgnore: true */ specifier)) as T;
}

/**
 * Loads a Hunspell dictionary when the runtime allows it. The engine degrades to the
 * curated correction map when it does not, so scoring never fails on a missing optional
 * dependency.
 */
export async function getSpellChecker(): Promise<SpellChecker> {
  if (cachedChecker) return cachedChecker;
  try {
    const [spellModule, dictionaryModule] = await Promise.all([
      loadOptional<SpellModule>("nspell"),
      loadOptional<DictionaryModule>("dictionary-en"),
    ]);

    const dictionary = dictionaryModule.default;
    const dict = typeof dictionary === "function" ? await dictionary() : dictionary;
    const spell = spellModule.default(dict);

    cachedChecker = {
      available: true,
      correct: (word) => spell.correct(word),
      suggest: (word) => spell.suggest(word).slice(0, 4),
    };
  } catch {
    cachedChecker = {
      available: false,
      correct: () => true,
      suggest: () => [],
    };
  }
  return cachedChecker;
}

const VOCAB_FOR_SUGGESTIONS = Array.from(
  new Set([...Object.values(COMMON_MISSPELLINGS), ...BASE_WHITELIST]),
).filter((w) => /^[a-zA-Z][a-zA-Z'-]{2,}$/.test(w));

function nearestWords(word: string, limit = 3): string[] {
  const lower = word.toLowerCase();
  const scored: { word: string; score: number }[] = [];
  for (const candidate of VOCAB_FOR_SUGGESTIONS) {
    if (Math.abs(candidate.length - lower.length) > 2) continue;
    const distance = levenshtein(lower, candidate.toLowerCase(), 2);
    if (distance <= 2) scored.push({ word: candidate, score: similarity(lower, candidate.toLowerCase()) });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.word);
}

export interface LanguageReport {
  issues: SpellingIssue[];
  misspellingCount: number;
  grammarCount: number;
  styleCount: number;
  fillerCount: number;
  pronounCount: number;
  tenseIssueCount: number;
  dictionaryAvailable: boolean;
}

export async function analyzeLanguage(resume: StructuredResume): Promise<LanguageReport> {
  const text = resume.normalizedText;
  const issues: SpellingIssue[] = [];
  const seen = new Set<string>();

  const push = (issue: SpellingIssue) => {
    const key = `${issue.kind}:${issue.start}:${issue.word.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    issues.push(issue);
  };

  /* 1. Curated misspellings — zero false positives, highest confidence. */
  const tokens = tokenize(text);
  for (const token of tokens) {
    const correction = COMMON_MISSPELLINGS[token.lower];
    if (!correction) continue;
    push({
      word: token.raw,
      start: token.start,
      end: token.end,
      suggestions: [matchCase(token.raw, correction)],
      kind: "spelling",
      message: `"${token.raw}" is misspelled.`,
      context: contextAround(text, token.start, token.end),
      severity: "critical",
    });
  }

  /* 2. Dictionary pass for anything the curated map does not know. */
  const checker = await getSpellChecker();
  if (checker.available) {
    const checked = new Set<string>();
    const contactSection = resume.sections.find((s) => s.id === "contact");
    const inContactBlock = (index: number) =>
      contactSection ? index >= contactSection.start && index < contactSection.end : false;

    for (const token of tokens) {
      if (token.raw.length < 4) continue;
      if (COMMON_MISSPELLINGS[token.lower]) continue;
      if (isWhitelisted(token.lower)) continue;
      // Emails, URLs, handles and version strings are not prose.
      if (/[\d@./\\]/.test(token.raw)) continue;
      if (token.raw === token.raw.toUpperCase()) continue; // acronyms
      // The contact block is names, cities and handles — none of it is dictionary text.
      if (inContactBlock(token.start)) continue;
      if (isProperNounContext(text, token.start, token.raw)) continue;
      if (checked.has(token.lower)) continue;
      checked.add(token.lower);
      if (checker.correct(token.raw) || checker.correct(token.lower)) continue;

      const unique = Array.from(
        new Set([...checker.suggest(token.raw), ...nearestWords(token.raw)]),
      ).slice(0, 4);

      // An unknown capitalised word with no near match is a proper noun, not a typo.
      const capitalised = /^[A-Z]/.test(token.raw);
      const hasCloseMatch = unique.some(
        (candidate) => levenshtein(token.lower, candidate.toLowerCase(), 2) <= 2,
      );
      if (capitalised && !hasCloseMatch) continue;

      push({
        word: token.raw,
        start: token.start,
        end: token.end,
        suggestions: unique,
        kind: "spelling",
        message: unique.length
          ? `"${token.raw}" is not a recognised word.`
          : `"${token.raw}" is not a recognised word. Verify the spelling or add it to your skills list.`,
        context: contextAround(text, token.start, token.end),
        severity: capitalised ? "important" : "critical",
      });
    }
  } else {
    // Without a dictionary we still catch near-misses against the known vocabulary.
    for (const token of tokens) {
      if (token.raw.length < 6 || isWhitelisted(token.lower) || /[\d@./\\]/.test(token.raw)) continue;
      const near = nearestWords(token.raw, 1);
      if (near.length && near[0].toLowerCase() !== token.lower && levenshtein(token.lower, near[0].toLowerCase(), 1) === 1) {
        push({
          word: token.raw,
          start: token.start,
          end: token.end,
          suggestions: near,
          kind: "spelling",
          message: `"${token.raw}" looks like a misspelling of "${near[0]}".`,
          context: contextAround(text, token.start, token.end),
          severity: "important",
        });
      }
    }
  }

  /* 3. Real-word confusions a spell checker cannot see. */
  for (const rule of CONFUSABLE_RULES) {
    const re = new RegExp(rule.pattern.source, rule.pattern.flags.includes("g") ? rule.pattern.flags : `${rule.pattern.flags}g`);
    let m: RegExpExecArray | null;
    let count = 0;
    while ((m = re.exec(text)) !== null && count < 12) {
      count += 1;
      push({
        word: m[0].trim(),
        start: m.index,
        end: m.index + m[0].length,
        suggestions: [rule.suggestion],
        kind: rule.id === "responsible-for" || rule.id === "utilize" || rule.id === "etc" ? "style" : "confusable",
        message: rule.message,
        context: contextAround(text, m.index, m.index + m[0].length),
        severity: rule.id === "manger" || rule.id === "lead-past" ? "critical" : "important",
      });
    }
  }

  /* 4. Duplicated words — the classic copy-paste artefact. */
  const dupRe = /\b([A-Za-z]{2,})\s+\1\b/gi;
  let dup: RegExpExecArray | null;
  while ((dup = dupRe.exec(text)) !== null) {
    if (["had", "that", "sit"].includes(dup[1].toLowerCase())) continue;
    push({
      word: dup[0],
      start: dup.index,
      end: dup.index + dup[0].length,
      suggestions: [dup[1]],
      kind: "duplication",
      message: `"${dup[1]}" is repeated.`,
      context: contextAround(text, dup.index, dup.index + dup[0].length),
      severity: "important",
    });
  }

  /* 5. Punctuation and spacing defects that survive into the parsed text. */
  const punctuationRules: { re: RegExp; message: string; fix: (m: string) => string }[] = [
    { re: /\s+([,.;:!?])/g, message: "Space before punctuation.", fix: (m) => m.trim() },
    { re: /([a-z])([.!?])([A-Z])/g, message: "Missing space after sentence punctuation.", fix: (m) => m.replace(/([.!?])/, "$1 ") },
    { re: /,{2,}|\.{4,}/g, message: "Repeated punctuation.", fix: () => "," },
    { re: /\(\s+|\s+\)/g, message: "Stray space inside brackets.", fix: (m) => m.trim() },
  ];
  for (const rule of punctuationRules) {
    let m: RegExpExecArray | null;
    let count = 0;
    while ((m = rule.re.exec(text)) !== null && count < 10) {
      count += 1;
      push({
        word: m[0],
        start: m.index,
        end: m.index + m[0].length,
        suggestions: [rule.fix(m[0])],
        kind: "punctuation",
        message: rule.message,
        context: contextAround(text, m.index, m.index + m[0].length),
        severity: "polish",
      });
    }
  }

  /* 6. Brand casing. */
  for (const token of tokens) {
    const correct = BRAND_CASING[token.lower];
    if (!correct || token.raw === correct) continue;
    if (token.raw === token.raw.toUpperCase() && correct === correct.toUpperCase()) continue;
    push({
      word: token.raw,
      start: token.start,
      end: token.end,
      suggestions: [correct],
      kind: "casing",
      message: `Write "${correct}", not "${token.raw}".`,
      context: contextAround(text, token.start, token.end),
      severity: "polish",
    });
  }

  /* 7. Wordy constructions. */
  for (const rule of SPACING_ERRORS) {
    const re = new RegExp(rule.wrong.source, "gi");
    let m: RegExpExecArray | null;
    let count = 0;
    while ((m = re.exec(text)) !== null && count < 6) {
      count += 1;
      push({
        word: m[0],
        start: m.index,
        end: m.index + m[0].length,
        suggestions: [rule.right],
        kind: "style",
        message: `Wordy — "${m[0].trim()}" can be "${rule.right}".`,
        context: contextAround(text, m.index, m.index + m[0].length),
        severity: "polish",
      });
    }
  }

  /* 8. Filler phrases. */
  let fillerCount = 0;
  const lowerText = text.toLowerCase();
  for (const filler of FILLER_PHRASES) {
    let from = 0;
    for (;;) {
      const index = lowerText.indexOf(filler.phrase, from);
      if (index === -1) break;
      from = index + filler.phrase.length;
      fillerCount += 1;
      push({
        word: text.slice(index, index + filler.phrase.length),
        start: index,
        end: index + filler.phrase.length,
        suggestions: [],
        kind: "style",
        message: filler.note,
        context: contextAround(text, index, index + filler.phrase.length),
        severity: "polish",
      });
    }
  }

  /* 9. First-person pronouns. */
  let pronounCount = 0;
  const pronounRe = /\b(I|I'm|I've|me|my|myself|we|our)\b/g;
  let pr: RegExpExecArray | null;
  while ((pr = pronounRe.exec(text)) !== null) {
    pronounCount += 1;
    if (pronounCount > 6) break;
    push({
      word: pr[0],
      start: pr.index,
      end: pr.index + pr[0].length,
      suggestions: ["remove the pronoun and start with a verb"],
      kind: "style",
      message: "Resumes are written in implied first person — drop personal pronouns.",
      context: contextAround(text, pr.index, pr.index + pr[0].length),
      severity: "polish",
    });
  }

  /* 10. Tense consistency inside each role. */
  const tenseIssues = checkTenseConsistency(resume);
  for (const issue of tenseIssues) push(issue);

  /* 11. Sentence-ending punctuation consistency across bullets. */
  const terminated = resume.bullets.filter((b) => /[.]$/.test(b.text.trim())).length;
  const total = resume.bullets.length;
  if (total >= 4 && terminated > 0 && terminated < total) {
    const ratio = terminated / total;
    if (ratio > 0.2 && ratio < 0.8) {
      const offender = resume.bullets.find((b) => /[.]$/.test(b.text.trim()));
      if (offender) {
        push({
          word: offender.text.slice(-40),
          start: offender.start,
          end: offender.end,
          suggestions: ["pick one convention for all bullets"],
          kind: "grammar",
          message: `${terminated} of ${total} bullets end with a period. Be consistent — mixed punctuation reads as careless.`,
          context: contextAround(text, offender.start, offender.end),
          severity: "polish",
        });
      }
    }
  }

  issues.sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || a.start - b.start);

  return {
    issues,
    misspellingCount: issues.filter((i) => i.kind === "spelling").length,
    grammarCount: issues.filter((i) => i.kind === "grammar" || i.kind === "confusable").length,
    styleCount: issues.filter((i) => i.kind === "style" || i.kind === "casing").length,
    fillerCount,
    pronounCount,
    tenseIssueCount: tenseIssues.length,
    dictionaryAvailable: checker.available,
  };
}

function severityRank(severity: SpellingIssue["severity"]): number {
  return severity === "critical" ? 0 : severity === "important" ? 1 : 2;
}

function isWhitelisted(lower: string): boolean {
  if (BASE_WHITELIST.has(lower)) return true;
  if (lower.endsWith("s") && BASE_WHITELIST.has(lower.slice(0, -1))) return true;
  if (lower.includes("-") && lower.split("-").every((part) => BASE_WHITELIST.has(part))) return true;
  return false;
}

/** Capitalised mid-sentence words are usually proper nouns (company or product names). */
function isProperNounContext(text: string, start: number, word: string): boolean {
  if (!/^[A-Z]/.test(word)) return false;
  let i = start - 1;
  while (i >= 0 && /[ \t]/.test(text[i])) i -= 1;
  if (i < 0) return false;
  return !/[.\n!?:]/.test(text[i]);
}

function matchCase(source: string, replacement: string): string {
  if (source === source.toUpperCase()) return replacement.toUpperCase();
  if (/^[A-Z]/.test(source)) return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  return replacement;
}

const PAST_TENSE_RE = /^[a-z]+ed$/;
const GERUND_RE = /^[a-z]+ing$/;

function checkTenseConsistency(resume: StructuredResume): SpellingIssue[] {
  const issues: SpellingIssue[] = [];
  for (const entry of resume.experience) {
    if (entry.bullets.length < 2) continue;
    const isCurrent = entry.dates?.isCurrent ?? false;
    const firstWords = entry.bullets.map((b) => ({
      bullet: b,
      word: b.text.trim().split(/\s+/)[0]?.toLowerCase() ?? "",
    }));

    const past = firstWords.filter((f) => PAST_TENSE_RE.test(f.word) || isIrregularPast(f.word));
    const present = firstWords.filter(
      (f) => !PAST_TENSE_RE.test(f.word) && !isIrregularPast(f.word) && !GERUND_RE.test(f.word) && ALL_STRONG_VERBS.has(f.word.replace(/s$/, "")),
    );
    const gerunds = firstWords.filter((f) => GERUND_RE.test(f.word));

    for (const g of gerunds) {
      issues.push({
        word: g.bullet.text.split(/\s+/)[0],
        start: g.bullet.start,
        end: g.bullet.start + g.word.length,
        suggestions: [g.word.replace(/ing$/, "ed")],
        kind: "grammar",
        message: "Bullets should start with a finite verb, not an -ing form.",
        context: g.bullet.text.slice(0, 90),
        severity: "important",
      });
    }

    if (past.length > 0 && present.length > 0) {
      const minority = past.length <= present.length ? past : present;
      const expected = isCurrent ? "present tense" : "past tense";
      for (const m of minority.slice(0, 2)) {
        issues.push({
          word: m.bullet.text.split(/\s+/)[0],
          start: m.bullet.start,
          end: m.bullet.start + m.word.length,
          suggestions: [],
          kind: "grammar",
          message: `Mixed verb tense inside "${entry.title ?? entry.company ?? "this role"}". A ${
            isCurrent ? "current" : "past"
          } role should use ${expected} throughout.`,
          context: m.bullet.text.slice(0, 90),
          severity: "important",
        });
      }
    }
  }
  return issues;
}

const IRREGULAR_PAST = new Set([
  "led", "built", "ran", "wrote", "drove", "grew", "taught", "brought", "bought", "sought",
  "spent", "won", "cut", "set", "chose", "rose", "held", "kept", "met", "sold", "told",
  "oversaw", "rebuilt", "began", "took", "made", "gave", "found", "shipped",
]);

function isIrregularPast(word: string): boolean {
  return IRREGULAR_PAST.has(word);
}

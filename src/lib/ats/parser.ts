import {
  CANONICAL_HEADINGS,
  CREATIVE_HEADING_PATTERNS,
  DATE_PATTERNS,
  LEVEL_ORDER,
} from "./rubric";
import { SKILL_TAXONOMY, TAXONOMY_INDEX, TAXONOMY_SURFACES } from "./taxonomy";
import { BULLET_GLYPHS, normalizeText, toLines, words } from "./text-utils";
import type {
  ContactBlock,
  DateFormatStyle,
  DateRange,
  EducationEntry,
  ExperienceEntry,
  LayoutSignals,
  ParsedSection,
  SectionId,
  SeniorityLevel,
  SkillMention,
  StructuredResume,
} from "./types";

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE_RE =
  /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d{3,5}[\s.-]?\d{3,4}(?:[\s.-]?\d{2,4})?/;
const LINKEDIN_RE = /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/(?:in|pub)\/[A-Za-z0-9_%-]+/i;
const GITHUB_RE = /(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_-]+/i;
const URL_RE = /(?:https?:\/\/)?(?:www\.)?[A-Za-z0-9-]+\.(?:com|dev|io|net|org|me|xyz|app|co|ai|tech)(?:\/[^\s,;]*)?/i;
const LOCATION_RE =
  /\b([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+)*),\s*([A-Z]{2}|[A-Z][a-zA-Z]+)\b/;

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5,
  jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

const DEGREE_RE =
  /\b(b\.?\s?tech|m\.?\s?tech|b\.?\s?e\.?|m\.?\s?e\.?|b\.?\s?sc|m\.?\s?sc|b\.?\s?s\.?|m\.?\s?s\.?|b\.?\s?a\.?|m\.?\s?a\.?|mba|ph\.?\s?d|bachelor(?:'s)?|master(?:'s)?|doctorate|associate(?:'s)?|diploma|b\.?\s?c\.?\s?a|m\.?\s?c\.?\s?a)\b/i;

const SENIORITY_TITLE_HINTS: { level: SeniorityLevel; patterns: RegExp[] }[] = [
  { level: "principal", patterns: [/\bprincipal\b/i, /\bdistinguished\b/i, /\bfellow\b/i, /\barchitect\b/i, /\bl7\b/i, /\bl8\b/i] },
  { level: "staff", patterns: [/\bstaff\b/i, /\bl6\b/i, /\bsde\s?(?:iii|3)\b/i, /\bteam lead\b/i, /\bengineering manager\b/i] },
  { level: "senior", patterns: [/\bsenior\b/i, /\bsr\.?\b/i, /\blead\b/i, /\bl5\b/i, /\bsde\s?(?:ii|2)\b/i] },
  { level: "mid", patterns: [/\bsoftware engineer ii\b/i, /\bengineer ii\b/i, /\bl4\b/i, /\bsde\s?(?:ii|2)\b/i, /\bmid[- ]level\b/i] },
  { level: "entry", patterns: [/\bjunior\b/i, /\bjr\.?\b/i, /\bassociate\b/i, /\bgraduate\b/i, /\bl3\b/i, /\bsde\s?(?:i|1)\b/i, /\bentry[- ]level\b/i] },
  { level: "intern", patterns: [/\bintern\b/i, /\btrainee\b/i, /\bapprentice\b/i, /\bco[- ]?op\b/i] },
];

export interface ParseInput {
  text: string;
  layout: Partial<LayoutSignals>;
}

export function parseResume({ text, layout }: ParseInput): StructuredResume {
  const normalizedText = normalizeText(text);
  const lines = toLines(normalizedText);

  const sections = splitSections(normalizedText, lines);
  const contact = extractContact(normalizedText, lines, sections);
  const experience = extractEntries(sections, "experience");
  const projects = extractEntries(sections, "projects");
  const education = extractEducation(sections);
  const bullets = [...experience.flatMap((e) => e.bullets), ...projects.flatMap((p) => p.bullets)];
  const skills = extractSkills(normalizedText, sections);
  const certifications = extractCertifications(sections);

  const layoutSignals = buildLayoutSignals(normalizedText, lines, layout);
  const totalExperienceMonths = sumExperienceMonths(experience);
  const { level, signals } = inferLevel({ experience, totalExperienceMonths, text: normalizedText });

  return {
    contact,
    sections,
    experience,
    education,
    skills,
    projects,
    certifications,
    bullets,
    rawText: text,
    normalizedText,
    layout: layoutSignals,
    inferredLevel: level,
    inferredLevelSignals: signals,
    totalExperienceMonths,
  };
}

/* ------------------------------------------------------------------ sections */

interface HeadingHit {
  id: SectionId;
  heading: string;
  canonical: boolean;
  lineIndex: number;
  start: number;
}

const HEADING_LOOKUP = new Map<string, SectionId>();
for (const [id, variants] of Object.entries(CANONICAL_HEADINGS)) {
  for (const variant of variants) HEADING_LOOKUP.set(variant, id as SectionId);
}

function headingKey(line: string): string {
  return line
    .replace(/[^A-Za-z\s&/'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function detectHeading(rawLine: string): { id: SectionId; canonical: boolean } | null {
  const line = rawLine.trim();
  if (!line || line.length > 64) return null;
  if (/[.;]$/.test(line)) return null;

  const key = headingKey(line);
  if (!key || key.split(" ").length > 5) return null;

  const exact = HEADING_LOOKUP.get(key);
  if (exact) return { id: exact, canonical: true };

  // "TECHNICAL SKILLS & TOOLS" style headings with trailing noise.
  for (const [variant, id] of HEADING_LOOKUP) {
    if (key === variant || key.startsWith(`${variant} `) || key.endsWith(` ${variant}`)) {
      const isShout = line === line.toUpperCase() && /[A-Z]/.test(line);
      const isTitle = /^[A-Z]/.test(line);
      if (isShout || isTitle) return { id, canonical: true };
    }
  }

  for (const rule of CREATIVE_HEADING_PATTERNS) {
    // Leading articles are cosmetic: "The Toolkit" and "Toolkit" are the same heading.
    const withoutArticle = line.replace(/^(the|my|our|a)\s+/i, "");
    if (rule.pattern.test(line) || rule.pattern.test(withoutArticle)) {
      return { id: rule.canonical, canonical: false };
    }
  }

  return null;
}

function splitSections(
  text: string,
  lines: { text: string; start: number; end: number }[],
): ParsedSection[] {
  const hits: HeadingHit[] = [];
  lines.forEach((line, index) => {
    const detected = detectHeading(line.text);
    if (!detected) return;
    // A heading must be followed by content, not another heading immediately at EOF.
    hits.push({
      id: detected.id,
      heading: line.text.trim(),
      canonical: detected.canonical,
      lineIndex: index,
      start: line.start,
    });
  });

  const sections: ParsedSection[] = [];

  if (hits.length === 0 || hits[0].start > 0) {
    const end = hits.length ? hits[0].start : text.length;
    sections.push(makeSection("contact", null, true, 0, end, text));
  }

  hits.forEach((hit, i) => {
    const bodyStart = lines[hit.lineIndex].end + 1;
    const end = i + 1 < hits.length ? hits[i + 1].start : text.length;
    sections.push(makeSection(hit.id, hit.heading, hit.canonical, Math.min(bodyStart, end), end, text));
  });

  return sections;
}

function makeSection(
  id: SectionId,
  heading: string | null,
  canonical: boolean,
  start: number,
  end: number,
  text: string,
): ParsedSection {
  const body = text.slice(start, end);
  return {
    id,
    heading,
    headingIsCanonical: canonical,
    start,
    end,
    body,
    lines: body.split("\n").map((l) => l.trim()).filter(Boolean),
  };
}

export function sectionsOf(sections: ParsedSection[], id: SectionId): ParsedSection[] {
  return sections.filter((s) => s.id === id);
}

/* ------------------------------------------------------------------- contact */

function extractContact(
  text: string,
  lines: { text: string; start: number; end: number }[],
  sections: ParsedSection[],
): ContactBlock {
  const head = text.slice(0, Math.min(text.length, 900));
  const email = head.match(EMAIL_RE)?.[0] ?? text.match(EMAIL_RE)?.[0] ?? null;
  const linkedin = text.match(LINKEDIN_RE)?.[0] ?? null;
  const github = text.match(GITHUB_RE)?.[0] ?? null;

  let phone: string | null = null;
  for (const candidate of head.match(new RegExp(PHONE_RE.source, "g")) ?? []) {
    const digits = candidate.replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 15 && !/^(19|20)\d{2}$/.test(digits)) {
      phone = candidate.trim();
      break;
    }
  }

  let website: string | null = null;
  for (const candidate of head.match(new RegExp(URL_RE.source, "gi")) ?? []) {
    if (/linkedin\.com|github\.com/i.test(candidate)) continue;
    if (email && email.includes(candidate)) continue;
    website = candidate;
    break;
  }

  const contactSection = sections.find((s) => s.id === "contact");
  const candidateLines = (contactSection?.lines ?? lines.slice(0, 8).map((l) => l.text.trim())).filter(Boolean);

  let name: string | null = null;
  for (const line of candidateLines.slice(0, 5)) {
    if (EMAIL_RE.test(line) || /\d{3}/.test(line)) continue;
    const tokens = line.split(/\s+/).filter(Boolean);
    if (tokens.length < 2 || tokens.length > 5) continue;
    const looksLikeName = tokens.every((t) => /^[A-Z][a-zA-Z.'-]*$/.test(t) || /^[A-Z.]{1,4}$/.test(t));
    const allCapsName = line === line.toUpperCase() && tokens.length <= 4 && /^[A-Z\s.'-]+$/.test(line);
    if (looksLikeName || allCapsName) {
      name = line.replace(/\s+/g, " ").trim();
      break;
    }
  }

  const location = head.match(LOCATION_RE)?.[0] ?? null;

  // The headline is the first substantive line after the name that is not contact data.
  let headline: string | null = null;
  for (const line of candidateLines) {
    if (name && line === name) continue;
    if (EMAIL_RE.test(line) || LINKEDIN_RE.test(line) || /\d{3}[-.\s]?\d{3}/.test(line)) continue;
    if (line.length < 6 || line.length > 90) continue;
    headline = line;
    break;
  }

  return { name, email, phone, location, linkedin, github, website, headline };
}

/* ------------------------------------------------------------------ entries */

function isBulletLine(line: string): boolean {
  const trimmed = line.trimStart();
  if (!trimmed) return false;
  const first = trimmed[0];
  if (BULLET_GLYPHS.includes(first)) {
    // "-" also starts date ranges like "- 2019", so require a following word character.
    return /^[^\w\s]\s*\w|^-\s+\w/.test(trimmed);
  }
  return false;
}

function stripBullet(line: string): string {
  return line.replace(/^\s*[^\w\s]{1,2}\s*/, "").trim();
}

export function parseDateRange(line: string): DateRange | null {
  const presentMatch = line.match(DATE_PATTERNS.present);
  const monthYear = Array.from(line.matchAll(new RegExp(DATE_PATTERNS.monthYear.source, "gi")));
  const numeric = Array.from(line.matchAll(new RegExp(DATE_PATTERNS.numericMonthYear.source, "g")));
  const loose = Array.from(line.matchAll(new RegExp(DATE_PATTERNS.looseNumericMonthYear.source, "g")));
  const apostrophe = Array.from(line.matchAll(new RegExp(DATE_PATTERNS.apostropheYear.source, "g")));
  const years = Array.from(line.matchAll(new RegExp(DATE_PATTERNS.yearOnly.source, "g")));

  let formatStyle: DateFormatStyle | null = null;
  const points: { month: number | null; year: number }[] = [];

  if (monthYear.length) {
    formatStyle = "MonthYear";
    for (const m of monthYear) {
      const parts = m[0].replace(/\./g, "").split(/\s+/);
      points.push({ month: MONTHS[parts[0].toLowerCase()] ?? null, year: Number(parts[1]) });
    }
  } else if (numeric.length) {
    formatStyle = "MM/YYYY";
    for (const m of numeric) {
      const [mm, yyyy] = m[0].split(/[/-]/);
      points.push({ month: Number(mm), year: Number(yyyy) });
    }
  } else if (loose.length) {
    formatStyle = "MM/YYYY";
    for (const m of loose) {
      const [mm, yyyy] = m[0].split(/[/-]/);
      points.push({ month: Number(mm), year: Number(yyyy) });
    }
  } else if (apostrophe.length) {
    formatStyle = "ApostropheYear";
    for (const m of apostrophe) {
      const yy = Number(m[0].replace(/['’]/, ""));
      points.push({ month: null, year: yy > 50 ? 1900 + yy : 2000 + yy });
    }
  } else if (years.length) {
    formatStyle = "YearOnly";
    for (const m of years) points.push({ month: null, year: Number(m[0]) });
  }

  if (!points.length && !presentMatch) return null;

  const isCurrent = Boolean(presentMatch);
  const startPoint = points[0] ?? null;
  const endPoint = isCurrent ? null : points[1] ?? null;

  let months: number | null = null;
  if (startPoint) {
    const now = new Date();
    const endYear = isCurrent ? now.getFullYear() : endPoint?.year ?? null;
    const endMonth = isCurrent ? now.getMonth() + 1 : endPoint?.month ?? 12;
    if (endYear) {
      months = (endYear - startPoint.year) * 12 + (endMonth - (startPoint.month ?? 1)) + 1;
      if (months < 0) months = null;
    }
  }

  return {
    raw: line.trim(),
    startMonth: startPoint?.month ?? null,
    startYear: startPoint?.year ?? null,
    endMonth: isCurrent ? null : endPoint?.month ?? null,
    endYear: isCurrent ? null : endPoint?.year ?? null,
    isCurrent,
    months,
    formatStyle,
  };
}

function looksLikeEntryHeader(line: string): boolean {
  if (!line.trim() || isBulletLine(line)) return false;
  if (line.trim().length > 140) return false;
  const hasDate = parseDateRange(line) !== null;
  const hasSeparator = /\s[|•·–—]\s|\s{2,}|,\s/.test(line);
  const capitalised = /^[A-Z0-9]/.test(line.trim());
  return capitalised && (hasDate || hasSeparator);
}

function extractEntries(sections: ParsedSection[], id: SectionId): ExperienceEntry[] {
  const entries: ExperienceEntry[] = [];
  for (const section of sectionsOf(sections, id)) {
    const sectionLines = toLines(section.body).map((l) => ({
      ...l,
      start: l.start + section.start,
      end: l.end + section.start,
    }));

    let current: ExperienceEntry | null = null;
    let pendingHeaderLines: string[] = [];

    const flush = () => {
      if (current) {
        current.raw = pendingHeaderLines.join(" | ") || current.raw;
        entries.push(current);
      }
    };

    for (const line of sectionLines) {
      const raw = line.text;
      if (!raw.trim()) continue;

      if (isBulletLine(raw)) {
        if (!current) {
          current = emptyEntry(raw, line.start);
          pendingHeaderLines = [];
        }
        const cleaned = stripBullet(raw);
        if (cleaned.length >= 3) {
          current.bullets.push({
            text: cleaned,
            start: line.start + (raw.length - raw.trimStart().length),
            end: line.end,
            entryIndex: entries.length,
            section: id,
          });
        }
        continue;
      }

      if (looksLikeEntryHeader(raw) && (!current || current.bullets.length > 0 || current.dates)) {
        flush();
        current = emptyEntry(raw, line.start);
        pendingHeaderLines = [raw.trim()];
        applyHeaderLine(current, raw);
        continue;
      }

      if (current) {
        if (!current.dates) {
          const dates = parseDateRange(raw);
          if (dates) current.dates = dates;
        }
        if (pendingHeaderLines.length < 3 && current.bullets.length === 0) {
          pendingHeaderLines.push(raw.trim());
          applyHeaderLine(current, raw);
        } else if (raw.trim().length > 24) {
          // Prose paragraph inside a role still counts as a bullet for content scoring.
          current.bullets.push({
            text: raw.trim(),
            start: line.start,
            end: line.end,
            entryIndex: entries.length,
            section: id,
          });
        }
        current.end = line.end;
      } else if (raw.trim().length > 0) {
        current = emptyEntry(raw, line.start);
        pendingHeaderLines = [raw.trim()];
        applyHeaderLine(current, raw);
      }
    }
    flush();
  }

  return entries.map((entry, index) => ({
    ...entry,
    bullets: entry.bullets.map((b) => ({ ...b, entryIndex: index })),
    confidence: scoreEntryConfidence(entry),
  }));
}

function emptyEntry(raw: string, start: number): ExperienceEntry {
  return {
    raw: raw.trim(),
    title: null,
    company: null,
    location: null,
    dates: null,
    bullets: [],
    start,
    end: start + raw.length,
    confidence: 0,
  };
}

const TITLE_HINT_RE =
  /\b(engineer|developer|manager|analyst|scientist|designer|architect|consultant|intern|lead|director|specialist|administrator|associate|officer|coordinator|technician|researcher|founder|owner)\b/i;

function applyHeaderLine(entry: ExperienceEntry, raw: string) {
  const line = raw.trim();
  const dates = parseDateRange(line);
  if (dates && !entry.dates) entry.dates = dates;

  const withoutDate = dates ? line.replace(dates.raw === line ? line : "", "").trim() : line;
  const parts = (withoutDate || line)
    .split(/\s+[|•·–—]\s+|\s{2,}|\s+at\s+|,\s(?=[A-Z])/)
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !/^\(?\d/.test(p));

  for (const part of parts) {
    if (!entry.title && TITLE_HINT_RE.test(part)) {
      entry.title = part;
      continue;
    }
    if (!entry.location && LOCATION_RE.test(part) && part.length < 40) {
      entry.location = part;
      continue;
    }
    if (!entry.company && part.length > 1 && part.length < 60 && /^[A-Z]/.test(part)) {
      entry.company = part;
    }
  }

  if (!entry.title && parts.length && TITLE_HINT_RE.test(line)) entry.title = parts[0];
}

function scoreEntryConfidence(entry: ExperienceEntry): number {
  let score = 0.25;
  if (entry.title) score += 0.25;
  if (entry.company) score += 0.2;
  if (entry.dates?.startYear) score += 0.2;
  if (entry.bullets.length >= 2) score += 0.1;
  return Math.min(1, score);
}

/* ---------------------------------------------------------------- education */

function extractEducation(sections: ParsedSection[]): EducationEntry[] {
  const out: EducationEntry[] = [];
  for (const section of sectionsOf(sections, "education")) {
    let buffer: string[] = [];
    const flush = () => {
      if (!buffer.length) return;
      const raw = buffer.join(" ");
      const degree = raw.match(DEGREE_RE)?.[0] ?? null;
      const gpaMatch = raw.match(/\b(?:gpa|cgpa)\s*[:\-]?\s*(\d(?:\.\d{1,2})?)(?:\s*\/\s*(\d(?:\.\d{1,2})?))?/i);
      const institution =
        buffer.find((l) => /\b(university|college|institute|school|academy|polytechnic|iit|nit|bits)\b/i.test(l)) ?? null;
      out.push({
        raw,
        degree,
        institution: institution ? institution.replace(/\s{2,}/g, " ").trim() : null,
        dates: parseDateRange(raw),
        gpa: gpaMatch ? Number(gpaMatch[1]) : null,
        confidence: (degree ? 0.5 : 0.2) + (institution ? 0.4 : 0) + (gpaMatch ? 0.1 : 0),
      });
      buffer = [];
    };

    for (const line of section.lines) {
      if (!line.trim()) {
        flush();
        continue;
      }
      if (DEGREE_RE.test(line) && buffer.length > 1) flush();
      buffer.push(line.trim());
    }
    flush();
  }
  return out;
}

function extractCertifications(sections: ParsedSection[]): string[] {
  const out: string[] = [];
  for (const section of sectionsOf(sections, "certifications")) {
    for (const line of section.lines) {
      const cleaned = stripBullet(line);
      if (cleaned.length > 3) out.push(cleaned);
    }
  }
  return out;
}

/* -------------------------------------------------------------------- skills */

function extractSkills(text: string, sections: ParsedSection[]): SkillMention[] {
  const lower = text.toLowerCase();
  const skillRanges = sections.filter((s) => s.id === "skills").map((s) => [s.start, s.end] as const);
  const expRanges = sections.filter((s) => s.id === "experience").map((s) => [s.start, s.end] as const);
  const projRanges = sections.filter((s) => s.id === "projects").map((s) => [s.start, s.end] as const);
  const sumRanges = sections.filter((s) => s.id === "summary").map((s) => [s.start, s.end] as const);

  const inRange = (index: number, ranges: readonly (readonly [number, number])[]) =>
    ranges.some(([s, e]) => index >= s && index < e);

  const found = new Map<string, SkillMention>();

  for (const surface of TAXONOMY_SURFACES) {
    const entry = TAXONOMY_INDEX.get(surface);
    if (!entry) continue;
    const escaped = surface.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Word boundaries fail for "c++" and "c#", so guard with non-word lookarounds instead.
    const re = new RegExp(`(?<![A-Za-z0-9+#.])${escaped}(?![A-Za-z0-9+#])`, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(lower)) !== null) {
      const key = entry.node.canonical;
      const existing = found.get(key) ?? {
        canonical: key,
        surface: m[0],
        category: entry.node.category,
        inSkillsSection: false,
        inExperience: false,
        inProjects: false,
        inSummary: false,
        occurrences: 0,
      };
      existing.occurrences += 1;
      if (inRange(m.index, skillRanges)) existing.inSkillsSection = true;
      if (inRange(m.index, expRanges)) existing.inExperience = true;
      if (inRange(m.index, projRanges)) existing.inProjects = true;
      if (inRange(m.index, sumRanges)) existing.inSummary = true;
      found.set(key, existing);
    }
  }

  return Array.from(found.values()).sort((a, b) => b.occurrences - a.occurrences);
}

/* -------------------------------------------------------------------- layout */

function buildLayoutSignals(
  text: string,
  lines: { text: string }[],
  partial: Partial<LayoutSignals>,
): LayoutSignals {
  const wordCount = words(text).length;
  const nonStandardBullets = new Set<string>();
  const emoji = new Set<string>();

  const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}]/gu;
  for (const m of text.matchAll(emojiRe)) emoji.add(m[0]);

  for (const line of lines) {
    const trimmed = line.text.trimStart();
    if (!trimmed) continue;
    const first = trimmed[0];
    if (BULLET_GLYPHS.includes(first) && !["\u2022", "-", "*", "\u25CF", "\u00B7"].includes(first)) {
      nonStandardBullets.add(first);
    }
  }

  // Two chunks of text separated by a wide gutter is the signature of a two-column layout.
  const gutterLines = lines.filter((l) => /\S {4,}\S/.test(l.text) && l.text.trim().length > 24);
  const columnEvidence = gutterLines.slice(0, 4).map((l) => l.text.trim().slice(0, 90));
  const multiColumnSuspected =
    partial.multiColumnSuspected ?? gutterLines.length >= Math.max(6, lines.length * 0.18);

  const tableSuspected =
    partial.tableSuspected ??
    (/(\|[^|\n]{2,}\|)|(\t{2,})/.test(text) || gutterLines.length > lines.length * 0.3);

  const corruptionMatches = text.match(/[\uFFFD]|\b(?:NULL|null)\b|[^\S\n]{1}[a-z]{1}[^\S\n]{1}(?=[a-z]{1}[^\S\n])/g);
  const glyphCorruption = corruptionMatches ? corruptionMatches.length : 0;

  const excessiveWhitespaceRuns = (text.match(/\n{3,}/g) ?? []).length;

  return {
    pageCount: partial.pageCount ?? Math.max(1, Math.ceil(wordCount / 500)),
    wordCount,
    charCount: text.length,
    hasTextLayer: partial.hasTextLayer ?? text.trim().length > 0,
    usedOcr: partial.usedOcr ?? false,
    multiColumnSuspected,
    columnEvidence,
    tableSuspected,
    glyphCorruption,
    nonStandardBulletChars: Array.from(nonStandardBullets),
    emojiOrIconChars: Array.from(emoji),
    imageOnlyPages: partial.imageOnlyPages ?? 0,
    headerFooterSuspected: partial.headerFooterSuspected ?? false,
    excessiveWhitespaceRuns,
    fonts: partial.fonts ?? [],
    unsafeFonts: partial.unsafeFonts ?? [],
    producer: partial.producer ?? null,
    encrypted: partial.encrypted ?? false,
  };
}

/* --------------------------------------------------------------------- level */

function sumExperienceMonths(entries: ExperienceEntry[]): number | null {
  const intervals = entries
    .map((e) => e.dates)
    .filter((d): d is DateRange => Boolean(d?.startYear))
    .map((d) => {
      const now = new Date();
      const startAbs = (d.startYear as number) * 12 + (d.startMonth ?? 1);
      const endAbs = d.isCurrent
        ? now.getFullYear() * 12 + now.getMonth() + 1
        : (d.endYear ?? d.startYear ?? 0) * 12 + (d.endMonth ?? 12);
      return [startAbs, Math.max(startAbs, endAbs)] as const;
    })
    .sort((a, b) => a[0] - b[0]);

  if (!intervals.length) return null;

  // Merge overlapping tenures so concurrent roles are not double counted.
  let total = 0;
  let [cs, ce] = intervals[0];
  for (let i = 1; i < intervals.length; i += 1) {
    const [s, e] = intervals[i];
    if (s <= ce) {
      ce = Math.max(ce, e);
    } else {
      total += ce - cs;
      cs = s;
      ce = e;
    }
  }
  total += ce - cs;
  return total;
}

function inferLevel(input: {
  experience: ExperienceEntry[];
  totalExperienceMonths: number | null;
  text: string;
}): { level: SeniorityLevel; signals: string[] } {
  const signals: string[] = [];
  const titles = input.experience.map((e) => e.title ?? e.raw).join(" \n ");

  let titleLevel: SeniorityLevel | null = null;
  for (const hint of SENIORITY_TITLE_HINTS) {
    if (hint.patterns.some((p) => p.test(titles))) {
      titleLevel = hint.level;
      signals.push(`Job titles read as ${hint.level} level`);
      break;
    }
  }

  const years = input.totalExperienceMonths ? input.totalExperienceMonths / 12 : null;
  let tenureLevel: SeniorityLevel = "entry";
  if (years === null) {
    tenureLevel = input.experience.length === 0 ? "entry" : "mid";
  } else if (years < 0.75) tenureLevel = "intern";
  else if (years < 2.5) tenureLevel = "entry";
  else if (years < 5.5) tenureLevel = "mid";
  else if (years < 9) tenureLevel = "senior";
  else if (years < 13) tenureLevel = "staff";
  else tenureLevel = "principal";

  if (years !== null) signals.push(`${years.toFixed(1)} years of dated experience detected`);

  const declaredYears = input.text.match(/\b(\d{1,2})\+?\s*years?\s+of\s+(?:professional\s+)?experience\b/i);
  if (declaredYears) signals.push(`Resume states ${declaredYears[1]}+ years of experience`);

  const level =
    titleLevel && LEVEL_ORDER.indexOf(titleLevel) > LEVEL_ORDER.indexOf(tenureLevel)
      ? titleLevel
      : tenureLevel;

  if (!signals.length) signals.push("No dated roles found; defaulted to entry level");
  return { level, signals };
}

export const SKILL_CANONICALS = SKILL_TAXONOMY.map((s) => s.canonical);

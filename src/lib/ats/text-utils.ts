/**
 * Deterministic text primitives shared by every scoring check.
 * No dependency here may be async or model-backed — the rubric must stay reproducible.
 */

export const BULLET_GLYPHS = [
  "\u2022",
  "\u25CF",
  "\u25CB",
  "\u25AA",
  "\u25AB",
  "\u2023",
  "\u2043",
  "\u2219",
  "\u00B7",
  "-",
  "*",
  "\u2013",
  "\u2014",
  "\u27A4",
  "\u279C",
  "\u2794",
  "\u25B8",
  "\u2756",
  "\u2726",
  "\u2605",
  "\u2714",
  "\u2713",
  "\u00BB",
  "\u203A",
];

/** Glyphs that survive most parsers. Anything else degrades to noise. */
export const SAFE_BULLET_GLYPHS = new Set(["\u2022", "-", "*", "\u25CF", "\u00B7"]);

const LIGATURE_MAP: Record<string, string> = {
  "\uFB00": "ff",
  "\uFB01": "fi",
  "\uFB02": "fl",
  "\uFB03": "ffi",
  "\uFB04": "ffl",
  "\uFB05": "st",
  "\uFB06": "st",
};

const SMART_PUNCT_MAP: Record<string, string> = {
  "\u2018": "'",
  "\u2019": "'",
  "\u201A": "'",
  "\u201B": "'",
  "\u201C": '"',
  "\u201D": '"',
  "\u201E": '"',
  "\u2032": "'",
  "\u2033": '"',
  "\u00A0": " ",
  "\u2007": " ",
  "\u202F": " ",
  "\u2009": " ",
  "\u200A": " ",
  "\u2010": "-",
  "\u2011": "-",
  "\u2212": "-",
};

/**
 * Normalizes extracted text without changing character offsets where possible.
 * Ligatures are the one exception; they are expanded because ATS parsers do the same.
 */
export function normalizeText(input: string): string {
  let out = input.replace(/\r\n?/g, "\n");
  out = out.replace(/[\uFB00-\uFB06]/g, (m) => LIGATURE_MAP[m] ?? m);
  out = out.replace(/[\u2018\u2019\u201A\u201B\u201C\u201D\u201E\u2032\u2033\u00A0\u2007\u202F\u2009\u200A\u2010\u2011\u2212]/g, (m) => SMART_PUNCT_MAP[m] ?? m);
  out = out.replace(/\u00AD/g, "");
  out = out.replace(/[\t\f\v]+/g, " ");
  out = out.replace(/ {2,}/g, (m) => (m.length > 8 ? "  " : " "));
  out = out.replace(/\n{3,}/g, "\n\n");
  return out;
}

export function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function toLines(text: string): { text: string; start: number; end: number }[] {
  const lines: { text: string; start: number; end: number }[] = [];
  let cursor = 0;
  for (const raw of text.split("\n")) {
    lines.push({ text: raw, start: cursor, end: cursor + raw.length });
    cursor += raw.length + 1;
  }
  return lines;
}

const WORD_RE = /[A-Za-z][A-Za-z'’.\-+#/]*[A-Za-z+#]|[A-Za-z]/g;

export interface Token {
  raw: string;
  lower: string;
  start: number;
  end: number;
}

export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(WORD_RE.source, "g");
  while ((m = re.exec(text)) !== null) {
    tokens.push({
      raw: m[0],
      lower: m[0].toLowerCase(),
      start: m.index,
      end: m.index + m[0].length,
    });
  }
  return tokens;
}

export function words(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/**
 * Lightweight, dependency-free stemmer. Not linguistically perfect — deliberately
 * conservative so that "managed"/"manages"/"managing" collapse but "management" does not
 * get mangled into a false match.
 */
export function lemma(word: string): string {
  const w = word.toLowerCase();
  if (w.length <= 3) return w;
  if (IRREGULAR_VERBS[w]) return IRREGULAR_VERBS[w];
  if (w.endsWith("ies") && w.length > 4) return `${w.slice(0, -3)}y`;
  if (w.endsWith("ied") && w.length > 4) return `${w.slice(0, -3)}y`;
  if (w.endsWith("sses") || w.endsWith("shes") || w.endsWith("ches") || w.endsWith("xes")) {
    return w.slice(0, -2);
  }
  if (w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us") && !w.endsWith("is")) {
    return w.slice(0, -1);
  }
  if (w.endsWith("ing") && w.length > 5) {
    const stem = w.slice(0, -3);
    if (/([bcdfgklmnprstvz])\1$/.test(stem)) return stem.slice(0, -1);
    if (/[^aeiou][aeiou][^aeiouwxy]$/.test(stem)) return `${stem}e`;
    return stem;
  }
  if (w.endsWith("ed") && w.length > 4) {
    const stem = w.slice(0, -2);
    if (/([bcdfgklmnprstvz])\1$/.test(stem)) return stem.slice(0, -1);
    if (/[^aeiou][aeiou][^aeiouwxy]$/.test(stem)) return `${stem}e`;
    return stem;
  }
  return w;
}

const IRREGULAR_VERBS: Record<string, string> = {
  led: "lead",
  built: "build",
  ran: "run",
  wrote: "write",
  drove: "drive",
  grew: "grow",
  taught: "teach",
  brought: "bring",
  bought: "buy",
  sought: "seek",
  spent: "spend",
  won: "win",
  cut: "cut",
  set: "set",
  shipped: "ship",
  chose: "choose",
  rose: "rise",
  held: "hold",
  kept: "keep",
  met: "meet",
  sold: "sell",
  told: "tell",
  oversaw: "oversee",
  undertook: "undertake",
  rebuilt: "rebuild",
};

export function levenshtein(a: string, b: string, max = Number.POSITIVE_INFINITY): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j += 1) prev[j] = j;
  for (let i = 1; i <= m; i += 1) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return max + 1;
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }
  return prev[n];
}

/** Damerau-style adjacency check used to rank spelling suggestions. */
export function similarity(a: string, b: string): number {
  const distance = levenshtein(a, b);
  const longest = Math.max(a.length, b.length);
  return longest === 0 ? 1 : 1 - distance / longest;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const item of a) if (b.has(item)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Cosine similarity over bag-of-lemmas vectors. This is the deterministic stand-in for
 * embedding similarity so the score never depends on a network call.
 */
export function cosineLemmaSimilarity(a: string, b: string): number {
  const va = lemmaVector(a);
  const vb = lemmaVector(b);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [k, v] of va) {
    na += v * v;
    const other = vb.get(k);
    if (other) dot += v * other;
  }
  for (const v of vb.values()) nb += v * v;
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function lemmaVector(text: string): Map<string, number> {
  const vec = new Map<string, number>();
  for (const token of tokenize(text)) {
    if (STOP_WORDS.has(token.lower)) continue;
    const key = lemma(token.lower);
    vec.set(key, (vec.get(key) ?? 0) + 1);
  }
  return vec;
}

export const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "than", "so", "as", "of", "to", "in", "on",
  "at", "by", "for", "with", "about", "against", "between", "into", "through", "during", "before",
  "after", "above", "below", "from", "up", "down", "out", "off", "over", "under", "again", "further",
  "once", "here", "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more",
  "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "too", "very", "can",
  "will", "just", "should", "now", "i", "me", "my", "we", "our", "you", "your", "he", "she", "it",
  "its", "they", "them", "their", "this", "that", "these", "those", "am", "is", "are", "was", "were",
  "be", "been", "being", "have", "has", "had", "having", "do", "does", "did", "doing", "would",
  "could", "shall", "may", "might", "must", "also", "via", "per", "etc",
]);

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** Stable, dependency-free hash used for idempotency keys and cache keys. */
export function hashString(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export function contextAround(text: string, start: number, end: number, radius = 48): string {
  const from = Math.max(0, start - radius);
  const to = Math.min(text.length, end + radius);
  const prefix = from > 0 ? "…" : "";
  const suffix = to < text.length ? "…" : "";
  return `${prefix}${text.slice(from, to).replace(/\s+/g, " ").trim()}${suffix}`;
}

export function uniqueBy<T, K>(items: T[], key: (item: T) => K): T[] {
  const seen = new Set<K>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

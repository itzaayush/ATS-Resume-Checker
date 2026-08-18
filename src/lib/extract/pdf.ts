import type { LayoutSignals } from "@/lib/ats/types";

/**
 * Position-aware PDF extraction.
 *
 * Naive page-level concatenation is what makes most resume checkers wrong: it silently
 * accepts the scrambled reading order that a two-column layout produces. We rebuild lines
 * from glyph positions so the text we score is the text an ATS would actually store, and
 * so we can report the layout problems that caused the scrambling.
 */

const SAFE_FONT_HINTS = [
  "arial", "helvetica", "calibri", "times", "georgia", "garamond", "cambria", "verdana",
  "tahoma", "palatino", "roboto", "opensans", "lato", "inter", "sourcesans", "notosans",
  "liberation", "dejavu", "carlito", "nimbus",
];

interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
}

export interface PdfExtraction {
  text: string;
  layout: Partial<LayoutSignals>;
  perPageText: string[];
}

export async function extractPdf(data: Uint8Array): Promise<PdfExtraction> {
  const { getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(data);

  const totalPages: number = pdf.numPages ?? 1;
  const perPageText: string[] = [];
  const fonts = new Set<string>();
  let multiColumnPages = 0;
  let headerFooterHits = 0;
  let imageOnlyPages = 0;
  let totalGlyphs = 0;

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();

    const items: TextItem[] = (content.items as unknown[])
      .map((raw) => {
        const item = raw as {
          str?: string;
          transform?: number[];
          width?: number;
          height?: number;
          fontName?: string;
        };
        if (typeof item.str !== "string" || !item.transform) return null;
        return {
          str: item.str,
          x: item.transform[4] ?? 0,
          y: item.transform[5] ?? 0,
          width: item.width ?? 0,
          height: item.height ?? Math.abs(item.transform[3] ?? 10),
          fontName: item.fontName ?? "",
        } satisfies TextItem;
      })
      .filter((item): item is TextItem => item !== null && item.str.trim().length > 0);

    for (const item of items) {
      if (item.fontName) fonts.add(item.fontName);
      totalGlyphs += item.str.length;
    }

    if (items.length === 0) {
      imageOnlyPages += 1;
      perPageText.push("");
      continue;
    }

    const pageWidth = viewport.width || 612;
    const pageHeight = viewport.height || 792;

    const lines = groupIntoLines(items);
    if (detectMultiColumn(lines, pageWidth)) multiColumnPages += 1;
    if (detectHeaderFooterContent(items, pageHeight)) headerFooterHits += 1;

    perPageText.push(lines.map((line) => renderLine(line)).join("\n"));
  }

  const text = perPageText.join("\n\n");
  const unsafeFonts = Array.from(fonts).filter(
    (font) => !SAFE_FONT_HINTS.some((safe) => font.toLowerCase().replace(/[^a-z]/g, "").includes(safe)),
  );

  return {
    text,
    perPageText,
    layout: {
      pageCount: totalPages,
      hasTextLayer: totalGlyphs > 40,
      usedOcr: false,
      multiColumnSuspected: multiColumnPages > 0,
      headerFooterSuspected: headerFooterHits > 0,
      imageOnlyPages,
      fonts: Array.from(fonts).slice(0, 24),
      unsafeFonts: unsafeFonts.slice(0, 12),
      producer: await readProducer(pdf as unknown as { getMetadata?: () => Promise<unknown> }),
      encrypted: false,
    },
  };
}

async function readProducer(pdf: { getMetadata?: () => Promise<unknown> }): Promise<string | null> {
  try {
    const metadata = (await pdf.getMetadata?.()) as { info?: { Producer?: string; Creator?: string } } | undefined;
    return metadata?.info?.Producer ?? metadata?.info?.Creator ?? null;
  } catch {
    return null;
  }
}

/** Groups glyph runs into visual lines using their baseline y position. */
function groupIntoLines(items: TextItem[]): TextItem[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: TextItem[][] = [];
  let current: TextItem[] = [];
  let currentY: number | null = null;

  for (const item of sorted) {
    const tolerance = Math.max(2.5, item.height * 0.55);
    if (currentY === null || Math.abs(item.y - currentY) <= tolerance) {
      current.push(item);
      currentY = currentY === null ? item.y : (currentY + item.y) / 2;
    } else {
      lines.push(current.sort((a, b) => a.x - b.x));
      current = [item];
      currentY = item.y;
    }
  }
  if (current.length) lines.push(current.sort((a, b) => a.x - b.x));
  return lines;
}

function renderLine(line: TextItem[]): string {
  let out = "";
  let previous: TextItem | null = null;
  for (const item of line) {
    if (previous) {
      const gap = item.x - (previous.x + previous.width);
      const spaceWidth = Math.max(2, previous.height * 0.28);
      if (gap > spaceWidth * 6) out += "    ";
      else if (gap > spaceWidth) out += " ";
    }
    out += item.str;
    previous = item;
  }
  return out.replace(/\s+$/, "");
}

/**
 * A page is multi-column when a meaningful share of its lines contain a wide horizontal
 * gutter with substantive text on both sides.
 */
function detectMultiColumn(lines: TextItem[][], pageWidth: number): boolean {
  const gutterThreshold = pageWidth * 0.12;
  let gutterLines = 0;
  let candidateLines = 0;

  for (const line of lines) {
    const textLength = line.reduce((sum, item) => sum + item.str.trim().length, 0);
    if (textLength < 25) continue;
    candidateLines += 1;
    for (let i = 1; i < line.length; i += 1) {
      const gap = line[i].x - (line[i - 1].x + line[i - 1].width);
      if (gap > gutterThreshold) {
        const leftText = line.slice(0, i).reduce((s, it) => s + it.str.trim().length, 0);
        const rightText = line.slice(i).reduce((s, it) => s + it.str.trim().length, 0);
        if (leftText >= 8 && rightText >= 8) {
          gutterLines += 1;
          break;
        }
      }
    }
  }

  return candidateLines >= 6 && gutterLines / candidateLines >= 0.35;
}

const CONTACT_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|\+?\d[\d\s().-]{8,}/;

function detectHeaderFooterContent(items: TextItem[], pageHeight: number): boolean {
  const bandHeight = Math.min(72, pageHeight * 0.09);
  const inBand = items.filter((item) => item.y > pageHeight - bandHeight || item.y < bandHeight);
  if (!inBand.length) return false;
  const bandText = inBand.map((i) => i.str).join(" ");
  return CONTACT_RE.test(bandText);
}

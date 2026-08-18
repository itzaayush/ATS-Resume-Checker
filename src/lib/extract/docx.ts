import type { LayoutSignals } from "@/lib/ats/types";

export interface DocxExtraction {
  text: string;
  layout: Partial<LayoutSignals>;
}

/**
 * DOCX extraction via mammoth. We read the HTML conversion as well as the raw text so we
 * can detect the two constructs that break ATS parsers most often: tables and text boxes.
 */
export async function extractDocx(buffer: Buffer): Promise<DocxExtraction> {
  const mammoth = await import("mammoth");
  const [raw, html] = await Promise.all([
    mammoth.extractRawText({ buffer }),
    mammoth.convertToHtml({ buffer }).catch(() => ({ value: "" })),
  ]);

  const markup = html.value ?? "";
  const tableSuspected = /<table[\s>]/i.test(markup);
  const hasEmbeddedImages = /<img[\s>]/i.test(markup);
  const text = raw.value ?? "";
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return {
    text,
    layout: {
      pageCount: Math.max(1, Math.ceil(wordCount / 500)),
      hasTextLayer: text.trim().length > 0,
      usedOcr: false,
      tableSuspected,
      // Embedded images carry no extractable text and are a common parse-failure source.
      imageOnlyPages: hasEmbeddedImages ? 1 : 0,
      headerFooterSuspected: false,
      fonts: [],
      unsafeFonts: [],
      producer: "docx",
      encrypted: false,
    },
  };
}
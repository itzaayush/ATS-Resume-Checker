import type { LayoutSignals } from "@/lib/ats/types";
import { extractDocx } from "./docx";
import { extractPdf } from "./pdf";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_PAGES = 12;

export type DetectedType = "pdf" | "docx" | "doc" | "txt" | "rtf" | "unknown";

export class ExtractionError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ExtractionError";
  }
}

/**
 * Type detection reads magic bytes. File extensions and the browser-supplied MIME type are
 * both attacker-controlled, so neither is trusted for anything.
 */
export function sniffType(bytes: Uint8Array): DetectedType {
  const startsWith = (signature: number[]) =>
    signature.every((byte, index) => bytes[index] === byte);

  if (startsWith([0x25, 0x50, 0x44, 0x46])) return "pdf"; // %PDF
  if (startsWith([0x50, 0x4b, 0x03, 0x04])) return "docx"; // ZIP container
  if (startsWith([0xd0, 0xcf, 0x11, 0xe0])) return "doc"; // legacy OLE2
  if (startsWith([0x7b, 0x5c, 0x72, 0x74, 0x66])) return "rtf";

  // Treat it as text only if the leading bytes are printable.
  const sample = bytes.slice(0, 512);
  let printable = 0;
  for (const byte of sample) {
    if (byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte <= 126) || byte >= 160) printable += 1;
  }
  return sample.length > 0 && printable / sample.length > 0.9 ? "txt" : "unknown";
}

export interface ExtractionResult {
  text: string;
  type: DetectedType;
  layout: Partial<LayoutSignals>;
}

export async function extractDocument(buffer: Buffer, declaredName: string): Promise<ExtractionResult> {
  if (buffer.byteLength === 0) {
    throw new ExtractionError("EMPTY_FILE", "The uploaded file is empty.");
  }
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new ExtractionError("FILE_TOO_LARGE", "Files must be 10 MB or smaller.");
  }

  const bytes = new Uint8Array(buffer);
  const type = sniffType(bytes);

  switch (type) {
    case "pdf": {
      if (isEncryptedPdf(buffer)) {
        throw new ExtractionError(
          "ENCRYPTED_PDF",
          "This PDF is password protected. Save an unprotected copy and upload that.",
        );
      }
      let result;
      try {
        result = await extractPdf(bytes);
      } catch {
        throw new ExtractionError(
          "PDF_UNREADABLE",
          "This PDF could not be read. Re-export it from your source document and try again.",
        );
      }
      if (result.layout.pageCount && result.layout.pageCount > MAX_PAGES) {
        throw new ExtractionError("TOO_MANY_PAGES", `Resumes are limited to ${MAX_PAGES} pages.`);
      }
      if (!result.text.trim()) {
        throw new ExtractionError(
          "NO_TEXT_LAYER",
          "No selectable text was found — this looks like a scanned or image-only PDF. Applicant tracking systems will import it as a blank record. Re-export a text-based PDF from your source document.",
        );
      }
      return { text: result.text, type, layout: result.layout };
    }
    case "docx": {
      const result = await extractDocx(buffer);
      if (!result.text.trim()) {
        throw new ExtractionError("NO_TEXT_LAYER", "No text could be read from this document.");
      }
      return { text: result.text, type, layout: result.layout };
    }
    case "txt": {
      const text = buffer.toString("utf8");
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      return {
        text,
        type,
        layout: {
          pageCount: Math.max(1, Math.ceil(wordCount / 500)),
          hasTextLayer: true,
          usedOcr: false,
          tableSuspected: false,
          multiColumnSuspected: false,
          fonts: [],
          unsafeFonts: [],
          producer: "text/plain",
          encrypted: false,
        },
      };
    }
    case "doc":
      throw new ExtractionError(
        "LEGACY_DOC",
        "Legacy .doc files are not supported and are rejected by many applicant tracking systems. Save as .docx or PDF.",
      );
    case "rtf":
      throw new ExtractionError(
        "UNSUPPORTED_TYPE",
        "RTF is not supported. Upload a PDF, DOCX or TXT file.",
      );
    default:
      throw new ExtractionError(
        "UNSUPPORTED_TYPE",
        `"${declaredName}" is not a PDF, DOCX or TXT file. The file contents do not match any supported format.`,
      );
  }
}

function isEncryptedPdf(buffer: Buffer): boolean {
  // /Encrypt in the trailer is the reliable marker; scan the tail where trailers live.
  const tail = buffer.subarray(Math.max(0, buffer.length - 4096)).toString("latin1");
  return /\/Encrypt\s+\d+\s+\d+\s+R/.test(tail);
}
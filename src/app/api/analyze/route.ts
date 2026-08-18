import { NextResponse } from "next/server";
import { analyzeResume, detectInjectionAttempt, sanitizeUntrustedText } from "@/lib/ats/engine";
import { LEVEL_ORDER, ROLE_PROFILES } from "@/lib/ats/rubric";
import type { SeniorityLevel } from "@/lib/ats/types";
import { ExtractionError, MAX_UPLOAD_BYTES, extractDocument } from "@/lib/extract";
import { clientKey, rateLimit } from "@/lib/server/rate-limit";

// PDF and DOCX parsing require Node APIs; this route must never run on the edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const WINDOW_MS = 60 * 60 * 1000;
const GUEST_LIMIT = 12;

function fail(code: string, message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, code, message, ...extra }, { status });
}

export async function POST(request: Request) {
  const key = clientKey(request);
  const limit = rateLimit(key, GUEST_LIMIT, WINDOW_MS);

  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        code: "RATE_LIMITED",
        message: "Scan limit reached for this hour.",
        resetAt: new Date(limit.resetAt).toISOString(),
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Limit": String(limit.limit),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("BAD_REQUEST", "Expected a multipart form upload.", 400);
  }

  const file = form.get("resume");
  if (!(file instanceof File)) {
    return fail("NO_FILE", "No resume file was received.", 400);
  }
  if (file.size === 0) {
    return fail("EMPTY_FILE", "The uploaded file is empty.", 400);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return fail("FILE_TOO_LARGE", "Files must be 10 MB or smaller.", 413);
  }

  const roleValue = String(form.get("targetRole") ?? "");
  const targetRoleId = ROLE_PROFILES.some((r) => r.id === roleValue) ? roleValue : undefined;

  const levelValue = String(form.get("targetLevel") ?? "auto");
  const targetLevel: SeniorityLevel | "auto" = LEVEL_ORDER.includes(levelValue as SeniorityLevel)
    ? (levelValue as SeniorityLevel)
    : "auto";

  const rawJobDescription = form.get("jobDescription");
  const jobDescription =
    typeof rawJobDescription === "string" && rawJobDescription.trim().length > 0
      ? sanitizeUntrustedText(rawJobDescription)
      : null;

  const injectionSignals = jobDescription ? detectInjectionAttempt(jobDescription) : [];

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      };

      try {
        send({ type: "stage", stage: "upload" });

        const extraction = await extractDocument(buffer, fileName);
        send({ type: "stage", stage: "extract" });

        const outcome = await analyzeResume({
          text: extraction.text,
          layout: extraction.layout,
          fileName,
          targetRoleId,
          targetLevel,
          jobDescription,
          onStage: (stage) => send({ type: "stage", stage }),
        });

        if (!outcome.ok) {
          send({
            type: "error",
            code: "NOT_A_RESUME",
            message: outcome.validation.reason,
            validation: outcome.validation,
          });
        } else {
          send({
            type: "result",
            result: outcome.result,
            cacheKey: outcome.cacheKey,
            warnings: injectionSignals.length
              ? [
                  "The job description contained instruction-like text. It was treated strictly as data and had no effect on your score.",
                ]
              : [],
          });
        }
      } catch (error) {
        if (error instanceof ExtractionError) {
          send({ type: "error", code: error.code, message: error.message });
        } else {
          // Never leak a stack trace, file path or internal identifier to the client.
          const reference = Math.random().toString(36).slice(2, 10);
          console.error(`[analyze:${reference}]`, error);
          send({
            type: "error",
            code: "ANALYSIS_FAILED",
            message: `The analysis could not be completed. Quote reference ${reference} if you contact support.`,
          });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
      "X-RateLimit-Limit": String(limit.limit),
      "X-RateLimit-Remaining": String(limit.remaining),
    },
  });
}

export async function GET() {
  return fail("METHOD_NOT_ALLOWED", "Use POST with a multipart form upload.", 405);
}

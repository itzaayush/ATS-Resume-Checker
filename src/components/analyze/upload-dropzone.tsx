"use client";

import { FileText, Upload, X } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import { cn, formatBytes } from "@/lib/utils";

const ACCEPTED = [".pdf", ".docx", ".txt"];
const MAX_BYTES = 10 * 1024 * 1024;

interface UploadDropzoneProps {
  file: File | null;
  onFile: (file: File | null) => void;
  disabled?: boolean;
}

export function UploadDropzone({ file, onFile, disabled }: UploadDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback((candidate: File): string | null => {
    const extension = `.${candidate.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (!ACCEPTED.includes(extension)) {
      return `${extension || "That file"} is not supported. Upload a PDF, DOCX or TXT file.`;
    }
    if (candidate.size > MAX_BYTES) {
      return `That file is ${formatBytes(candidate.size)}. The limit is 10 MB.`;
    }
    if (candidate.size === 0) return "That file is empty.";
    return null;
  }, []);

  const accept = useCallback(
    (candidate: File | undefined) => {
      if (!candidate) return;
      const problem = validate(candidate);
      if (problem) {
        setError(problem);
        onFile(null);
        return;
      }
      setError(null);
      onFile(candidate);
    },
    [onFile, validate],
  );

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised px-4 py-3.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
          <FileText className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium">{file.name}</p>
          <p className="text-[12px] text-subtle">{formatBytes(file.size)}</p>
        </div>
        <button
          onClick={() => {
            onFile(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
          disabled={disabled}
          className="grid h-8 w-8 place-items-center rounded-lg text-subtle transition hover:bg-surface hover:text-foreground disabled:opacity-40"
          aria-label={`Remove ${file.name}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (disabled) return;
          accept(event.dataTransfer.files?.[0]);
        }}
        className={cn(
          "scan-shimmer relative flex cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors",
          dragging ? "border-accent bg-accent-soft" : "border-border bg-surface-raised hover:border-border-strong",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <span className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-surface text-accent">
          <Upload className="h-5 w-5" />
        </span>
        <span className="text-sm font-medium">Drop your resume here, or click to browse</span>
        <span className="text-[12px] text-subtle">PDF, DOCX or TXT · up to 10 MB · one file at a time</span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="sr-only"
          disabled={disabled}
          onChange={(event) => accept(event.target.files?.[0])}
        />
      </label>

      {error ? (
        <p role="alert" className="mt-2 text-[12px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

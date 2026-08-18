import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative grid h-8 w-8 place-items-center rounded-[10px] bg-accent text-accent-contrast">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
          <path d="M6 3.5h8.5L19 8v12.5H6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M14 3.5V8h4.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M8.5 13.5h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M8.5 16.75h4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M4 11h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.65" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-tight">ATSense</span>
    </span>
  );
}

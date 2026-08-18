import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto grid max-w-lg place-items-center px-5 py-28 text-center">
      <p className="font-mono text-[13px] text-subtle">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">That page could not be parsed either</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        The link is broken or the page has moved. Your resume is still waiting to be scanned.
      </p>
      <Link
        href="/analyze"
        className="mt-7 inline-flex h-11 items-center rounded-lg bg-accent px-6 text-[14px] font-medium text-accent-contrast transition hover:brightness-110"
      >
        Scan a resume
      </Link>
    </div>
  );
}

import Link from "next/link";
import { Logo } from "./logo";
import { RUBRIC_VERSION } from "@/lib/ats/rubric";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/analyze", label: "Resume scan" },
      { href: "/analyze#job-description", label: "Job-description tailoring" },
      { href: "/scoring", label: "Scoring model" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/how-it-works", label: "How ATS parsing works" },
      { href: "/how-it-works#formatting", label: "Formatting rules" },
      { href: "/scoring#pillars", label: "The six pillars" },
      { href: "/scoring#levels", label: "Level rubrics" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/privacy#retention", label: "Data retention" },
      { href: "/privacy#deletion", label: "Delete my data" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-surface-sunken">
      <div className="shell py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-[13px] leading-relaxed text-muted">
              Resume intelligence that scores the way a screen actually reads: structure first,
              evidence second, keywords last.
            </p>
            <p className="mt-4 font-mono text-[11px] text-subtle">{RUBRIC_VERSION}</p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">{column.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link href={link.href} className="text-[13px] text-muted transition-colors hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 text-[12px] text-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ATSense. Scores are guidance, not a hiring guarantee.</p>
          <p>Level rubrics are an approximation of industry norms, not any single company&apos;s official standard.</p>
        </div>
      </div>
    </footer>
  );
}

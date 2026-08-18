"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/analyze", label: "Analyze" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/scoring", label: "Scoring model" },
  { href: "/pricing", label: "Pricing" },
];

function subscribeScroll(onChange: () => void): () => void {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menuRoute, setMenuRoute] = useState(pathname);
  const scrolled = useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > 8,
    () => false,
  );

  // Navigating closes the mobile menu; adjusting during render avoids an extra pass.
  if (menuRoute !== pathname) {
    setMenuRoute(pathname);
    setOpen(false);
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-colors duration-300",
        scrolled ? "border-border bg-background/85 backdrop-blur-xl" : "border-transparent bg-transparent",
      )}
    >
      <div className="shell flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="ATSense home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                  active ? "bg-surface-raised text-foreground" : "text-muted hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/analyze"
            className="hidden h-9 items-center rounded-lg bg-accent px-4 text-[13px] font-medium text-accent-contrast transition hover:brightness-110 sm:inline-flex"
          >
            Scan a resume
          </Link>
          <button
            className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="shell flex flex-col py-3" aria-label="Mobile">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-lg px-2 py-2.5 text-sm text-muted hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}

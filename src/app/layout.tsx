import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://atsense.app"),
  title: {
    default: "ATSense — Resume intelligence and ATS scoring",
    template: "%s | ATSense",
  },
  description:
    "Score your resume the way an applicant tracking system and a recruiter actually read it: parseability, quantified impact, evidenced skills, seniority signals and language hygiene — with every finding tied to the line that caused it.",
  keywords: [
    "ATS resume checker",
    "resume score",
    "applicant tracking system",
    "resume keyword match",
    "job description tailoring",
    "resume parser",
  ],
  openGraph: {
    type: "website",
    siteName: "ATSense",
    title: "ATSense — Resume intelligence and ATS scoring",
    description:
      "A deterministic six-pillar resume score with evidence-linked findings, spelling and grammar correction, and job-description tailoring.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "ATSense — Resume intelligence and ATS scoring",
    description: "Deterministic ATS scoring with evidence-linked findings and grounded rewrites.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#07080c" },
  ],
};

/** Applied before paint so a stored dark preference never flashes white. */
const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem('atsense-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-contrast"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}


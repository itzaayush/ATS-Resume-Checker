import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { STAGES } from "@/lib/ats/stages";

export const metadata: Metadata = {
  title: "How ATS parsing works",
  description:
    "What an applicant tracking system does to your resume: text extraction, reading order, section bucketing, date fields and keyword indexing \u2014 and the formatting choices that break each step.",
};

const MISTAKES = [
  {
    id: "dates",
    title: "Dates that never become a field",
    symptom: "Your work history imports blank, or your tenure reads as zero years.",
    cause: "Apostrophe years (\u201921), bare years (2021 \u2013 2023), single-digit months (1/2021) and dates trapped in table cells.",
    fix: "Use one format everywhere: \u201cJan 2021 \u2013 Mar 2023\u201d or \u201c01/2021 \u2013 03/2023\u201d. Always include the month.",
  },
  {
    id: "fonts",
    title: "Characters that import as gibberish",
    symptom: "Your name becomes [NULL]; \u201cProfile\u201d becomes \u201cPro?le\u201d; bullets become stray letters.",
    cause: "Non-embedded or decorative fonts, and icon glyphs used in place of words.",
    fix: "Use Arial, Calibri, Georgia, Helvetica, Garamond, Cambria or Verdana. Replace icons with the words \u201cPhone:\u201d and \u201cEmail:\u201d.",
  },
  {
    id: "layers",
    title: "Text the parser never sees",
    symptom: "A recruiter says they cannot find your contact details or your skills.",
    cause: "Content placed in the document header, footer or a floating text box. Many parsers ignore those layers entirely.",
    fix: "Move everything into the main body. Use bold and size for hierarchy instead of floating boxes.",
  },
  {
    id: "headings",
    title: "Sections filed under the wrong bucket",
    symptom: "Your experience is stored as education, or your summary disappears.",
    cause: "Creative headings such as \u201cMy Journey\u201d, \u201cThe Toolkit\u201d or \u201cWhere I\u2019ve Been\u201d.",
    fix: "Use the literal words the parser looks for: Work Experience, Education, Skills, Projects, Certifications.",
  },
  {
    id: "formatting",
    title: "Reading order scrambled by columns",
    symptom: "Sentences from your sidebar interleave with your job descriptions.",
    cause: "Two-column layouts, tables and skill bar charts. The parser reads across the page, not down each column.",
    fix: "Single column, no tables, no graphics. \u201cJava (Expert)\u201d instead of a bar showing 80%.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="shell-narrow py-14">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Reference</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">How ATS parsing actually works</h1>
      <p className="mt-4 text-[16px] leading-relaxed text-muted">
        An applicant tracking system does not read your resume. It converts it into a database record, and then
        recruiters search that record. Everything below is about the gap between the document you designed and
        the record it becomes.
      </p>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight">The five steps a parser takes</h2>
        <ol className="mt-5 space-y-3">
          {[
            {
              title: "Extract a text layer",
              body: "Glyphs and their positions are pulled out of the file. A scanned or image-only PDF has no text layer at all, so the record arrives empty.",
            },
            {
              title: "Reconstruct reading order",
              body: "Glyphs are grouped into lines and lines into blocks. This is where multi-column layouts and tables fail: content is stitched together in the wrong sequence.",
            },
            {
              title: "Bucket into sections",
              body: "Headings are matched against a fixed vocabulary. Anything unrecognised is either dropped or filed under the previous heading.",
            },
            {
              title: "Extract entities",
              body: "Company, title, start date, end date, degree, institution and skills become structured fields. Unparsed dates remove you from tenure filters.",
            },
            {
              title: "Index for search",
              body: "Recruiters filter on skills first. Around three quarters of them begin a search with a skill term, which is why an unevidenced keyword list is worth so little.",
            },
          ].map((step, index) => (
            <li key={step.title} className="flex gap-4 rounded-xl border border-border bg-surface px-4 py-4">
              <span className="tabular grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent-soft text-[12px] font-semibold text-accent">
                {index + 1}
              </span>
              <div>
                <h3 className="text-[15px] font-medium">{step.title}</h3>
                <p className="mt-1 text-[14px] leading-relaxed text-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="formatting" className="mt-14 scroll-mt-24">
        <h2 className="text-2xl font-semibold tracking-tight">The five formatting mistakes that cost the most</h2>
        <div className="mt-5 space-y-4">
          {MISTAKES.map((mistake) => (
            <Card key={mistake.id} id={mistake.id} className="scroll-mt-24">
              <CardContent className="p-5">
                <h3 className="text-[15px] font-semibold">{mistake.title}</h3>
                <dl className="mt-3 space-y-2 text-[14px] leading-relaxed">
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">Symptom</dt>
                    <dd className="text-muted">{mistake.symptom}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">Cause</dt>
                    <dd className="text-muted">{mistake.cause}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">Fix</dt>
                    <dd>{mistake.fix}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold tracking-tight">What ATSense does with your file</h2>
        <ol className="mt-5 space-y-2">
          {STAGES.map((stage) => (
            <li key={stage.id} className="rounded-xl border border-border bg-surface px-4 py-3">
              <p className="text-[14px] font-medium">{stage.label}</p>
              <p className="text-[13px] text-muted">{stage.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-12 rounded-2xl border border-border bg-surface-sunken px-6 py-8 text-center">
        <p className="text-[15px] font-medium">Ready to see your own record?</p>
        <Link
          href="/analyze"
          className="mt-4 inline-flex h-11 items-center rounded-lg bg-accent px-6 text-[14px] font-medium text-accent-contrast transition hover:brightness-110"
        >
          Scan my resume
        </Link>
      </div>
    </div>
  );
}

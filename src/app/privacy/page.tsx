import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What ATSense stores, for how long, and how to delete it.",
};

const SECTIONS = [
  {
    id: "what-we-process",
    title: "What we process",
    body: [
      "A guest scan is processed entirely in memory. The uploaded file is read into a buffer, parsed, scored and discarded when the response is sent. It is never written to disk and never sent to a third party.",
      "Resume text is not written to application logs. Error logs contain a correlation reference and a stack trace only; the document contents are excluded.",
      "Job-description text you paste is treated strictly as data. It is never interpreted as an instruction by any part of the system.",
    ],
  },
  {
    id: "retention",
    title: "Retention",
    body: [
      "Guest scans: nothing is retained after the response.",
      "Authenticated accounts, when enabled: uploaded files 30 days, extracted text 90 days, derived scores and findings for the life of the account.",
      "Retention timers are enforced by an automated purge job with an auditable log.",
    ],
  },
  {
    id: "models",
    title: "Language models",
    body: [
      "The numeric score never uses a language model. Every pillar is computed by deterministic rules so the result is reproducible.",
      "Bullet rewrites are generated locally from your own words using rule-based transformations. No resume content leaves the server for a model provider in the current build.",
    ],
  },
  {
    id: "security",
    title: "Security controls",
    body: [
      "File type is determined from magic bytes, not from the filename or the browser-supplied MIME type.",
      "Upload size, page count and extraction time are capped server-side. Encrypted and corrupt files are rejected with a specific code.",
      "Rate limits are enforced per client on the server and cannot be bypassed from the browser.",
      "Error responses never contain a file path, stack trace or internal identifier.",
    ],
  },
  {
    id: "deletion",
    title: "Deletion and export",
    body: [
      "Because guest scans store nothing, there is nothing to delete after you close the tab.",
      "Where an account exists, deleting an analysis purges the file, the extracted text, the derived records and any analytics identifiers within 24 hours, and the deletion is confirmed to you.",
      "A data export returns your analyses and stored text in a machine-readable format.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="shell-narrow py-14">
      <h1 className="text-4xl font-semibold tracking-tight">Privacy</h1>
      <p className="mt-4 text-[16px] leading-relaxed text-muted">
        A resume is one of the most sensitive documents a person will ever upload. This page states plainly what
        happens to yours.
      </p>

      <div className="mt-10 space-y-10">
        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">{section.title}</h2>
            <div className="mt-3 space-y-3">
              {section.body.map((paragraph) => (
                <p key={paragraph} className="text-[14px] leading-relaxed text-muted">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

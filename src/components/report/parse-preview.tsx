import { Badge } from "@/components/ui/badge";
import type { StructuredResume } from "@/lib/ats/types";

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline gap-3 py-1.5">
      <span className="w-28 shrink-0 text-[11px] uppercase tracking-[0.1em] text-subtle">{label}</span>
      {value ? (
        <span className="min-w-0 flex-1 truncate font-mono text-[12px]">{value}</span>
      ) : (
        <span className="flex-1 font-mono text-[12px] text-danger">not parsed</span>
      )}
    </div>
  );
}

export function ParsePreview({ resume }: { resume: StructuredResume }) {
  const { contact, experience, education, sections, skills, layout } = resume;

  return (
    <div className="space-y-5 px-5 py-4">
      <p className="text-[13px] leading-relaxed text-muted">
        This is the record an applicant tracking system would store. Anything marked{" "}
        <span className="text-danger">not parsed</span> is a field a recruiter&apos;s search will never match you on.
      </p>

      <section>
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">Contact record</h4>
        <div className="mt-2 rounded-lg border border-border bg-surface-sunken px-4 py-2">
          <Field label="Name" value={contact.name} />
          <Field label="Headline" value={contact.headline} />
          <Field label="Email" value={contact.email} />
          <Field label="Phone" value={contact.phone} />
          <Field label="Location" value={contact.location} />
          <Field label="LinkedIn" value={contact.linkedin} />
          <Field label="GitHub" value={contact.github} />
        </div>
      </section>

      <section>
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">
          Sections detected ({sections.filter((s) => s.heading).length})
        </h4>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {sections
            .filter((s) => s.heading)
            .map((section, index) => (
              <Badge key={`${section.id}-${index}`} tone={section.headingIsCanonical ? "success" : "danger"}>
                {section.heading}
                {section.headingIsCanonical ? "" : " · non-standard"}
              </Badge>
            ))}
          {sections.every((s) => !s.heading) ? (
            <span className="text-[12px] text-danger">No headings were detected at all.</span>
          ) : null}
        </div>
      </section>

      <section>
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">
          Employment records ({experience.length})
        </h4>
        <ul className="mt-2 space-y-2">
          {experience.map((entry, index) => (
            <li key={`exp-${index}`} className="rounded-lg border border-border bg-surface-sunken px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-medium">{entry.title ?? "Title not parsed"}</span>
                <span className="text-subtle">·</span>
                <span className="text-[13px] text-muted">{entry.company ?? "Company not parsed"}</span>
                <Badge tone={entry.confidence >= 0.75 ? "success" : entry.confidence >= 0.5 ? "warning" : "danger"}>
                  {Math.round(entry.confidence * 100)}% confidence
                </Badge>
              </div>
              <p className="mt-1 font-mono text-[11px] text-subtle">
                {entry.dates?.startYear
                  ? `${entry.dates.startMonth ?? "??"}/${entry.dates.startYear} → ${
                      entry.dates.isCurrent ? "Present" : `${entry.dates.endMonth ?? "??"}/${entry.dates.endYear ?? "????"}`
                    } · format ${entry.dates.formatStyle}`
                  : "dates not parsed"}
                {" · "}
                {entry.bullets.length} bullets
              </p>
            </li>
          ))}
          {!experience.length ? (
            <li className="rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-[12px] text-danger">
              No employment records could be parsed. Most systems would store an empty work history for this file.
            </li>
          ) : null}
        </ul>
      </section>

      <section>
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">
          Education records ({education.length})
        </h4>
        <ul className="mt-2 space-y-2">
          {education.map((entry, index) => (
            <li key={`edu-${index}`} className="rounded-lg border border-border bg-surface-sunken px-4 py-3">
              <p className="text-[13px] font-medium">{entry.degree ?? "Degree not parsed"}</p>
              <p className="text-[12px] text-muted">{entry.institution ?? "Institution not parsed"}</p>
            </li>
          ))}
          {!education.length ? <li className="text-[12px] text-danger">No education records parsed.</li> : null}
        </ul>
      </section>

      <section>
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">
          Skill entities ({skills.length})
        </h4>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {skills.slice(0, 60).map((skill) => (
            <Badge key={skill.canonical} tone={skill.inExperience || skill.inProjects ? "success" : "warning"}>
              {skill.canonical}
            </Badge>
          ))}
        </div>
      </section>

      <section>
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">Layout signals</h4>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          <Signal label="Text layer" ok={layout.hasTextLayer && !layout.usedOcr} />
          <Signal label="Single column" ok={!layout.multiColumnSuspected} />
          <Signal label="No tables" ok={!layout.tableSuspected} />
          <Signal label="No header/footer content" ok={!layout.headerFooterSuspected} />
          <Signal label="Standard bullets" ok={layout.nonStandardBulletChars.length === 0} />
          <Signal label="No icon glyphs" ok={layout.emojiOrIconChars.length === 0} />
        </div>
        {layout.unsafeFonts.length ? (
          <p className="mt-2 text-[12px] text-warning">
            Non-standard fonts embedded: {layout.unsafeFonts.slice(0, 5).join(", ")}. These are the usual cause of
            characters importing as gibberish.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function Signal({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-surface-sunken px-3 py-2">
      <span className="text-[12px] text-muted">{label}</span>
      <Badge tone={ok ? "success" : "danger"}>{ok ? "OK" : "Risk"}</Badge>
    </div>
  );
}

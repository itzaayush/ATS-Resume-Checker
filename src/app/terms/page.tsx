import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms of use for ATSense.",
};

export default function TermsPage() {
  return (
    <div className="shell-narrow py-14">
      <h1 className="text-4xl font-semibold tracking-tight">Terms</h1>

      <div className="mt-8 space-y-8">
        <section>
          <h2 className="text-2xl font-semibold tracking-tight">What this service is</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-muted">
            ATSense analyses a resume against a published rubric and returns guidance. It is an analysis tool,
            not a hiring decision system, and it does not represent any employer or applicant tracking system
            vendor.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold tracking-tight">No outcome guarantee</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-muted">
            A high score does not guarantee an interview, an offer or any other outcome. Level rubrics are an
            approximation of industry norms and are not any single company&apos;s official standard.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold tracking-tight">Accuracy of your content</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-muted">
            Rewrite suggestions are generated from your own words and may include placeholder tokens where a
            number is missing. You are responsible for ensuring every claim on your resume is truthful before
            you submit it anywhere.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold tracking-tight">Acceptable use</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-muted">
            Do not upload documents you do not have the right to process, and do not attempt to circumvent rate
            limits or upload restrictions. Automated bulk usage requires a Coach plan.
          </p>
        </section>
      </div>
    </div>
  );
}

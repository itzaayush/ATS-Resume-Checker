import type { PillarId, SectionId, SeniorityLevel } from "./types";

/**
 * Immutable, versioned rubric configuration.
 *
 * Bump RUBRIC_VERSION whenever a weight, threshold or check id changes so historical
 * analyses remain reproducible and comparable.
 */
export const RUBRIC_VERSION = "atsense-rubric-2.0.0";

export interface PillarConfig {
  id: PillarId;
  label: string;
  description: string;
  /** Share of the 100-point total. Weights must sum to 1. */
  weight: number;
}

export const PILLARS: PillarConfig[] = [
  {
    id: "parseability",
    label: "Parseability",
    description:
      "Whether an applicant tracking system can extract your text, sections and dates without scrambling them.",
    weight: 0.2,
  },
  {
    id: "content_impact",
    label: "Impact & Content Quality",
    description:
      "Whether your bullets describe measurable outcomes instead of responsibilities.",
    weight: 0.26,
  },
  {
    id: "skills_keywords",
    label: "Skills & Keyword Coverage",
    description:
      "Whether the hard skills recruiters filter on are present and evidenced in real work.",
    weight: 0.18,
  },
  {
    id: "structure_consistency",
    label: "Structure & Consistency",
    description:
      "Section completeness, reverse-chronological order, date consistency and bullet density.",
    weight: 0.14,
  },
  {
    id: "role_alignment",
    label: "Role & Level Alignment",
    description:
      "Whether the resume reads at the seniority and job family you are targeting.",
    weight: 0.12,
  },
  {
    id: "hygiene_language",
    label: "Language & Hygiene",
    description:
      "Spelling, grammar, tense consistency, filler language and disqualifying red flags.",
    weight: 0.1,
  },
];

export const PILLAR_BY_ID: Record<PillarId, PillarConfig> = PILLARS.reduce(
  (acc, p) => ({ ...acc, [p.id]: p }),
  {} as Record<PillarId, PillarConfig>,
);

export const SCORE_BANDS = {
  excellent: 88,
  strong: 75,
  fair: 60,
} as const;

/**
 * Benchmark distribution derived from the labelled evaluation corpus described in the PRD.
 * Displayed as context only — never used inside the score itself.
 */
export const BENCHMARKS: Record<SeniorityLevel, { p50: number; p75: number; p90: number }> = {
  intern: { p50: 58, p75: 70, p90: 81 },
  entry: { p50: 61, p75: 73, p90: 84 },
  mid: { p50: 64, p75: 76, p90: 86 },
  senior: { p50: 66, p75: 78, p90: 88 },
  staff: { p50: 68, p75: 80, p90: 90 },
  principal: { p50: 69, p75: 81, p90: 91 },
};

/** Canonical section headings an ATS is programmed to bucket on. */
export const CANONICAL_HEADINGS: Record<SectionId, string[]> = {
  contact: ["contact", "contact information", "personal details", "personal information"],
  summary: [
    "summary",
    "professional summary",
    "career summary",
    "executive summary",
    "profile",
    "professional profile",
    "objective",
    "career objective",
    "about me",
    "about",
    "overview",
  ],
  experience: [
    "experience",
    "work experience",
    "professional experience",
    "employment",
    "employment history",
    "work history",
    "career history",
    "relevant experience",
    "industry experience",
    "engineering experience",
  ],
  education: ["education", "academic background", "academics", "educational background", "qualifications"],
  skills: [
    "skills",
    "technical skills",
    "core competencies",
    "competencies",
    "areas of expertise",
    "technologies",
    "technical proficiencies",
    "proficiencies",
    "tech stack",
    "skills summary",
  ],
  projects: ["projects", "personal projects", "side projects", "key projects", "selected projects", "portfolio"],
  certifications: ["certifications", "certificates", "licenses", "licenses and certifications", "credentials"],
  awards: ["awards", "honors", "honours", "achievements", "accomplishments", "recognition"],
  publications: ["publications", "papers", "research", "patents"],
  volunteer: ["volunteer", "volunteering", "volunteer experience", "community involvement"],
  languages: ["languages", "language proficiency"],
  interests: ["interests", "hobbies", "activities", "extracurricular"],
  references: ["references", "referees"],
  unknown: [],
};

/**
 * Creative headings that break ATS bucketing. Sourced from recruiter guidance on
 * "unrecognized category" parsing failures.
 */
export const CREATIVE_HEADING_PATTERNS: { pattern: RegExp; canonical: SectionId }[] = [
  { pattern: /^(my |the )?(journey|story|path|adventure|road so far)\b/i, canonical: "experience" },
  { pattern: /^where (i'?ve been|i worked|i've worked)\b/i, canonical: "experience" },
  { pattern: /^(what i do|what i've done|things i('| ha)ve (built|done))\b/i, canonical: "experience" },
  { pattern: /^(my )?(toolkit|tool ?box|superpowers|arsenal|weapons of choice|stack of choice)\b/i, canonical: "skills" },
  { pattern: /^(what i'?m good at|things i know)\b/i, canonical: "skills" },
  { pattern: /^where i studied\b/i, canonical: "education" },
  { pattern: /^(book smarts|school|learning)\b/i, canonical: "education" },
  { pattern: /^(hello|hi there|nice to meet you|who am i)\b/i, canonical: "summary" },
];

/** Verbs that signal ownership and outcome. Grouped for coaching, scored as one set. */
export const STRONG_ACTION_VERBS: Record<string, string[]> = {
  leadership: [
    "led", "directed", "spearheaded", "orchestrated", "championed", "drove", "owned", "chaired",
    "mentored", "coached", "guided", "mobilized", "galvanized", "steered",
  ],
  build: [
    "architected", "engineered", "built", "designed", "developed", "implemented", "created",
    "launched", "shipped", "delivered", "deployed", "prototyped", "productionized", "founded",
    "established", "pioneered", "instrumented", "integrated", "automated", "migrated", "refactored",
    "containerized", "modernized", "rearchitected",
  ],
  improve: [
    "optimized", "improved", "reduced", "accelerated", "streamlined", "increased", "boosted",
    "scaled", "eliminated", "consolidated", "hardened", "stabilized", "decreased", "cut",
    "shortened", "compressed", "doubled", "tripled", "halved", "minimized", "maximized",
  ],
  analyze: [
    "analyzed", "diagnosed", "identified", "investigated", "quantified", "benchmarked", "profiled",
    "audited", "evaluated", "forecasted", "modeled", "measured", "root-caused",
  ],
  influence: [
    "negotiated", "aligned", "influenced", "partnered", "advised", "presented", "evangelized",
    "standardized", "formalized", "authored", "published", "facilitated", "unblocked",
  ],
  outcome: [
    "achieved", "exceeded", "surpassed", "won", "secured", "generated", "saved", "recovered",
    "prevented", "resolved", "unlocked",
  ],
};

export const ALL_STRONG_VERBS: Set<string> = new Set(
  Object.values(STRONG_ACTION_VERBS).flat(),
);

/** Openers that signal a responsibility list rather than an accomplishment. */
export const WEAK_OPENERS: { pattern: RegExp; replacement: string; note: string }[] = [
  {
    pattern: /^(was |were )?responsible for\b/i,
    replacement: "Owned",
    note: "\"Responsible for\" describes a job description, not what you achieved.",
  },
  {
    pattern: /^(worked (on|with|as)|working (on|with))\b/i,
    replacement: "Built",
    note: "\"Worked on\" hides your specific contribution.",
  },
  {
    pattern: /^(helped|assisted( with| in)?|supported|aided)\b/i,
    replacement: "Delivered",
    note: "\"Helped\" makes your contribution sound peripheral.",
  },
  {
    pattern: /^(participated in|involved in|part of|contributed to)\b/i,
    replacement: "Drove",
    note: "Participation is not ownership; state what you personally delivered.",
  },
  {
    pattern: /^(duties includ(ed|e)|tasks includ(ed|e)|job dut(y|ies))\b/i,
    replacement: "Delivered",
    note: "Duty lists are ignored by recruiters skimming for outcomes.",
  },
  {
    pattern: /^(handled|dealt with|took care of|looked after)\b/i,
    replacement: "Managed",
    note: "Vague verbs make measurable work look like maintenance.",
  },
  {
    pattern: /^(familiar with|exposure to|knowledge of|understanding of)\b/i,
    replacement: "Applied",
    note: "Familiarity is not experience; show where you applied it.",
  },
  {
    pattern: /^(various|multiple|several|numerous)\b/i,
    replacement: "",
    note: "Start with a verb, not a quantity adjective.",
  },
];

/** Phrases that consume space without adding signal. */
export const FILLER_PHRASES: { phrase: string; note: string }[] = [
  { phrase: "team player", note: "Unverifiable cliché — show collaboration through an outcome instead." },
  { phrase: "hard worker", note: "Unverifiable cliché — replace with a measurable result." },
  { phrase: "hard-working", note: "Unverifiable cliché — replace with a measurable result." },
  { phrase: "go-getter", note: "Unverifiable cliché." },
  { phrase: "think outside the box", note: "Cliché with no hiring signal." },
  { phrase: "results-oriented", note: "Show the results instead of claiming orientation toward them." },
  { phrase: "results-driven", note: "Show the results instead of claiming orientation toward them." },
  { phrase: "detail-oriented", note: "Prove it with an accuracy or quality metric." },
  { phrase: "self-starter", note: "Replace with an example of work you initiated." },
  { phrase: "dynamic professional", note: "Filler — recruiters skip it." },
  { phrase: "proven track record", note: "Unsubstantiated unless followed by numbers." },
  { phrase: "excellent communication skills", note: "Show an audience and an outcome instead." },
  { phrase: "fast learner", note: "Unverifiable — replace with a ramp-up example." },
  { phrase: "synergy", note: "Corporate filler." },
  { phrase: "wear many hats", note: "Vague — list the specific responsibilities." },
  { phrase: "references available upon request", note: "Wastes a line; references are assumed." },
  { phrase: "curriculum vitae", note: "The document title is unnecessary and confuses some parsers." },
];

export const PERSONAL_PRONOUNS = ["i ", "i'", "me ", "my ", "mine ", "myself"];

/** Metric regexes used to detect quantified impact. Ordered from strongest to weakest signal. */
export const METRIC_PATTERNS: { id: string; label: string; pattern: RegExp; strength: number }[] = [
  { id: "percentage", label: "Percentage", pattern: /\b\d{1,3}(?:\.\d+)?\s?%/g, strength: 1 },
  { id: "currency", label: "Currency", pattern: /(?:[$€£₹]\s?\d[\d,]*(?:\.\d+)?\s?(?:[kKmMbB]|million|billion|thousand|lakh|crore)?)/g, strength: 1 },
  { id: "multiplier", label: "Multiplier", pattern: /\b\d+(?:\.\d+)?\s?[xX]\b|\b(?:doubled|tripled|quadrupled|halved)\b/g, strength: 1 },
  { id: "scale", label: "Scale / volume", pattern: /\b\d[\d,]*(?:\.\d+)?\s?(?:k|m|b|mm)?\+?\s?(?:users|customers|requests|rps|qps|tps|transactions|records|rows|events|queries|daily active|mau|dau|downloads|installs|tickets|nodes|services|microservices|endpoints|repositories|engineers|developers|people|clients|merchants|stores)\b/gi, strength: 1 },
  { id: "time", label: "Time saved", pattern: /\b\d+(?:\.\d+)?\s?(?:ms|milliseconds?|seconds?|secs?|minutes?|mins?|hours?|hrs?|days?|weeks?|months?|quarters?)\b/gi, strength: 0.8 },
  { id: "teamsize", label: "Team size", pattern: /\bteam of \d+|\b\d+[- ](?:person|engineer|member|developer)\b/gi, strength: 0.9 },
  { id: "money_saved", label: "Cost impact", pattern: /\b(?:saving|saved|savings of|cost reduction of|revenue of|arr of)\s?[$€£₹]?\s?\d/gi, strength: 1 },
  { id: "rank", label: "Rank / percentile", pattern: /\btop \d{1,2}%|\b\d{1,2}(?:st|nd|rd|th)\s+(?:place|percentile)\b/gi, strength: 0.9 },
  { id: "sla", label: "Reliability target", pattern: /\b\d{2}(?:\.\d+)?\s?%\s?(?:uptime|availability|slo|sla)\b|\bp\d{2,3}\s?(?:latency)?\b/gi, strength: 1 },
];

/** Impact nouns that make a number meaningful rather than decorative. */
export const IMPACT_NOUNS = [
  "revenue", "profit", "margin", "cost", "spend", "churn", "retention", "conversion", "throughput",
  "latency", "uptime", "availability", "reliability", "adoption", "engagement", "accuracy",
  "precision", "recall", "coverage", "defects", "bugs", "incidents", "downtime", "cycle time",
  "lead time", "deployment frequency", "onboarding time", "build time", "page load", "response time",
  "error rate", "crash rate", "nps", "csat", "arr", "mrr", "gmv", "efficiency", "productivity",
  "utilization", "capacity", "headcount", "attrition",
];

/** Date formats that parse cleanly versus formats that silently drop work history. */
export const DATE_PATTERNS = {
  monthYear:
    /\b(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(t|tember)?|oct(ober)?|nov(ember)?|dec(ember)?)\.?\s+\d{4}\b/gi,
  numericMonthYear: /\b(0[1-9]|1[0-2])[/-]\d{4}\b/g,
  looseNumericMonthYear: /\b[1-9][/-]\d{4}\b/g,
  yearOnly: /\b(19|20)\d{2}\b/g,
  apostropheYear: /['’]\d{2}\b/g,
  fullDate: /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g,
  present: /\b(present|current|ongoing|to date|now)\b/gi,
};

export const LEVEL_ORDER: SeniorityLevel[] = ["intern", "entry", "mid", "senior", "staff", "principal"];

export const LEVEL_LABELS: Record<SeniorityLevel, string> = {
  intern: "Intern / Trainee",
  entry: "Entry level (SDE I)",
  mid: "Mid level (SDE II)",
  senior: "Senior (SDE III / Senior)",
  staff: "Staff",
  principal: "Principal / Distinguished",
};

export interface LevelExpectation {
  id: string;
  dimension: "scope" | "ownership" | "ambiguity" | "depth" | "influence" | "impact";
  label: string;
  expectation: string;
  /** Regexes that evidence the signal in resume text. */
  evidence: RegExp[];
  examplePhrasing: string;
  minLevel: SeniorityLevel;
}

export const LEVEL_EXPECTATIONS: LevelExpectation[] = [
  {
    id: "scope-feature",
    dimension: "scope",
    label: "Feature-level delivery",
    expectation: "Shipped a complete feature or component end to end, not just tasks.",
    evidence: [/\b(shipped|launched|delivered|released)\b/i, /\bend[- ]to[- ]end\b/i, /\bfrom (design|scratch|zero) to (production|launch|ga)\b/i],
    examplePhrasing: "Shipped the guest checkout flow end to end, from design doc to GA rollout across 3 storefronts.",
    minLevel: "entry",
  },
  {
    id: "scope-system",
    dimension: "scope",
    label: "System or service ownership",
    expectation: "Owned a service, subsystem or domain rather than individual tickets.",
    evidence: [/\bown(ed|ership)? (of )?(the )?(service|system|platform|pipeline|domain|component)\b/i, /\b(primary|sole) (owner|maintainer)\b/i, /\bservice owner\b/i],
    examplePhrasing: "Owned the payments ledger service (12k RPS peak) including schema, on-call and capacity planning.",
    minLevel: "mid",
  },
  {
    id: "scope-cross-team",
    dimension: "scope",
    label: "Multi-team scope",
    expectation: "Work spanned more than one team or organisation boundary.",
    evidence: [/\b(cross[- ](team|functional|org)|multi[- ]team|three teams|two teams|partner teams)\b/i, /\bacross \d+ teams\b/i],
    examplePhrasing: "Drove a migration across 4 teams, coordinating rollout sequencing and rollback criteria.",
    minLevel: "senior",
  },
  {
    id: "ownership-oncall",
    dimension: "ownership",
    label: "Production and on-call ownership",
    expectation: "Carried production responsibility: on-call, incidents, postmortems, SLOs.",
    evidence: [/\bon[- ]?call\b/i, /\bincident(s)?\b/i, /\bpostmortem|post[- ]mortem\b/i, /\bslo|sla|error budget\b/i, /\bsev ?[0-3]\b/i, /\bpager\b/i],
    examplePhrasing: "Held primary on-call for 3 services; cut Sev-2 volume 41% by adding saturation alerts and runbooks.",
    minLevel: "mid",
  },
  {
    id: "ownership-design",
    dimension: "ownership",
    label: "Design authority",
    expectation: "Authored design documents or RFCs that others reviewed and built against.",
    evidence: [/\b(design doc|design document|rfc|adr|technical spec|tech spec|architecture (doc|proposal))\b/i, /\bauthored\b/i],
    examplePhrasing: "Authored the RFC for event-sourced inventory; reviewed by 3 staff engineers and adopted org-wide.",
    minLevel: "mid",
  },
  {
    id: "ambiguity-problem-definition",
    dimension: "ambiguity",
    label: "Operating under ambiguity",
    expectation: "Defined the problem or approach where requirements were unclear.",
    evidence: [/\b(ambiguous|undefined|greenfield|from scratch|0 to 1|zero to one|no existing)\b/i, /\bdefined (the )?(problem|scope|requirements|roadmap)\b/i, /\bscoped\b/i],
    examplePhrasing: "Turned an ambiguous 'reduce fraud' mandate into a scoped 3-quarter roadmap with measurable checkpoints.",
    minLevel: "senior",
  },
  {
    id: "depth-performance",
    dimension: "depth",
    label: "Technical depth",
    expectation: "Demonstrated non-trivial engineering depth: performance, scale, correctness or algorithms.",
    evidence: [/\b(latency|throughput|p9[59]|concurrency|memory|allocation|profil(ed|ing)|query plan|index(ing)?|cache|sharding|partition)\b/i, /\b(optimi[sz]ed|tuned|reduced) .*(by )?\d/i],
    examplePhrasing: "Cut p99 read latency from 840 ms to 120 ms by replacing N+1 queries with a covering index and request coalescing.",
    minLevel: "mid",
  },
  {
    id: "influence-mentoring",
    dimension: "influence",
    label: "Mentoring and multiplying",
    expectation: "Raised the output of other engineers through mentoring, review or tooling.",
    evidence: [/\bmentor(ed|ing|ship)?\b/i, /\bonboard(ed|ing) \d*\s*(engineers|developers|interns|new hires)\b/i, /\btrained\b/i, /\bcode review(s)?\b/i, /\bcoached\b/i],
    examplePhrasing: "Mentored 4 engineers; two promoted within a year. Ran the team's code-review guild.",
    minLevel: "senior",
  },
  {
    id: "influence-standards",
    dimension: "influence",
    label: "Standards and process influence",
    expectation: "Changed how the wider organisation works, not just your own output.",
    evidence: [/\b(standardi[sz]ed|established|introduced|rolled out) (the )?(process|standard|practice|framework|guideline|convention)\b/i, /\borg[- ]wide\b/i, /\badopted by\b/i],
    examplePhrasing: "Introduced trunk-based development and CI gating; adopted by 6 teams, cutting release rollbacks 60%.",
    minLevel: "staff",
  },
  {
    id: "impact-business",
    dimension: "impact",
    label: "Business-level impact",
    expectation: "Tied engineering work to revenue, cost, retention or another business metric.",
    evidence: [/\b(revenue|arr|mrr|gmv|cost|churn|retention|conversion|margin|savings?)\b/i],
    examplePhrasing: "Reduced infrastructure spend $310k/yr by right-sizing autoscaling policies across 40 services.",
    minLevel: "mid",
  },
];

/** Bullets-per-role and length guidance keyed by level. */
export const STRUCTURE_TARGETS: Record<
  SeniorityLevel,
  { minWords: number; maxWords: number; idealWords: [number, number]; maxPages: number; minBulletsPerRole: number; maxBulletsPerRole: number; minMetrics: number }
> = {
  intern: { minWords: 220, maxWords: 550, idealWords: [280, 450], maxPages: 1, minBulletsPerRole: 2, maxBulletsPerRole: 5, minMetrics: 2 },
  entry: { minWords: 280, maxWords: 650, idealWords: [350, 550], maxPages: 1, minBulletsPerRole: 3, maxBulletsPerRole: 6, minMetrics: 3 },
  mid: { minWords: 350, maxWords: 800, idealWords: [420, 680], maxPages: 2, minBulletsPerRole: 3, maxBulletsPerRole: 6, minMetrics: 6 },
  senior: { minWords: 400, maxWords: 900, idealWords: [500, 780], maxPages: 2, minBulletsPerRole: 3, maxBulletsPerRole: 6, minMetrics: 8 },
  staff: { minWords: 450, maxWords: 1000, idealWords: [550, 850], maxPages: 3, minBulletsPerRole: 3, maxBulletsPerRole: 7, minMetrics: 9 },
  principal: { minWords: 450, maxWords: 1100, idealWords: [550, 900], maxPages: 3, minBulletsPerRole: 3, maxBulletsPerRole: 7, minMetrics: 9 },
};

export const BULLET_LENGTH = { min: 8, ideal: [12, 26] as [number, number], max: 34 };

/** Role families used for alignment scoring when no job description is supplied. */
export interface RoleProfile {
  id: string;
  label: string;
  /** Canonical taxonomy names weighted by how often they gate a screen. */
  coreSkills: string[];
  supportingSkills: string[];
  titleAliases: string[];
}

export const ROLE_PROFILES: RoleProfile[] = [
  {
    id: "software-engineer",
    label: "Software Engineer",
    coreSkills: ["System Design", "REST APIs", "Git", "Unit Testing", "SQL", "CI/CD", "Code Review"],
    supportingSkills: ["Docker", "AWS", "Distributed Systems", "Observability", "Microservices", "Agile"],
    titleAliases: ["software engineer", "software developer", "sde", "swe", "application developer", "programmer"],
  },
  {
    id: "frontend-engineer",
    label: "Frontend Engineer",
    coreSkills: ["JavaScript", "TypeScript", "React", "CSS", "HTML", "Accessibility", "Web Performance"],
    supportingSkills: ["Next.js", "Unit Testing", "End-to-End Testing", "UX Design", "Vite", "Redux"],
    titleAliases: ["frontend engineer", "front-end engineer", "front end developer", "ui engineer", "web developer"],
  },
  {
    id: "backend-engineer",
    label: "Backend Engineer",
    coreSkills: ["REST APIs", "SQL", "System Design", "Distributed Systems", "Caching", "Microservices"],
    supportingSkills: ["Kafka", "Redis", "PostgreSQL", "Docker", "Kubernetes", "Observability", "gRPC"],
    titleAliases: ["backend engineer", "back-end engineer", "server engineer", "api engineer", "platform engineer"],
  },
  {
    id: "fullstack-engineer",
    label: "Full-Stack Engineer",
    coreSkills: ["JavaScript", "TypeScript", "React", "Node.js", "SQL", "REST APIs"],
    supportingSkills: ["Next.js", "PostgreSQL", "Docker", "CI/CD", "AWS", "Unit Testing"],
    titleAliases: ["full stack engineer", "full-stack developer", "fullstack engineer"],
  },
  {
    id: "data-engineer",
    label: "Data Engineer",
    coreSkills: ["SQL", "Python", "ETL", "Data Modeling", "Spark", "Airflow"],
    supportingSkills: ["Kafka", "Snowflake", "dbt", "AWS", "Data Warehousing", "Docker"],
    titleAliases: ["data engineer", "analytics engineer", "etl developer", "big data engineer"],
  },
  {
    id: "ml-engineer",
    label: "Machine Learning Engineer",
    coreSkills: ["Python", "Machine Learning", "PyTorch", "MLOps", "Statistics", "SQL"],
    supportingSkills: ["Deep Learning", "Large Language Models", "Docker", "AWS", "Natural Language Processing"],
    titleAliases: ["machine learning engineer", "ml engineer", "ai engineer", "applied scientist", "research engineer"],
  },
  {
    id: "devops-engineer",
    label: "DevOps / SRE",
    coreSkills: ["Kubernetes", "Terraform", "CI/CD", "Observability", "Linux", "Docker"],
    supportingSkills: ["AWS", "Site Reliability Engineering", "On-Call", "Bash", "Python", "Security"],
    titleAliases: ["devops engineer", "sre", "site reliability engineer", "infrastructure engineer", "cloud engineer", "platform engineer"],
  },
  {
    id: "mobile-engineer",
    label: "Mobile Engineer",
    coreSkills: ["iOS Development", "Android Development", "React Native", "Unit Testing", "REST APIs"],
    supportingSkills: ["Kotlin", "Swift", "CI/CD", "Web Performance", "Flutter"],
    titleAliases: ["mobile engineer", "ios engineer", "android engineer", "mobile developer"],
  },
  {
    id: "data-analyst",
    label: "Data Analyst",
    coreSkills: ["SQL", "Analytics", "Statistics", "Data Modeling", "Python"],
    supportingSkills: ["A/B Testing", "BigQuery", "Snowflake", "Communication"],
    titleAliases: ["data analyst", "business analyst", "bi analyst", "product analyst"],
  },
  {
    id: "product-manager",
    label: "Product Manager",
    coreSkills: ["Product Sense", "Analytics", "A/B Testing", "Cross-Functional Collaboration", "Communication"],
    supportingSkills: ["SQL", "Agile", "UX Design", "Technical Documentation"],
    titleAliases: ["product manager", "technical product manager", "product owner", "tpm"],
  },
];

export const DEFAULT_ROLE_ID = "software-engineer";

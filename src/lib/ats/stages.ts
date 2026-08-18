import type { AnalysisStage } from "./types";

export interface StageDefinition {
  id: AnalysisStage;
  label: string;
  detail: string;
  /** Fraction of the pipeline complete once this stage finishes. */
  progress: number;
}

export const STAGES: StageDefinition[] = [
  { id: "upload", label: "Reading document", detail: "Verifying the file type from its magic bytes", progress: 0.1 },
  { id: "extract", label: "Extracting text", detail: "Rebuilding reading order from glyph positions", progress: 0.3 },
  { id: "structure", label: "Structuring sections", detail: "Mapping contact, roles, dates, skills and projects", progress: 0.5 },
  { id: "language", label: "Checking language", detail: "Spelling, grammar, tense and cliché detection", progress: 0.66 },
  { id: "score", label: "Scoring six pillars", detail: "Running every deterministic rubric check", progress: 0.82 },
  { id: "match", label: "Matching the role", detail: "Comparing evidence against role and level expectations", progress: 0.92 },
  { id: "insights", label: "Generating insights", detail: "Ranking findings by recoverable points", progress: 1 },
];

export function stageIndex(id: AnalysisStage): number {
  const index = STAGES.findIndex((s) => s.id === id);
  return index === -1 ? STAGES.length - 1 : index;
}

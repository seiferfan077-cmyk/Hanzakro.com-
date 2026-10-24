export type CompetitionQuestionProgress = {
  engineId: number;
  status: "idle" | "running" | "completed" | "failed";
  stage: "reading" | "generating" | "validating" | "saving" | "completed" | "failed";
  totalSources: number;
  processedSources: number;
  totalBatches: number;
  processedBatches: number;
  currentSourceLabel: string | null;
  currentAttempt: number;
  maxAttempts: number;
  acceptedQuestions: number;
  rejectedQuestions: number;
  warnings: string[];
  error: string | null;
  startedAt: number | null;
  updatedAt: number;
  finishedAt: number | null;
};

const progressByEngine = new Map<number, CompetitionQuestionProgress>();

function base(engineId: number): CompetitionQuestionProgress {
  return {
    engineId,
    status: "idle",
    stage: "reading",
    totalSources: 0,
    processedSources: 0,
    totalBatches: 0,
    processedBatches: 0,
    currentSourceLabel: null,
    currentAttempt: 0,
    maxAttempts: 4,
    acceptedQuestions: 0,
    rejectedQuestions: 0,
    warnings: [],
    error: null,
    startedAt: null,
    updatedAt: Date.now(),
    finishedAt: null,
  };
}

export function startCompetitionQuestionProgress(input: { engineId: number; totalSources: number; totalBatches: number }) {
  const value = { ...base(input.engineId), status: "running" as const, totalSources: input.totalSources, totalBatches: input.totalBatches, startedAt: Date.now(), updatedAt: Date.now() };
  progressByEngine.set(input.engineId, value);
  return value;
}

export function updateCompetitionQuestionProgress(engineId: number, patch: Partial<Omit<CompetitionQuestionProgress, "engineId" | "updatedAt">>) {
  const current = progressByEngine.get(engineId) ?? base(engineId);
  const next = { ...current, ...patch, updatedAt: Date.now() };
  progressByEngine.set(engineId, next);
  return next;
}

export function finishCompetitionQuestionProgress(engineId: number, input: { status: "completed" | "failed"; acceptedQuestions?: number; warnings?: string[]; error?: string | null }) {
  return updateCompetitionQuestionProgress(engineId, {
    status: input.status,
    stage: input.status === "completed" ? "completed" : "failed",
    acceptedQuestions: input.acceptedQuestions ?? progressByEngine.get(engineId)?.acceptedQuestions ?? 0,
    warnings: input.warnings ?? progressByEngine.get(engineId)?.warnings ?? [],
    error: input.error ?? null,
    currentSourceLabel: null,
    finishedAt: Date.now(),
  });
}

export function getCompetitionQuestionProgress(engineId: number): CompetitionQuestionProgress {
  return progressByEngine.get(engineId) ?? base(engineId);
}

export function clearCompetitionQuestionProgress(engineId: number) {
  progressByEngine.delete(engineId);
}

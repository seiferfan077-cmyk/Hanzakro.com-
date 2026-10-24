export const competitionQuestionTypes = ["multiple_choice", "true_false", "short_answer", "fill_blank", "definition", "explain", "compare", "ordering", "matching"] as const;

export type CompetitionQuestionType = (typeof competitionQuestionTypes)[number];

export type QuestionQuality = {
  questionClear: boolean;
  oneVerifiableAnswer: boolean;
  referenceIsSufficient: boolean;
};

export type PreparedCompetitionQuestion = {
  sourceId: number;
  questionType: CompetitionQuestionType;
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
  evidenceQuote: string;
  difficulty: number;
  quality: QuestionQuality;
};

export type GeneratedQuestionPayload = Omit<PreparedCompetitionQuestion, "sourceId">;

const normalizeEvidenceForComparison = (value: string) => value
  .normalize("NFKC")
  .replace(/[\u200B-\u200D\uFEFF]/g, "")
  .replace(/\s+/g, " ")
  .trim();

function isLikelyBoilerplateEvidence(value: string) {
  const normalized = value.toLocaleLowerCase("ar-EG");
  if (/https?:\/\/|www\.|copyright|حقوق النشر|جميع الحقوق محفوظة|اسم المدرس|teacher|publisher/.test(normalized)) return true;
  const meaningfulCharacters = (value.match(/[A-Za-z0-9\u0600-\u06FF]/g) ?? []).length;
  const noiseCharacters = (value.match(/[|_~=]{2,}|\.\.\.|�/g) ?? []).length;
  return meaningfulCharacters < 8 || noiseCharacters >= 2;
}

export function parseMatchingPairs(value: string) {
  return value.split("|").map(item => item.split("=>").map(part => part.trim())).filter((pair): pair is [string, string] => pair.length === 2 && Boolean(pair[0]) && Boolean(pair[1]));
}

export function validateGeneratedQuestion(input: GeneratedQuestionPayload, sourceId: number, sourceContent: string): PreparedCompetitionQuestion | null {
  const questionType = competitionQuestionTypes.includes(input.questionType) ? input.questionType : null;
  const prompt = input.prompt?.trim().replace(/\s+/g, " ");
  const answer = input.answer?.trim().replace(/\s+/g, " ");
  const explanation = input.explanation?.trim();
  const evidenceQuote = input.evidenceQuote?.trim();
  const options = Array.isArray(input.options) ? input.options.map(option => option.trim().replace(/\s+/g, " ")).filter(Boolean) : [];
  const quality = input.quality;

  if (!questionType || !prompt || prompt.length < 12 || prompt.length > 1800 || !answer || answer.length > 1800 || !explanation || explanation.length > 3000) return null;
  const normalizedSourceContent = normalizeEvidenceForComparison(sourceContent);
  const normalizedEvidenceQuote = normalizeEvidenceForComparison(evidenceQuote);
  if (!evidenceQuote || evidenceQuote.length < 12 || evidenceQuote.length > 3000 || isLikelyBoilerplateEvidence(evidenceQuote) || !normalizedSourceContent.includes(normalizedEvidenceQuote)) return null;
  if (!quality?.questionClear || !quality.oneVerifiableAnswer || !quality.referenceIsSufficient) return null;
  if ((questionType === "multiple_choice" && (options.length !== 4 || !options.includes(answer))) || (questionType === "true_false" && (options.length !== 2 || !options.includes(answer)))) return null;
  if (questionType === "matching") {
    const left = options.filter(option => option.startsWith("L:")).map(option => option.slice(2).trim()).filter(Boolean);
    const right = options.filter(option => option.startsWith("R:")).map(option => option.slice(2).trim()).filter(Boolean);
    const pairs = parseMatchingPairs(answer);
    if (left.length < 3 || left.length !== right.length || new Set(left).size !== left.length || new Set(right).size !== right.length || pairs.length !== left.length || new Set(pairs.map(pair => pair[0])).size !== left.length || new Set(pairs.map(pair => pair[1])).size !== right.length || pairs.some(([leftValue, rightValue]) => !left.includes(leftValue) || !right.includes(rightValue))) return null;
  } else if (!["multiple_choice", "true_false"].includes(questionType) && options.length > 0) return null;

  return {
    sourceId,
    questionType,
    prompt,
    options,
    answer,
    explanation,
    evidenceQuote,
    difficulty: Math.max(1, Math.min(4, Math.round(input.difficulty))),
    quality,
  };
}

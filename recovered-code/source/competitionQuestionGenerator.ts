import { invokeLLM } from "./_core/llm";
import { getCompetitionEngineForQuestions, saveValidatedCompetitionQuestions } from "./competitionQuestionDb";
import { competitionQuestionTypes, validateGeneratedQuestion, type GeneratedQuestionPayload, type PreparedCompetitionQuestion } from "./competitionQuestionTypes";
import type { MemberSlot } from "./workspaceAccess";
import { finishCompetitionQuestionProgress, startCompetitionQuestionProgress, updateCompetitionQuestionProgress } from "./competitionQuestionProgress";

const maximumSourceCharactersForGeneration = 48000;
const sourceExcerpt = (content: string) => {
  const lines = content.replace(/\r/g, "").split("\n")
    .map(line => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter(line => !/^page\s*\d+(\s+of\s+\d+)?$/i.test(line))
    .filter(line => !/^https?:\/\//i.test(line))
    .filter(line => !/^(copyright|حقوق النشر|جميع الحقوق محفوظة)\b/i.test(line));
  const normalized = lines.join("\n");
  if (normalized.length <= maximumSourceCharactersForGeneration) return normalized;
  const head = 22000;
  const tail = 12000;
  const middle = maximumSourceCharactersForGeneration - head - tail;
  const middleStart = Math.max(0, Math.floor((normalized.length - middle) / 2));
  return `${normalized.slice(0, head)}\n[... مقطع مركزي من المصدر ...]\n${normalized.slice(middleStart, middleStart + middle)}\n[... نهاية المصدر ...]\n${normalized.slice(-tail)}`;
};

function buildCrossSourceContext(sources: Array<{ id: number; label: string; contentSnapshot: string }>, currentSourceId: number) {
  return sources.filter(source => source.id !== currentSourceId).map(source => {
    const excerpt = sourceExcerpt(source.contentSnapshot).slice(0, 4500);
    return excerpt ? `مصدر مساعد: ${source.label}\n${excerpt}` : "";
  }).filter(Boolean).join("\n\n").slice(0, 12000);
}
const minimumQuestionSourceCharacters = 20;
const maximumQuestionsPerRequest = 4;
const maximumQuestionGenerationAttempts = 4;
const questionGenerationTimeoutMs = 75_000;
const reliableQuestionTypes = ["multiple_choice", "true_false", "short_answer", "fill_blank"] as const;

function sourceSentences(content: string) {
  return sourceExcerpt(content)
    .split(/[.!؟?؛;\n]+/)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length >= 20 && sentence.length <= 600)
    .filter(sentence => !/^\d+$/.test(sentence))
    .filter((sentence, index, all) => all.indexOf(sentence) === index);
}

function buildGroundedFallbackQuestions(input: { source: { id: number; contentSnapshot: string }; count: number; existingPrompts: string[] }) {
  const promptKey = (prompt: string) => prompt.trim().replace(/\s+/g, " ").toLocaleLowerCase("ar");
  const known = new Set(input.existingPrompts.map(promptKey));
  const fallback: PreparedCompetitionQuestion[] = [];
  for (const sentence of sourceSentences(input.source.contentSnapshot)) {
    if (fallback.length >= input.count) break;
    const prompt = `هل يذكر المصدر العبارة التالية؟ «${sentence}»`;
    if (known.has(promptKey(prompt))) continue;
    const question = validateGeneratedQuestion({
      questionType: "true_false",
      prompt,
      options: ["صح", "خطأ"],
      answer: "صح",
      explanation: "العبارة مأخوذة حرفياً من النص المتاح في المصدر.",
      evidenceQuote: sentence,
      difficulty: 1,
      quality: { questionClear: true, oneVerifiableAnswer: true, referenceIsSufficient: true },
    }, input.source.id, input.source.contentSnapshot);
    if (question) { fallback.push(question); known.add(promptKey(prompt)); }
  }
  return fallback;
}

function parseCompetitionQuestions(content: string): { questions: GeneratedQuestionPayload[] } {
  const normalized = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const objectStart = normalized.indexOf("{");
  const objectEnd = normalized.lastIndexOf("}");
  if (objectStart < 0 || objectEnd <= objectStart) throw new Error("المصدر أعاد صيغة أسئلة غير مكتملة؛ لم يتم حفظ بنك جزئي.");
  try {
    return JSON.parse(normalized.slice(objectStart, objectEnd + 1)) as { questions: GeneratedQuestionPayload[] };
  } catch {
    throw new Error("المصدر أعاد صيغة أسئلة غير مكتملة؛ لم يتم حفظ بنك جزئي.");
  }
}

export function buildCompetitionSourceQuestionPlan(sources: Array<{ id: number; isPrimary: boolean }>, questionCount: number) {
  if (!sources.length || questionCount < 1) return [];
  const primarySourceId = sources.find(source => source.isPrimary)?.id ?? sources[0].id;
  const helperSources = sources.filter(source => source.id !== primarySourceId);
  const primaryCount = helperSources.length ? Math.max(1, Math.ceil(questionCount * 0.6)) : questionCount;
  const helperBudget = questionCount - primaryCount;
  const helperBaseCount = helperSources.length ? Math.floor(helperBudget / helperSources.length) : 0;
  const helperRemainder = helperSources.length ? helperBudget % helperSources.length : 0;
  return sources.map(source => {
    const helperIndex = helperSources.findIndex(helper => helper.id === source.id);
    const count = source.id === primarySourceId ? primaryCount : helperBaseCount + (helperIndex >= 0 && helperIndex < helperRemainder ? 1 : 0);
    return { sourceId: source.id, count };
  }).filter(item => item.count > 0);
}

const questionSchema = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      minItems: 1,
      maxItems: maximumQuestionsPerRequest,
      items: {
        type: "object",
        properties: {
          questionType: { type: "string", enum: competitionQuestionTypes },
          prompt: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          answer: { type: "string" },
          explanation: { type: "string" },
          evidenceQuote: { type: "string" },
          difficulty: { type: "integer", minimum: 1, maximum: 4 },
          quality: {
            type: "object",
            properties: {
              questionClear: { type: "boolean" },
              oneVerifiableAnswer: { type: "boolean" },
              referenceIsSufficient: { type: "boolean" },
            },
            required: ["questionClear", "oneVerifiableAnswer", "referenceIsSufficient"],
            additionalProperties: false,
          },
        },
        required: ["questionType", "prompt", "options", "answer", "explanation", "evidenceQuote", "difficulty", "quality"],
        additionalProperties: false,
      },
    },
  },
  required: ["questions"],
  additionalProperties: false,
};

function withGenerationTimeout<T>(operation: Promise<T>, sourceLabel: string) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const expiry = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`تأخر تجهيز أسئلة المصدر «${sourceLabel}» أكثر من اللازم. جرّبوا مرة أخرى؛ لم يُحفظ بنك جزئي.`)), questionGenerationTimeoutMs);
  });
  return Promise.race([operation, expiry]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

async function generateForSource(input: { engineId: number; source: { id: number; label: string; contentSnapshot: string }; count: number; difficulty: number; context: string; crossSourceContext: string; typePlan: string[]; existingPrompts: string[] }) {
  if (input.count < 1 || input.count > maximumQuestionsPerRequest) throw new Error("دفعة أسئلة المحرك غير متوافقة مع الحد الآمن للتوليد.");
  const excerpt = sourceExcerpt(input.source.contentSnapshot);
  if (excerpt.length < minimumQuestionSourceCharacters) throw new Error(`المصدر «${input.source.label}» لا يحتوي بعد على نص مقروء كافٍ لبناء سؤال موثّق.`);
  const promptKey = (prompt: string) => prompt.trim().replace(/\s+/g, " ").toLocaleLowerCase("ar");
  const knownPromptKeys = new Set(input.existingPrompts.map(promptKey));
  const accepted: PreparedCompetitionQuestion[] = [];
  for (let attempt = 0; attempt < maximumQuestionGenerationAttempts && accepted.length < input.count; attempt += 1) {
    const remaining = input.count - accepted.length;
    const startedAt = Date.now();
    updateCompetitionQuestionProgress(input.engineId, { stage: "generating", currentSourceLabel: input.source.label, currentAttempt: attempt + 1 });
    console.info(`[competition-question-bank] بدء دفعة ${remaining} سؤال من المصدر ${input.source.id} (محاولة ${attempt + 1})`);
    const response = await withGenerationTimeout(invokeLLM({
      model: "gpt-5-mini",
      maxCompletionTokens: 3000,
      responseFormat: { type: "json_schema", json_schema: { name: "competition_questions", strict: true, schema: questionSchema } },
      messages: [
        { role: "system", content: "أنت صانع بنك أسئلة تعليمية يمر بثلاث مراحل: افهم المادة، اختر المعلومات المهمة، ثم أنشئ سؤالاً وراجعه قبل إرجاعه. استخدم المصدر المعطى فقط، مع الاستفادة من المصادر المساعدة المعروضة للفهم وربط الأفكار دون استخدامها كدليل. يجب أن يكون الدليل الحرفي لكل سؤال من المصدر الأساسي وحده. تجاهل أرقام الصفحات وحقوق النشر والروابط وأسماء المواقع والمدرسين والنص المشوش أو الناقص وأي معلومة خارج موضوع الدرس. لا تسأل عن هوية الناشر أو مكان النشر. لا تخترع معلومة أو إجابة أو سياقاً. ارفض السؤال إذا لم تكن الإجابة موجودة بوضوح، أو كان له أكثر من إجابة صحيحة، أو كان الدليل غير مفهوم. إذا لم يكف النص لعدد الأسئلة فأرجع الأسئلة الموثوقة فقط. كل سؤال يجب أن يكون عربياً واضحاً، وله دليل حرفي دقيق موجود في المصدر الأساسي. في الاختيار من متعدد قدّم 4 بدائل ويجب أن تكون الإجابة النصية أحدها. في صح/خطأ قدّم بالضبط البديلين «صح» و«خطأ». لا تضف خيارات للأسئلة الحرة. لا تكرر سؤالاً أو معنى سؤال ذُكر في قائمة الأسئلة المستبعدة." },
        { role: "user", content: `سياق المحرك: ${input.context}\nالمصدر الأساسي: ${input.source.label}\nالصعوبة المطلوبة: ${input.difficulty}/4\nأنشئ حتى ${remaining} سؤالاً موثوقاً. أنواع الأسئلة المطلوبة: ${input.typePlan.slice(accepted.length, accepted.length + remaining).join("، ")}.\nالأسئلة المستبعدة لتجنب التكرار: ${Array.from(knownPromptKeys).slice(-8).join(" | ") || "لا يوجد"}.\n\nالمصادر المساعدة للفهم وربط الأفكار فقط (لا تستخدمها كدليل حرفي):\n${input.crossSourceContext || "لا يوجد مصدر مساعد"}\n\nالمادة الخام للمصدر الأساسي بعد تنظيف علامات الصفحات والضوضاء:\n${excerpt}` },
      ],
    }), input.source.label);
    console.info(`[competition-question-bank] اكتملت دفعة المصدر ${input.source.id} خلال ${Date.now() - startedAt}ms`);
    const content = response.choices[0]?.message.content;
    if (typeof content !== "string") throw new Error("النموذج لم يرجع صيغة أسئلة قابلة للقراءة.");
    const parsed = parseCompetitionQuestions(content);
    updateCompetitionQuestionProgress(input.engineId, { stage: "validating", currentAttempt: attempt + 1 });
    let rejected = 0;
    for (const question of parsed.questions ?? []) {
      const validated = validateGeneratedQuestion(question, input.source.id, input.source.contentSnapshot);
      if (!validated || knownPromptKeys.has(promptKey(validated.prompt))) { rejected += 1; continue; }
      knownPromptKeys.add(promptKey(validated.prompt));
      accepted.push(validated);
      if (accepted.length === input.count) break;
    }
    updateCompetitionQuestionProgress(input.engineId, { rejectedQuestions: rejected });
  }
  if (accepted.length < input.count) {
    const fallback = buildGroundedFallbackQuestions({ source: input.source, count: input.count - accepted.length, existingPrompts: [...input.existingPrompts, ...accepted.map(question => question.prompt)] });
    if (fallback.length) {
      console.warn(`[competition-question-bank] استخدام ${fallback.length} سؤالاً احتياطياً مثبتاً من نص المصدر ${input.source.id}`);
      accepted.push(...fallback);
    }
  }
  return accepted;
}

export async function generateCompetitionQuestionBank(input: { engineId: number; member: MemberSlot }) {
  const { engine, sources } = await getCompetitionEngineForQuestions(input.engineId);
  if (engine.status !== "draft") throw new Error("المحرك ده اتقفل للتعديل بعد تجهيزه.");
  if (!sources.length) throw new Error("ضيفوا مصدر واحد على الأقل قبل توليد بنك الأسئلة.");
  const readableSources = sources.filter(source => sourceExcerpt(source.contentSnapshot).length >= minimumQuestionSourceCharacters);
  const unreadableSources = sources.filter(source => !readableSources.some(readable => readable.id === source.id));
  if (!readableSources.length) throw new Error("المصدر لا يحتوي حتى الآن على نص قابل للقراءة. ارفعوا PDF قابل للبحث أو صورة أوضح؛ لا يمكن بناء سؤال موثق من ملف فارغ. لن نخترع أسئلة من مصدر غير مقروء.");
  const questionPlan = buildCompetitionSourceQuestionPlan(readableSources, engine.questionCount);
  let typeOffset = 0;
  const batches = questionPlan.flatMap(({ sourceId, count }) => {
    const source = sources.find(item => item.id === sourceId);
    if (!source) throw new Error("تعذر تحديد مصدر أسئلة المحرك.");
    return Array.from({ length: Math.ceil(count / maximumQuestionsPerRequest) }, (_, batchIndex) => {
      const batchCount = Math.min(maximumQuestionsPerRequest, count - batchIndex * maximumQuestionsPerRequest);
      const typePlan = Array.from({ length: batchCount }, (_, offset) => reliableQuestionTypes[(typeOffset + offset) % reliableQuestionTypes.length]);
      typeOffset += batchCount;
      return { source, count: batchCount, typePlan };
    });
  });
  startCompetitionQuestionProgress({ engineId: input.engineId, totalSources: readableSources.length, totalBatches: batches.length });
  const generated: PreparedCompetitionQuestion[] = [];
  const warnings: string[] = unreadableSources.map(source => `تم استبعاد المصدر «${source.label}» لأن النص المقروء فيه أقل من الحد الأدنى؛ لم يتم اختراع أسئلة منه. للـPDF المصوّر استخدموا OCR أو ارفعوا الصفحات كصور واضحة.`);
  for (const batch of batches) {
    updateCompetitionQuestionProgress(input.engineId, { stage: "generating", currentSourceLabel: batch.source.label, currentAttempt: 0, processedBatches: batches.indexOf(batch) });
    try {
      const accepted = await generateForSource({ engineId: input.engineId, source: batch.source, count: batch.count, difficulty: engine.difficulty, typePlan: batch.typePlan, existingPrompts: generated.map(question => question.prompt), context: [engine.subjectName, engine.gradeLevel, engine.unitName, engine.lessonTitle].filter(Boolean).join(" — ") || engine.title, crossSourceContext: buildCrossSourceContext(sources, batch.source.id) });
      generated.push(...accepted);
      updateCompetitionQuestionProgress(input.engineId, { processedBatches: batches.indexOf(batch) + 1, processedSources: new Set(generated.map(question => question.sourceId)).size, acceptedQuestions: generated.length });
      if (accepted.length < batch.count) warnings.push(`المصدر «${batch.source.label}» قدّم ${accepted.length} سؤالاً موثوقاً من أصل ${batch.count} مستهدفاً.`);
    } catch (error) {
      const fallback = buildGroundedFallbackQuestions({ source: batch.source, count: batch.count, existingPrompts: generated.map(question => question.prompt) });
      if (fallback.length) {
        generated.push(...fallback);
        warnings.push(`تعذر رد لؤي الكامل من «${batch.source.label}»؛ تم بناء ${fallback.length} سؤالاً احتياطياً من الجمل الأصلية الموثقة.`);
      } else {
        warnings.push(error instanceof Error ? error.message : `تعذر توليد أسئلة من «${batch.source.label}».`);
      }
      updateCompetitionQuestionProgress(input.engineId, { processedBatches: batches.indexOf(batch) + 1, processedSources: new Set(generated.map(question => question.sourceId)).size, acceptedQuestions: generated.length });
    }
  }
  if (!generated.length) {
    finishCompetitionQuestionProgress(input.engineId, { status: "failed", warnings, error: "لم ينجح لؤي في اعتماد أي سؤال موثوق." });
    throw new Error(`لم ينجح لؤي في اعتماد أي سؤال موثوق. ${warnings.join(" ")}`);
  }
  updateCompetitionQuestionProgress(input.engineId, { stage: "saving", acceptedQuestions: generated.length, warnings });
  return saveValidatedCompetitionQuestions({ engineId: input.engineId, questions: generated.slice(0, engine.questionCount), member: input.member }).then(result => {
    finishCompetitionQuestionProgress(input.engineId, { status: "completed", acceptedQuestions: result.acceptedCount, warnings });
    return { ...result, warnings };
  });
}

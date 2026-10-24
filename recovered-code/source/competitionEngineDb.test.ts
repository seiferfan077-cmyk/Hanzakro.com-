import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./competitionEngineDb.ts", import.meta.url), "utf8");

describe("محرك تنافس لؤي", () => {
  it("يحفظ لقطة النص للمصدر ويرفض بدء التعديل على محرك غير مسودة", () => {
    expect(source).toContain("contentSnapshot");
    expect(source).toContain("المحرك ده اتقفل للتعديل بعد تجهيزه");
    expect(source).toContain("sourceType: \"study_file\"");
    expect(source).toContain("sourceType: \"lesson_note\"");
    expect(source).toContain("updateCompetitionEngineContext");
    expect(source).toContain("ensureDraftEngine(input.engineId)");
    expect(source).toContain("deleteCompetitionEngine");
    expect(source).toContain("المحرك مربوط بمباراة شغالة الآن");
    expect(source).toContain("const hasRecordedSession = matches.length > 0");
    expect(source).toContain("if (!hasRecordedSession)");
    expect(source).toContain("await tx.delete(competitionQuestions)");
    expect(source).toContain("addCompetitionImageSource");
    expect(source).toContain("sourceType: \"image\"");
    expect(source).toContain("isPrimary: existing.length === 0");
    expect(source).toContain("setCompetitionPrimarySource");
    expect(source).toContain("set({ isPrimary: false })");
    expect(source).toContain("المصدر ده مش تابع للمحرك المحدد");
  });

  it("يدعم رفع كتاب PDF خاص داخل المحرك فقط ويحفظ لقطة نطاق الصفحات بعد التحقق من الملف", () => {
    expect(source).toContain("addCompetitionUploadedPdfSource");
    expect(source).toContain("decodeCompetitionPdfUpload");
    expect(source).toContain("MAX_COMPETITION_PDF_BYTES");
    expect(source).toContain("extractPdfIndex(bytes)");
    expect(source).toContain("selectPdfPageRange(index.pages");
    expect(source).toContain("storagePut(`competition-sources/${input.engineId}/books/");
    expect(source).toContain("الملف المرفوع ليس PDF صالحاً");
    expect(source).toContain("حددوا أول وآخر صفحة معاً، أو اتركوا الاثنين فارغين");
    expect(source).toContain("الكتاب اتقرأ لكنه لا يحتوي نصاً صالحاً للأسئلة");
    expect(source).toContain("النطاق المختار ما فيهوش نص كفاية لتوليد أسئلة موثقة");
  });

  it("يبحث تلقائياً في الويب بعد إضافة محتوى ويضيف النتيجة المستخرجة كمصدر مساعد فقط", () => {
    expect(source).toContain("deriveAutomaticWebQuery");
    expect(source).toContain("addAutomaticWebSupport");
    expect(source).toContain("researchWeb(query)");
    expect(source).toContain('sourceType: "url"');
    expect(source).toContain("isPrimary: false");
    expect(source).toContain('if (input.sourceType !== "url") await addAutomaticWebSupport');
  });

  it("يعيد تشغيل البحث من مصادر الجلسة المقروءة نفسها من دون استعلام حر من المستخدم", () => {
    expect(source).toContain("refreshCompetitionAutomaticWebSupport");
    expect(source).toContain('source.sourceType !== "url"');
    expect(source).toContain("البحث المساعد يبدأ من مصدر الجلسة نفسه");
    expect(source).toContain("await Promise.all(sources.map(source => addAutomaticWebSupport");
  });

  it("يحفظ استعلام البحث ونتائجه المختصرة والمصدر المختار ويعرض لقطة المصدر فقط في القارئ", () => {
    expect(source).toContain("competitionAutomaticWebResearches");
    expect(source).toContain("resultsJson");
    expect(source).toContain("listCompetitionAutomaticWebResearches");
    expect(source).toContain("getCompetitionAutomaticWebReader");
    expect(source).toContain("contentSnapshot");
    expect(source).not.toContain("answerJson");
  });
});

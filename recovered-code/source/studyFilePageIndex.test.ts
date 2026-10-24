import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./studyFilePageIndex.ts", import.meta.url), "utf8");

describe("تجهيز فهرس صفحات كتاب المكتبة", () => {
  it("يعيد استخدام مستخرج PDF ويمنع إنشاء نطاق بلا صفحات نصية", () => {
    expect(source).toContain("extractPdfIndex");
    expect(source).toContain("pageTextIndex");
    expect(source).toContain("selectPdfPageRange");
    expect(source).toContain("يحتاج OCR");
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./competitionImageOcr.ts", import.meta.url), "utf8");

describe("OCR مصادر المنافسة", () => {
  it("يطلب ناتجاً منظماً ويمنع حفظ صورة غير مقروءة بثقة كافية", () => {
    expect(source).toContain("gemini-3-flash-preview");
    expect(source).toContain("json_schema");
    expect(source).toContain("parsed.confidence < 70");
    expect(source).toContain("الصورة ما اتقريتش بثقة كفاية");
    expect(source).toContain("storagePut");
  });
});

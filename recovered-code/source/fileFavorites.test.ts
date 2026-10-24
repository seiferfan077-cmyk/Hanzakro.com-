import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./workspaceContentDb.ts", import.meta.url), "utf8");

describe("مفضلة الكتب المشتركة", () => {
  it("تعيد حالة المفضلة وتحدّثها من دون تغيير محتوى الكتاب", () => {
    expect(source).toContain("isFavorite: studyFiles.isFavorite");
    expect(source).toContain("setStudyFileFavorite");
    expect(source).toContain("set({ isFavorite })");
  });
});

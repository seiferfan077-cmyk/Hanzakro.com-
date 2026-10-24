import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("واجهة سؤال لؤي المصوّر", () => {
  const source = readFileSync("client/src/components/LoayExamRoom.tsx", "utf8");

  it("تعرض صورة السؤال من مسار التخزين الموثوق وتفتحها داخل نافذة كاملة", () => {
    expect(source).toContain("function storageImageUrl(storageKey: string)");
    expect(source).toContain("/manus-storage/${storageKey.split");
    expect(source).toContain("فتح بالحجم الكامل");
    expect(source).toContain("<Dialog open={Boolean(openedImage)}");
  });

  it("يكشف تعليق التصحيح تدريجياً مع زر إظهار فوري واحترام تفضيل تقليل الحركة", () => {
    expect(source).toContain("function SlowFeedback");
    expect(source).toContain("prefers-reduced-motion: reduce");
    expect(source).toContain("إظهار كل تعليقات لؤي فوراً");
    expect(source).toContain("startDelayMs={index * 360}");
  });
});


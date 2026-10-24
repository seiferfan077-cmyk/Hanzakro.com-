import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("مكان العضو الحي داخل المنصة", () => {
  it("يحدّث القسم فور تغيّر المسار ولا يعيد إنشاء حضور Firebase بسبب المسار", async () => {
    const source = await readFile("client/src/components/StudyTimeWidget.tsx", "utf8");
    expect(source).toContain('"/whiteboard": "السبورة البيضاء"');
    expect(source).toContain('"/files": "المكتبة"');
    expect(source).toContain('"/chat": "الدردشة"');
    expect(source).toContain('"/competition": "التنافس"');
    expect(source).toContain("updateLocalPresence({ activity: baseActivity, section: baseActivity })");
    expect(source).toContain("const currentSection = baseActivityRef.current");
    expect(source).toContain("}, [identity, active?.id, active?.plannedMinutes]);");
    expect(source).not.toContain("}, [identity, baseActivity, active?.id, active?.plannedMinutes]);");
  });
});

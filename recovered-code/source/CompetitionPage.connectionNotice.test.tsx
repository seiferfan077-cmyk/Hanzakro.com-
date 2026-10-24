import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./CompetitionPage.tsx", import.meta.url), "utf8");

describe("تنبيه اتصال غرفة المنافسة", () => {
  it("يعرض الانقطاع كحالة معلنة ويحافظ على الغرفة والسؤال", () => {
    expect(source).toContain('role="alert" aria-live="assertive"');
    expect(source).toContain("تقدمكم محفوظ في الغرفة الخادمية");
    expect(source).toContain("مش هنلغي المباراة ولا نعيد السؤال");
  });

  it("يراقب online/offline ويطلب آخر حالة خادمية عند العودة", () => {
    expect(source).toContain('window.addEventListener("offline"');
    expect(source).toContain('window.addEventListener("online"');
    expect(source).toContain("void refreshMatch();");
    expect(source).toContain("رجع الاتصال — بنستعيد آخر حالة محفوظة");
  });
});

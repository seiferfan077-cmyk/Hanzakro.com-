import { describe, expect, it } from "vitest";
import { nextLocationArrival, shouldPlayLocationArrivalSound } from "./locationArrival";

describe("تنبيه وصول مشاركة المكان", () => {
  it("لا ينبه عن مشاركة كانت موجودة قبل فتح المنصة", () => {
    expect(nextLocationArrival({ initialized: false, shareId: null }, "old-share").shouldAnnounce).toBe(false);
  });

  it("ينبه مرة واحدة عند وصول مشاركة جديدة ثم لا يكررها", () => {
    const first = nextLocationArrival({ initialized: true, shareId: null }, "new-share");
    expect(first.shouldAnnounce).toBe(true);
    expect(nextLocationArrival(first.state, "new-share").shouldAnnounce).toBe(false);
  });

  it("يعيد تفعيل التنبيه بعد انتهاء مشاركة قديمة ووصول مشاركة أخرى", () => {
    const cleared = nextLocationArrival({ initialized: true, shareId: "first-share" }, null);
    expect(cleared.shouldAnnounce).toBe(false);
    expect(nextLocationArrival(cleared.state, "second-share").shouldAnnounce).toBe(true);
  });

  it("لا يطلب تشغيل النغمة عند كتمها أو عند تفضيل تقليل الحركة", () => {
    expect(shouldPlayLocationArrivalSound(false, false)).toBe(false);
    expect(shouldPlayLocationArrivalSound(true, true)).toBe(false);
    expect(shouldPlayLocationArrivalSound(true, false)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { LOCATION_SHARE_TTL_MS, createLocationShare, getLocationShareForMember, isLocationShareActive, normalizeLocationShare, partnerSlot } from "./locationShare";

const now = 1_780_000_000_000;

describe("مشاركة الموقع المؤقتة", () => {
  it("تربط المشاركة تلقائياً بالطرف الآخر وتنتهي بعد عشر دقائق", () => {
    const share = createLocationShare("saif", { latitude: 30.04442, longitude: 31.23571, accuracy: 12.8 } as GeolocationCoordinates, now);
    expect(share.recipient).toBe("haneen");
    expect(share.placeLabel).toContain("نقطة الخريطة");
    expect(share.expiresAtMs).toBe(now + LOCATION_SHARE_TTL_MS);
    expect(isLocationShareActive(share, now + LOCATION_SHARE_TTL_MS - 1)).toBe(true);
    expect(isLocationShareActive(share, now + LOCATION_SHARE_TTL_MS)).toBe(false);
    expect(normalizeLocationShare({ ...share, expiresAtMs: now + LOCATION_SHARE_TTL_MS + 1 })).toBeNull();
  });

  it("لا يعرض الموقع إلا للطرف المستلم الصحيح وبداخل فترة الصلاحية", () => {
    const share = createLocationShare("haneen", { latitude: 31.2001, longitude: 29.9187, accuracy: 7 } as GeolocationCoordinates, now);
    expect(getLocationShareForMember(share, "saif", now)?.id).toBe(share.id);
    expect(getLocationShareForMember(share, "haneen", now)).toBeNull();
    expect(getLocationShareForMember(share, "saif", share.expiresAtMs)).toBeNull();
  });

  it("يرفض بيانات مكان غير صالحة أو مشاركة لطرف غير موجود", () => {
    expect(normalizeLocationShare({ sender: "saif", recipient: "haneen", latitude: 140, longitude: 31, createdAtMs: now, expiresAtMs: now + 5000, id: "x" })).toBeNull();
    expect(partnerSlot("saif")).toBe("haneen");
  });

  it("يحتفظ بوصف المكان الذي يرسله صاحبه للطرف الثاني", () => {
    const share = createLocationShare("saif", { latitude: 30.04442, longitude: 31.23571, accuracy: 3 } as GeolocationCoordinates, now, "القاهرة، مصر");
    expect(normalizeLocationShare(share)?.placeLabel).toBe("القاهرة، مصر");
  });
});

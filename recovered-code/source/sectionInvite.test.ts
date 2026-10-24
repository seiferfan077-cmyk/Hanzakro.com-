import { describe, expect, it } from "vitest";
import { SECTION_INVITE_DURATION_MS, createSectionInvite, getSectionInviteForMember, normalizeSectionInvite } from "./sectionInvite";

describe("دعوة الانتقال للقسم", () => {
  it("تنشئ دعوة قصيرة للطرف الآخر لمسار معروف فقط", () => {
    const invite = createSectionInvite("saif", "/files", 1_000);
    expect(invite).toMatchObject({ sender: "saif", recipient: "haneen", sectionPath: "/files", sectionLabel: "المكتبة", expiresAtMs: 1_000 + SECTION_INVITE_DURATION_MS });
    expect(createSectionInvite("saif", "/unsafe-route", 1_000)).toBeNull();
  });
  it("تظهر الدعوة للمستلم المقصود فقط وتنتهي في موعدها", () => {
    const invite = createSectionInvite("haneen", "/whiteboard", 10_000)!;
    expect(getSectionInviteForMember(invite, "saif", 10_010)?.sectionLabel).toBe("السبورة البيضاء");
    expect(getSectionInviteForMember(invite, "haneen", 10_010)).toBeNull();
    expect(getSectionInviteForMember(invite, "saif", invite.expiresAtMs)).toBeNull();
  });
  it("يرفض دعوة معدلة أو توجّه لمسار غير موجود", () => {
    const invite = createSectionInvite("saif", "/goals", 10_000)!;
    expect(normalizeSectionInvite({ ...invite, sectionPath: "/admin" })).toBeNull();
    expect(normalizeSectionInvite({ ...invite, sectionLabel: "قسم مختلف" })).toBeNull();
  });
});

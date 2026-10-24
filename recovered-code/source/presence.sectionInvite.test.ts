import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ ensureFirebaseSession: vi.fn(), doc: vi.fn(), setDoc: vi.fn(), serverTimestamp: vi.fn(() => "server-time") }));
vi.mock("./firebase", () => ({ firestore: { marker: "firebase-db" }, ensureFirebaseSession: mocks.ensureFirebaseSession }));
vi.mock("firebase/firestore", () => ({ collection: vi.fn(), doc: mocks.doc, onSnapshot: vi.fn(), serverTimestamp: mocks.serverTimestamp, setDoc: mocks.setDoc }));

import { consumeSectionInviteNow, sendSectionInviteNow } from "./presence";
import { createSectionInvite } from "./sectionInvite";

describe("إرسال دعوة القسم فوراً", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.ensureFirebaseSession.mockResolvedValue(undefined); mocks.doc.mockReturnValue("presence-document"); mocks.setDoc.mockResolvedValue(undefined); });

  it("يكتب مسار الداعي في مستند حضوره مباشرة لحظة الضغط", async () => {
    const invite = createSectionInvite("saif", "/goals")!;
    await sendSectionInviteNow(invite);
    expect(mocks.ensureFirebaseSession).toHaveBeenCalledWith("saif");
    expect(mocks.setDoc).toHaveBeenCalledWith("presence-document", expect.objectContaining({ slot: "saif", online: true, sectionInvite: expect.objectContaining({ sectionPath: "/goals", sectionLabel: "الأهداف", recipient: "haneen" }) }), { merge: true });
  });

  it("يسجل استهلاك الدعوة عند المستلم قبل انتقاله فلا تعود للظهور", async () => {
    await consumeSectionInviteNow("haneen", "invite-current-section");
    expect(mocks.ensureFirebaseSession).toHaveBeenCalledWith("haneen");
    expect(mocks.setDoc).toHaveBeenCalledWith("presence-document", expect.objectContaining({ slot: "haneen", consumedSectionInviteId: "invite-current-section" }), { merge: true });
  });
});

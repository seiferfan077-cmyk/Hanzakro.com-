import { describe, expect, it } from "vitest";
import { createWorkspaceMemberToken } from "./firebaseAdmin";

describe("Firebase section invite transport", () => {
  it("delivers a temporary section invite payload from Saif to Haneen and removes only the test document", async () => {
    const key = process.env.VITE_FIREBASE_API_KEY;
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
    expect(key).toBeTruthy();
    expect(projectId).toBeTruthy();
    const signIn = async (memberSlot: "saif" | "haneen") => {
      const customToken = await createWorkspaceMemberToken(memberSlot);
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(key!)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: customToken, returnSecureToken: true }) });
      expect(response.ok).toBe(true);
      const session = await response.json() as { idToken?: string };
      expect(session.idToken).toBeTruthy();
      return session.idToken!;
    };
    const saifToken = await signIn("saif");
    const haneenToken = await signIn("haneen");
    const documentId = `section-invite-check-${Date.now()}`;
    const documentUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId!)}/databases/(default)/documents/studyChatMessages/${documentId}`;
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${saifToken}` };
    const now = Date.now();
    try {
      const write = await fetch(documentUrl, { method: "PATCH", headers, body: JSON.stringify({ fields: { sender: { stringValue: "saif" }, content: { stringValue: "إشارة اختبار دعوة القسم" }, createdAtMs: { integerValue: String(now) }, deleted: { booleanValue: false }, sectionInvite: { mapValue: { fields: { id: { stringValue: `invite-${now}` }, sender: { stringValue: "saif" }, recipient: { stringValue: "haneen" }, sectionPath: { stringValue: "/files" }, sectionLabel: { stringValue: "المكتبة" }, createdAtMs: { integerValue: String(now) }, expiresAtMs: { integerValue: String(now + 90_000) } } } } } }) });
      expect(write.ok).toBe(true);
      const read = await fetch(documentUrl, { headers: { Authorization: `Bearer ${haneenToken}` } });
      expect(read.ok).toBe(true);
      const value = await read.json() as { fields?: { sectionInvite?: { mapValue?: { fields?: { recipient?: { stringValue?: string }; sectionPath?: { stringValue?: string }; sectionLabel?: { stringValue?: string } } } } } };
      expect(value.fields?.sectionInvite?.mapValue?.fields?.recipient?.stringValue).toBe("haneen");
      expect(value.fields?.sectionInvite?.mapValue?.fields?.sectionPath?.stringValue).toBe("/files");
      expect(value.fields?.sectionInvite?.mapValue?.fields?.sectionLabel?.stringValue).toBe("المكتبة");
    } finally {
      await fetch(documentUrl, { method: "DELETE", headers });
    }
  }, 30_000);
});

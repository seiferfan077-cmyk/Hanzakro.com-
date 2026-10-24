import type { PresenceSlot } from "./presence";

export type SectionDestination = { path: string; label: string };
export type SectionInvite = { id: string; sender: PresenceSlot; recipient: PresenceSlot; sectionPath: string; sectionLabel: string; createdAtMs: number; expiresAtMs: number };

export const SECTION_INVITE_DURATION_MS = 90_000;

const destinations: SectionDestination[] = [
  { path: "/", label: "لوحة اليوم" }, { path: "/lesson-notes", label: "ملاحظات الدرس" }, { path: "/whiteboard", label: "السبورة البيضاء" }, { path: "/assistant", label: "مساعد لؤي" }, { path: "/focus", label: "جلسة التركيز" }, { path: "/files", label: "المكتبة" }, { path: "/tasks", label: "مهام اليوم" }, { path: "/goals", label: "الأهداف" }, { path: "/activity", label: "سجل النشاط" }, { path: "/baccalaureate", label: "مسار البكالوريا" }, { path: "/notes", label: "الملاحظات" }, { path: "/smart-study", label: "الدراسة الذكية" }, { path: "/study-room", label: "غرفة المذاكرة" }, { path: "/competition", label: "التنافس" }, { path: "/lessons", label: "دروسنا" }, { path: "/video-lessons", label: "فيديوهات الشرح" }, { path: "/chat", label: "الدردشة" }, { path: "/private-messages", label: "رسائلنا" }, { path: "/baleh", label: "بليه" }, { path: "/manuals", label: "الكتيبات" }, { path: "/developer", label: "المطور" }, { path: "/notifications", label: "الإشعارات" }, { path: "/account", label: "حسابي" }, { path: "/settings", label: "الإعدادات" },
];

const destinationByPath = new Map(destinations.map(destination => [destination.path, destination]));
const otherMember = (member: PresenceSlot): PresenceSlot => member === "saif" ? "haneen" : "saif";

export function getSectionDestination(path: string | null | undefined): SectionDestination | null { return destinationByPath.get(path ?? "") ?? null; }
export function isSectionInviteActive(invite: SectionInvite | null | undefined, now = Date.now()) { return Boolean(invite && invite.createdAtMs <= now && invite.expiresAtMs > now && invite.expiresAtMs - invite.createdAtMs <= SECTION_INVITE_DURATION_MS); }
export function normalizeSectionInvite(value: unknown, now = Date.now()): SectionInvite | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<SectionInvite>;
  if ((candidate.sender !== "saif" && candidate.sender !== "haneen") || (candidate.recipient !== "saif" && candidate.recipient !== "haneen") || candidate.sender === candidate.recipient || typeof candidate.id !== "string" || candidate.id.length < 8 || typeof candidate.sectionPath !== "string" || typeof candidate.sectionLabel !== "string" || typeof candidate.createdAtMs !== "number" || typeof candidate.expiresAtMs !== "number") return null;
  const destination = getSectionDestination(candidate.sectionPath);
  if (!destination || destination.label !== candidate.sectionLabel) return null;
  const invite: SectionInvite = { id: candidate.id, sender: candidate.sender, recipient: candidate.recipient, sectionPath: candidate.sectionPath, sectionLabel: candidate.sectionLabel, createdAtMs: candidate.createdAtMs, expiresAtMs: candidate.expiresAtMs };
  return isSectionInviteActive(invite, now) ? invite : null;
}
export function createSectionInvite(sender: PresenceSlot, sectionPath: string, now = Date.now()): SectionInvite | null {
  const destination = getSectionDestination(sectionPath);
  if (!destination) return null;
  const id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${sender}-${now}-${Math.random().toString(36).slice(2, 10)}`;
  return { id, sender, recipient: otherMember(sender), sectionPath: destination.path, sectionLabel: destination.label, createdAtMs: now, expiresAtMs: now + SECTION_INVITE_DURATION_MS };
}
export function getSectionInviteForMember(invite: unknown, member: PresenceSlot, now = Date.now()) { const normalized = normalizeSectionInvite(invite, now); return normalized?.recipient === member && isSectionInviteActive(normalized, now) ? normalized : null; }

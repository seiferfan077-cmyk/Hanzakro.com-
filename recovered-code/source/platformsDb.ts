import { desc, eq } from "drizzle-orm";
import { platformLinks, platformVideoNotes, platformVideos } from "../drizzle/schema";
import { getDb } from "./db";

export type MemberSlot = "saif" | "haneen";
export type PlatformVideoKind = "youtube" | "direct" | "embed";

export type CreatePlatformLinkInput = {
  title: string;
  url: string;
  description?: string;
  accentColor?: string;
};

export type UpdatePlatformLinkInput = CreatePlatformLinkInput & { id: number };

export type CreatePlatformVideoInput = {
  platformLinkId: number;
  title: string;
  sourceUrl: string;
};

export type CreatePlatformVideoNoteInput = {
  videoId: number;
  atSeconds: number;
  note: string;
};

async function database() {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات مش متاحة دلوقتي.");
  return db;
}

function clean(value: string | undefined, limit: number) {
  return (value ?? "").trim().replace(/\s+/g, " ").slice(0, limit);
}

export function normalizeHttpUrl(value: string) {
  const raw = value.trim();
  if (!raw) throw new Error("اكتب رابط المنصة الأول.");
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^https?:\/\//i.test(raw)) throw new Error("مسموح بروابط http أو https فقط.");
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("الرابط ده مش صالح.");
  }
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error("مسموح بروابط http أو https فقط.");
  }
  return parsed.toString();
}

export function hostFromUrl(value: string) {
  return new URL(value).hostname.replace(/^www\./i, "").toLowerCase().slice(0, 255);
}

function youtubeVideoId(value: string) {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    if (host === "youtu.be") return parsed.pathname.slice(1).match(/^[A-Za-z0-9_-]{11}/)?.[0] ?? null;
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const queryId = parsed.searchParams.get("v");
      if (queryId && /^[A-Za-z0-9_-]{11}$/.test(queryId)) return queryId;
      const embedId = parsed.pathname.match(/\/embed\/([A-Za-z0-9_-]{11})/i)?.[1];
      if (embedId) return embedId;
    }
  } catch { /* handled by normalizeHttpUrl */ }
  return null;
}

function directVideoUrl(value: string) {
  try {
    return /\.(mp4|webm|ogg|m3u8)(?:$|[?#])/i.test(new URL(value).pathname + new URL(value).search);
  } catch {
    return false;
  }
}

function inferVideo(value: string) {
  const videoId = youtubeVideoId(value);
  if (videoId) return { kind: "youtube" as const, videoId, embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1&rel=0&enablejsapi=1` };
  if (directVideoUrl(value)) return { kind: "direct" as const, videoId: null, embedUrl: null };
  return { kind: "embed" as const, videoId: null, embedUrl: value };
}

function safeColor(value: string | undefined) {
  const color = (value ?? "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : "#315f4d";
}

export async function listPlatformHub() {
  const db = await database();
  const [links, videos, notes] = await Promise.all([
    db.select().from(platformLinks).orderBy(desc(platformLinks.updatedAt)).limit(120),
    db.select().from(platformVideos).orderBy(desc(platformVideos.updatedAt)).limit(240),
    db.select().from(platformVideoNotes).orderBy(desc(platformVideoNotes.updatedAt)).limit(600),
  ]);
  return { links, videos, notes };
}

export async function createPlatformLink(input: CreatePlatformLinkInput, member: MemberSlot) {
  const url = normalizeHttpUrl(input.url);
  const title = clean(input.title, 240);
  if (!title) throw new Error("اكتب اسم المنصة الأول.");
  const db = await database();
  const result = await db.insert(platformLinks).values({ title, url, host: hostFromUrl(url), description: clean(input.description, 600), accentColor: safeColor(input.accentColor), createdBy: member, updatedBy: member });
  const header = Array.isArray(result) ? result[0] : result;
  return Number((header as { insertId?: unknown } | undefined)?.insertId ?? 0);
}

export async function updatePlatformLink(input: UpdatePlatformLinkInput, member: MemberSlot) {
  const url = normalizeHttpUrl(input.url);
  const title = clean(input.title, 240);
  if (!title) throw new Error("اكتب اسم المنصة الأول.");
  const db = await database();
  await db.update(platformLinks).set({ title, url, host: hostFromUrl(url), description: clean(input.description, 600), accentColor: safeColor(input.accentColor), updatedBy: member }).where(eq(platformLinks.id, input.id));
}

export async function deletePlatformLink(id: number) {
  const db = await database();
  const videos = await db.select({ id: platformVideos.id }).from(platformVideos).where(eq(platformVideos.platformLinkId, id));
  for (const video of videos) await db.delete(platformVideoNotes).where(eq(platformVideoNotes.videoId, video.id));
  await db.delete(platformVideos).where(eq(platformVideos.platformLinkId, id));
  await db.delete(platformLinks).where(eq(platformLinks.id, id));
}

export async function createPlatformVideo(input: CreatePlatformVideoInput, member: MemberSlot) {
  const sourceUrl = normalizeHttpUrl(input.sourceUrl);
  const title = clean(input.title, 500);
  if (!title) throw new Error("اكتب اسم الفيديو الأول.");
  const inferred = inferVideo(sourceUrl);
  const db = await database();
  const link = await db.select({ id: platformLinks.id }).from(platformLinks).where(eq(platformLinks.id, input.platformLinkId)).limit(1);
  if (!link[0]) throw new Error("المنصة دي مش موجودة.");
  const allowDownload = false;
  const result = await db.insert(platformVideos).values({ platformLinkId: input.platformLinkId, title, sourceUrl, kind: inferred.kind, videoId: inferred.videoId, embedUrl: inferred.embedUrl, thumbnailUrl: inferred.videoId ? `https://i.ytimg.com/vi/${inferred.videoId}/hqdefault.jpg` : null, allowDownload, downloadNote: allowDownload ? "الملف من مساحة التخزين الموثوقة ويمكن فتحه أو تنزيله." : "المصدر الخارجي لا يتيح تنزيل الملف من داخل المنصة. استخدم رابط المصدر أو ارفع ملفاً تملكه.", createdBy: member, updatedBy: member });
  const header = Array.isArray(result) ? result[0] : result;
  return Number((header as { insertId?: unknown } | undefined)?.insertId ?? 0);
}

export async function deletePlatformVideo(id: number) {
  const db = await database();
  await db.delete(platformVideoNotes).where(eq(platformVideoNotes.videoId, id));
  await db.delete(platformVideos).where(eq(platformVideos.id, id));
}

export async function createPlatformVideoNote(input: CreatePlatformVideoNoteInput, member: MemberSlot) {
  const note = input.note.trim().slice(0, 4000);
  if (!note) throw new Error("اكتب الملاحظة الأول.");
  if (!Number.isInteger(input.atSeconds) || input.atSeconds < 0) throw new Error("وقت الملاحظة مش صالح.");
  const db = await database();
  const video = await db.select({ id: platformVideos.id }).from(platformVideos).where(eq(platformVideos.id, input.videoId)).limit(1);
  if (!video[0]) throw new Error("الفيديو ده مش موجود.");
  const result = await db.insert(platformVideoNotes).values({ videoId: input.videoId, atSeconds: input.atSeconds, note, createdBy: member, updatedBy: member });
  const header = Array.isArray(result) ? result[0] : result;
  return Number((header as { insertId?: unknown } | undefined)?.insertId ?? 0);
}

export async function deletePlatformVideoNote(id: number) {
  const db = await database();
  await db.delete(platformVideoNotes).where(eq(platformVideoNotes.id, id));
}

export function inferPlatformVideo(value: string) {
  const sourceUrl = normalizeHttpUrl(value);
  return { sourceUrl, ...inferVideo(sourceUrl), allowDownload: false as const };
}

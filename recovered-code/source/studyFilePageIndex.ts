import { eq } from "drizzle-orm";
import { studyFiles } from "../drizzle/schema";
import { getDb } from "./db";
import { downloadGoogleDriveFileBytes } from "./googleDrive";
import { extractPdfIndex, parsePdfPageIndex, selectPdfPageRange } from "./pdfIndex";
import { storageGetSignedUrl } from "./storage";

const MAX_REINDEX_BYTES = 30 * 1024 * 1024;

async function database() {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  return db;
}

export async function downloadStudyFile(file: typeof studyFiles.$inferSelect) {
  if (file.storageProvider === "google_drive") {
    if (!file.providerFileId) throw new Error("معرّف كتاب Google Drive غير موجود.");
    return downloadGoogleDriveFileBytes(file.providerFileId);
  }
  const signedUrl = await storageGetSignedUrl(file.storageKey);
  const response = await fetch(signedUrl);
  if (!response.ok) throw new Error("تعذر تنزيل الكتاب لفهرسة الصفحات.");
  return new Uint8Array(await response.arrayBuffer());
}

export async function ensureStudyFilePageIndex(fileId: number) {
  const db = await database();
  const [file] = await db.select().from(studyFiles).where(eq(studyFiles.id, fileId)).limit(1);
  if (!file) throw new Error("كتاب المكتبة مش موجود.");
  const currentPages = parsePdfPageIndex(file.pageTextIndex);
  if (currentPages.length) return { file, pages: currentPages, pageCount: file.pageCount ?? currentPages.length };
  if (file.mimeType !== "application/pdf") throw new Error("اختاروا كتاب PDF صالح لنطاق الصفحات.");
  if (file.sizeBytes > MAX_REINDEX_BYTES) throw new Error("الكتاب أكبر من الحد الآمن لفهرسة الصفحات الآن. استخدموا كتاباً أصغر أو اختاروا المصدر كاملًا.");
  const index = await extractPdfIndex(await downloadStudyFile(file));
  if (!index.pages.length) throw new Error("الكتاب لا يحتوي نصاً مفهرساً صفحةً بصفحة. محتواه المصور يحتاج OCR قبل اختيار نطاق صفحات.");
  await db.update(studyFiles).set({ pageTextIndex: JSON.stringify(index.pages), pageCount: index.pageCount }).where(eq(studyFiles.id, fileId));
  return { file, pages: index.pages, pageCount: index.pageCount };
}

export async function extractStudyFilePageRange(input: { fileId: number; pageStart: number; pageEnd: number }) {
  const { file, pages, pageCount } = await ensureStudyFilePageIndex(input.fileId);
  if (input.pageEnd > pageCount) throw new Error(`الكتاب فيه ${pageCount} صفحة فقط.`);
  return { file, contentSnapshot: selectPdfPageRange(pages, input.pageStart, input.pageEnd), pageCount };
}

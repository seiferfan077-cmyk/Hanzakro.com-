import { desc, eq } from "drizzle-orm";
import { privateMessages } from "../drizzle/schema";
import { getDb } from "./db";
import { uploadChatMedia } from "./privateMedia";
import type { MemberSlot } from "./workspaceAccess";

async function database() {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  return db;
}

export async function listPrivateMessages() {
  const db = await database();
  return db.select().from(privateMessages).orderBy(desc(privateMessages.createdAt)).limit(100);
}

export async function deletePrivateMessage(id: number) {
  const db = await database();
  await db.delete(privateMessages).where(eq(privateMessages.id, id));
}

export async function createPrivateMessage(content: string, memberSlot: MemberSlot, attachment?: { originalName: string; mimeType: "image/jpeg" | "image/png" | "image/webp"; sizeBytes: number; bytes: Buffer }) {
  const cleaned = content.trim();
  if (!cleaned) throw new Error("اكتب الرسالة الأول.");
  if (cleaned.length > 1_500_000) throw new Error("الرسالة كبيرة جداً للعرض الآمن. قسّمها إلى رسالتين طويلتين.");
  const uploaded = attachment ? await uploadChatMedia("image", attachment, memberSlot) : null;
  const db = await database();
  const inserted = await db.insert(privateMessages).values({ content: cleaned, createdBy: memberSlot, attachmentKey: uploaded?.storageKey, attachmentUrl: uploaded?.url, attachmentName: uploaded?.originalName, attachmentMime: uploaded?.mimeType, attachmentSize: uploaded?.sizeBytes });
  return { id: Number(inserted[0].insertId), attachmentUrl: uploaded?.url ?? null };
}

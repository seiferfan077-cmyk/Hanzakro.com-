import { and, desc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { loayExamAttempts } from "../drizzle/schema";
import { getDb } from "./db";
import type { LoayExamQuestion } from "./loayExam";

export type LoayMemberSlot = "saif" | "haneen";
export type LoayAttemptStatus = "active" | "paused" | "graded" | "dismissed";
export type LoayExamResult = { evaluations: Array<{ id: string; score: number; feedback: string }>; score: number; total: number; percentage: number };
export type LoayExamAttemptPayload = {
  id: string;
  memberSlot: LoayMemberSlot;
  title: string;
  questions: LoayExamQuestion[];
  answers: Record<string, string>;
  activeIndex: number;
  status: LoayAttemptStatus;
  result?: LoayExamResult;
  updatedAt: Date;
};

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function toPayload(row: typeof loayExamAttempts.$inferSelect): LoayExamAttemptPayload | null {
  const questions = parseJson<LoayExamQuestion[]>(row.questionsJson, []);
  const answers = parseJson<Record<string, string>>(row.answersJson, {});
  const result = parseJson<LoayExamResult | undefined>(row.resultJson, undefined);
  if (!questions.length) return null;
  return { id: row.id, memberSlot: row.memberSlot, title: row.title, questions, answers, activeIndex: Math.max(0, Math.min(row.activeIndex, questions.length - 1)), status: row.status, ...(result ? { result } : {}), updatedAt: row.updatedAt };
}

export async function saveLoayExamAttempt(input: Omit<LoayExamAttemptPayload, "id" | "updatedAt" | "result"> & { id?: string }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة بيانات الامتحان مش متاحة دلوقتي.");
  const id = input.id || `loay-${nanoid(18)}`;
  const payload = {
    title: input.title,
    questionsJson: JSON.stringify(input.questions),
    answersJson: JSON.stringify(input.answers),
    activeIndex: input.activeIndex,
    status: input.status,
  };
  const existing = await db.select({ id: loayExamAttempts.id }).from(loayExamAttempts).where(and(eq(loayExamAttempts.id, id), eq(loayExamAttempts.memberSlot, input.memberSlot))).limit(1);
  if (existing[0]) {
    await db.update(loayExamAttempts).set(payload).where(and(eq(loayExamAttempts.id, id), eq(loayExamAttempts.memberSlot, input.memberSlot)));
  } else {
    await db.insert(loayExamAttempts).values({ id, memberSlot: input.memberSlot, ...payload });
  }
  return { id } as const;
}

export async function getLatestResumableLoayExamAttempt(memberSlot: LoayMemberSlot) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(loayExamAttempts).where(and(eq(loayExamAttempts.memberSlot, memberSlot), inArray(loayExamAttempts.status, ["active", "paused"]))).orderBy(desc(loayExamAttempts.updatedAt)).limit(1);
  return rows[0] ? toPayload(rows[0]) : null;
}

export async function completeLoayExamAttempt(input: { id: string; memberSlot: LoayMemberSlot; result: LoayExamResult }) {
  const db = await getDb();
  if (!db) return;
  await db.update(loayExamAttempts).set({ status: "graded", resultJson: JSON.stringify(input.result) }).where(and(eq(loayExamAttempts.id, input.id), eq(loayExamAttempts.memberSlot, input.memberSlot)));
}

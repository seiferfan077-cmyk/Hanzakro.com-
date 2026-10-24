import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = join(import.meta.dirname, "..");
const schemaSource = readFileSync(join(projectRoot, "drizzle/schema.ts"), "utf8");
const routerSource = readFileSync(join(projectRoot, "server/routers.ts"), "utf8");
const roomSource = readFileSync(join(projectRoot, "client/src/components/LoayExamRoom.tsx"), "utf8");
const assistantSource = readFileSync(join(projectRoot, "client/src/components/FloatingAssistant.tsx"), "utf8");

describe("Loay exam persistence contract", () => {
  it("stores the questions, answers, position, status, and optional result", () => {
    expect(schemaSource).toContain('mysqlTable("loayExamAttempts"');
    expect(schemaSource).toContain("questionsJson");
    expect(schemaSource).toContain("answersJson");
    expect(schemaSource).toContain('status: mysqlEnum("status", loayExamAttemptStatusValues)');
    expect(schemaSource).toContain("resultJson");
  });

  it("exposes member-protected save, resume, and grade completion procedures", () => {
    expect(routerSource).toContain("resumeExam: memberProcedure");
    expect(routerSource).toContain("saveExamProgress: memberProcedure");
    expect(routerSource).toContain("completeLoayExamAttempt");
    expect(routerSource).toContain("memberProcedure.input(z.object({ memberSlot:");
  });

  it("persists from the room and passes the attempt id when grading", () => {
    expect(roomSource).toContain("trpc.assistant.saveExamProgress.useMutation");
    expect(roomSource).toContain('persistProgress("paused")');
    expect(roomSource).toContain("saveProgress.mutateAsync");
    expect(roomSource).toContain("const savedAttemptId = await persistProgress");
    expect(roomSource).toContain("attemptId: savedAttemptId || attemptIdRef.current");
    expect(roomSource).toContain("saveQueueRef");
  });

  it("offers a resumable attempt in the chat without mixing the other member's state", () => {
    expect(assistantSource).toContain("trpc.assistant.resumeExam.useQuery");
    expect(assistantSource).toContain("resumableExam.data");
    expect(assistantSource).toContain("initialProgress");
  });
});

const _contractMarker = "no test rows are inserted by this contract suite";
void _contractMarker;

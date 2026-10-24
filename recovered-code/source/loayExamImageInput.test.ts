import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ inspectLoayExamSources: vi.fn(), prepareLoayExam: vi.fn() }));

vi.mock("./loayExam", async importOriginal => {
  const actual = await importOriginal<typeof import("./loayExam")>();
  return { ...actual, inspectLoayExamSources: mocks.inspectLoayExamSources, prepareLoayExam: mocks.prepareLoayExam };
});

import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

function context(): TrpcContext {
  return { user: null, gateAuthorized: true, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("صور مصدر امتحان لؤي", () => {
  it("يرفض مفتاح تخزين خارجي قبل استدعاء تحليل المصدر", async () => {
    const caller = appRouter.createCaller(context());
    await expect(caller.assistant.inspectExamSources({ memberSlot: "saif", topic: "المفعول به", images: [{ storageKey: "https://outside.example/lesson.png", originalName: "lesson.png" }] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.inspectLoayExamSources).not.toHaveBeenCalled();
  });

  it("يمرر صورة مرفوعة من المسار الخاص إلى تحليل مصدر الامتحان", async () => {
    mocks.inspectLoayExamSources.mockResolvedValue({ imageSummary: "ملخص الصفحة", didResearch: true, webSources: [] });
    const caller = appRouter.createCaller(context());
    await expect(caller.assistant.inspectExamSources({ memberSlot: "haneen", topic: "المفعول به", images: [{ storageKey: "private-chat-media/haneen/lesson.png", originalName: "lesson.png" }] })).resolves.toMatchObject({ imageSummary: "ملخص الصفحة" });
    expect(mocks.inspectLoayExamSources).toHaveBeenCalledWith(expect.objectContaining({ images: [{ storageKey: "private-chat-media/haneen/lesson.png", originalName: "lesson.png" }] }));
  });
});

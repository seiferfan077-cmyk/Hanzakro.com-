import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("ترجمة قارئ الكتب", () => {
  it("تترجم النص المحدد فقط بحد آمن ومن دون حفظه في ذاكرة المساعد", async () => {
    const source = await readFile("server/routers.ts", "utf8");
    const start = source.indexOf("translateReaderSelection:");
    const end = source.indexOf("baleh:", start);
    const procedure = source.slice(start, end);

    expect(procedure).toContain("memberProcedure");
    expect(procedure).toContain("max(1800)");
    expect(procedure).toContain('model: "gpt-5-mini"');
    expect(procedure).toContain("Return the Arabic translation only");
    expect(procedure).not.toContain("saveAssistantExchange");
    expect(procedure).not.toContain("getAssistantMemory");
  });
});

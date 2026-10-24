import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./FloatingAssistant.tsx", import.meta.url), "utf8");

describe("FloatingAssistant exam flow", () => {
  it("keeps the generated exam connected to the start dialog and room", () => {
    expect(source).toContain("onClick={() => setExamPreview(message.exam || null)}");
    expect(source).toContain("<Dialog open={Boolean(examPreview)}");
    expect(source).toContain("setActiveExam(examPreview)");
    expect(source).toContain("<LoayExamRoom");
  });

  it("passes thinking intent through source review and bank preparation", () => {
    expect(source).toContain("forceThinking: useThinking || /(فكر|تفكير|حلل)/i.test(content)");
    expect(source).toContain("forceThinking: Boolean(examSetup.forceThinking || useThinking)");
    expect(source).toContain("التفكير {useThinking ? \"25 ثانية\" : \"متوقف\"}");
  });
});

import { describe, expect, it, vi } from "vitest";
import { clampFloatingWindowPosition } from "./useFloatingWindow";

describe("clampFloatingWindowPosition", () => {
  it("يبقي النافذة داخل شاشة هاتف حتى لو حاول المستخدم سحبها خارج الحواف", () => {
    vi.stubGlobal("window", { innerWidth: 390, innerHeight: 844 });
    expect(clampFloatingWindowPosition({ x: -80, y: 990 }, { width: 366, height: 600 })).toEqual({ x: 12, y: 232 });
    vi.unstubAllGlobals();
  });

  it("يتعامل مع نافذة أعرض من المساحة المتاحة من دون إحداث قيم سالبة", () => {
    vi.stubGlobal("window", { innerWidth: 320, innerHeight: 640 });
    expect(clampFloatingWindowPosition({ x: 88, y: -1 }, { width: 400, height: 700 })).toEqual({ x: 12, y: 12 });
    vi.unstubAllGlobals();
  });
});

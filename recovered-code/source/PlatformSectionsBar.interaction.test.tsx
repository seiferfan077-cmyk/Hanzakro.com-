// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ setLocation: vi.fn() }));
vi.mock("wouter", () => ({ useLocation: () => ["/", mocks.setLocation] }));

import PlatformSectionsBar from "./PlatformSectionsBar";

describe("شريط أقسام المنصة المختصر", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); window.localStorage.clear(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

  it("يبقى أيقونات فقط في الوضع العادي ولا يفتح التحرير بنقرة عادية", () => {
    render(<PlatformSectionsBar />);
    const trigger = screen.getByRole("button", { name: "مقبض تعديل الشريط" });
    fireEvent.click(trigger);
    expect(screen.queryByRole("dialog", { name: "تعديل ترتيب أقسام المنصة" })).toBeNull();
    expect(screen.queryByText("مكان الشريط")).toBeNull();
  });

  it("يفتح التحرير بعد 380ms ويتيح نقل الشريط وحفظه", () => {
    render(<PlatformSectionsBar />);
    const trigger = screen.getByRole("button", { name: "مقبض تعديل الشريط" });
    fireEvent.pointerDown(trigger, { pointerId: 1 });
    act(() => { vi.advanceTimersByTime(380); });

    expect(screen.getByRole("dialog", { name: "تعديل ترتيب أقسام المنصة" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "يسار" }));
    expect(screen.getByRole("navigation", { name: "شريط أقسام المنصة" }).className).toContain("is-side");
    fireEvent.click(screen.getAllByRole("button", { name: "حفظ الترتيب" })[0]);
    expect(screen.queryByRole("dialog", { name: "تعديل ترتيب أقسام المنصة" })).toBeNull();
    expect(window.localStorage.getItem("haneenstudy-platform-sections-placement-v1")).toBe("left");
  });
});


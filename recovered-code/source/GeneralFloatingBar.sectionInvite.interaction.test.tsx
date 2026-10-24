// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ consumeSectionInviteNow: vi.fn(), incomingInvite: null as Record<string, unknown> | null, memberSlot: "saif", sendSectionInviteNow: vi.fn(), setLocation: vi.fn() }));

vi.mock("@/components/MiniLocationMap", () => ({ default: () => null }));
vi.mock("@/components/Map", () => ({ reverseGeocodeLocation: vi.fn() }));
vi.mock("@/lib/locationShare", () => ({ createLocationShare: vi.fn(), formatLocationShareRemaining: vi.fn(), getLocationShareForMember: vi.fn(), isLocationShareActive: vi.fn(), requestBrowserLocation: vi.fn() }));
vi.mock("@/lib/presence", () => ({ consumeSectionInviteNow: mocks.consumeSectionInviteNow, markPresenceTyping: vi.fn(), sendSectionInviteNow: mocks.sendSectionInviteNow, updateLocalPresence: vi.fn() }));
vi.mock("@/lib/workspaceIdentity", () => ({ memberDisplayName: (slot: string) => slot === "saif" ? "سيف" : "حنين", useWorkspaceMember: () => mocks.memberSlot }));
vi.mock("@/lib/partnerActivity", () => ({ partnerActivitySummary: (slot: string) => ({ slot, online: true, label: "في المنصة", detail: "الأهداف" }) }));
vi.mock("@/lib/sectionInvite", () => ({ createSectionInvite: (sender: string, path: string) => path === "/goals" ? { id: "invite-goals", sender, recipient: "haneen", sectionPath: path, sectionLabel: "الأهداف", createdAtMs: Date.now(), expiresAtMs: Date.now() + 90_000 } : null, getSectionDestination: (path: string) => path === "/goals" ? { path, label: "الأهداف" } : null, getSectionInviteForMember: () => mocks.incomingInvite }));
vi.mock("wouter", () => ({ useLocation: () => ["/competition", mocks.setLocation] }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() } }));

import GeneralFloatingBar from "./GeneralFloatingBar";

describe("دعوة القسم من الشريط العام", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.memberSlot = "saif";
    mocks.incomingInvite = null;
    mocks.sendSectionInviteNow.mockResolvedValue(undefined);
    mocks.consumeSectionInviteNow.mockResolvedValue(undefined);
    window.localStorage.clear();
    window.history.replaceState({}, "", "/goals");
  });
  afterEach(() => vi.restoreAllMocks());

  it("يلتقط /goals من العنوان لحظة الضغط رغم أن حالة التوجيه السابقة تقول /competition", async () => {
    render(<GeneralFloatingBar onSignOut={vi.fn()} presence={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "اسحب خط الأدوات يمين أو شمال لفتح الأدوات" }));
    fireEvent.click(screen.getByRole("button", { name: "فتح إحنا فين" }));
    fireEvent.click(screen.getByRole("button", { name: "تعالى عندي" }));

    await vi.waitFor(() => expect(mocks.sendSectionInviteNow).toHaveBeenCalledWith(expect.objectContaining({ sectionPath: "/goals", sectionLabel: "الأهداف", recipient: "haneen" })));
    window.history.replaceState({}, "", "/competition");
    expect(mocks.sendSectionInviteNow.mock.calls[0][0]).toMatchObject({ sectionPath: "/goals", sectionLabel: "الأهداف" });
  });

  it("يُظهر لحنين الدعوة نفسها وينتقل إلى /goals فقط بعد استهلاكها", async () => {
    mocks.memberSlot = "haneen";
    mocks.incomingInvite = { id: "invite-goals", sender: "saif", recipient: "haneen", sectionPath: "/goals", sectionLabel: "الأهداف", createdAtMs: Date.now(), expiresAtMs: Date.now() + 90_000 };
    render(<GeneralFloatingBar onSignOut={vi.fn()} presence={[{ slot: "saif", online: true, sectionInvite: mocks.incomingInvite } as never]} />);

    fireEvent.click(screen.getByRole("button", { name: "روحي عند سيف — الأهداف" }));
    await vi.waitFor(() => expect(mocks.consumeSectionInviteNow).toHaveBeenCalledWith("haneen", "invite-goals"));
    expect(mocks.setLocation).toHaveBeenCalledWith("/goals");
  });
});

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/PlatformVideoBoardFloating", () => ({ openPlatformVideoOverBoard: vi.fn() }));
vi.mock("@/lib/workspaceIdentity", () => ({ useWorkspaceMember: () => "saif" }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    platforms: {
      hub: { useQuery: () => ({ data: { links: [], videos: [], notes: [] }, isLoading: false }) },
      create: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      update: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      remove: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      videos: {
        create: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        remove: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        notes: { create: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, remove: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } },
      },
    },
    useUtils: () => ({ platforms: { hub: { invalidate: vi.fn() } } }),
  },
}));

import PlatformsPage, { isYouTubeHost } from "./PlatformsPage";

describe("PlatformsPage", () => {
  it("renders the empty hub and clear next actions without fabricated platforms", () => {
    const markup = renderToStaticMarkup(<PlatformsPage />);
    expect(markup).toContain("منصاتنا التعليمية");
    expect(markup).toContain("روابط المدرسة في مكان واحد");
    expect(markup).toContain("إضافة منصة");
    expect(markup).toContain("لسه مفيش منصات محفوظة");
    expect(markup).toContain("ابدأوا برابط المنصة");
    expect(markup).not.toContain("فيديو وهمي");
  });

  it("classifies YouTube page links for the safe external-open path", () => {
    expect(isYouTubeHost("https://www.youtube.com/" )).toBe(true);
    expect(isYouTubeHost("https://m.youtube.com/" )).toBe(true);
    expect(isYouTubeHost("https://example.com/lesson" )).toBe(false);
    expect(isYouTubeHost("not-a-url" )).toBe(false);
  });
});

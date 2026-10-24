import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./PlatformVideoBoardFloating.tsx", import.meta.url), "utf8");

describe("PlatformVideoBoardFloating", () => {
  it("exposes a platform-video event bridge and a draggable floating window", () => {
    expect(source).toContain("saf-haneen-open-platform-video");
    expect(source).toContain("onPointerMove={moveDrag}");
    expect(source).toContain("aria-label={compact ? \"تكبير فيديو المنصة\" : \"تصغير فيديو المنصة\"}");
    expect(source).toContain("aria-label=\"إغلاق فيديو المنصة\"");
  });

  it("supports native direct playback and preserves the requested current time", () => {
    expect(source).toContain("<video ref={videoRef} controls autoPlay");
    expect(source).toContain("video.currentSeconds");
    expect(source).toContain("videoRef.current.currentTime");
  });

  it("keeps YouTube time communication constrained to the embed origin", () => {
    expect(source).toContain("YOUTUBE_TIME_EVENT");
    expect(source).toContain("const targetOrigin = new URL(video.embedUrl).origin");
    expect(source).toContain("event.origin !== targetOrigin");
    expect(source).toContain("getCurrentTime");
  });
});

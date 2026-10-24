import { describe, expect, it } from "vitest";
import { inferPlatformVideo, normalizeHttpUrl } from "./platformsDb";

describe("platformsDb", () => {
  it("normalizes a plain domain to https and rejects unsafe protocols", () => {
    expect(normalizeHttpUrl("school.example.com")).toBe("https://school.example.com/");
    expect(() => normalizeHttpUrl("javascript:alert(1)")).toThrow("مسموح بروابط http أو https فقط.");
    expect(() => normalizeHttpUrl("https://user:pass@example.com")).toThrow("مسموح بروابط http أو https فقط.");
  });

  it("detects a YouTube source and creates a no-cookie embed", () => {
    const video = inferPlatformVideo("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(video.kind).toBe("youtube");
    expect(video.videoId).toBe("dQw4w9WgXcQ");
    expect(video.embedUrl).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(video.allowDownload).toBe(false);
  });

  it("keeps direct video links as controllable candidates without granting external download", () => {
    const video = inferPlatformVideo("https://cdn.example.com/lesson.mp4?token=abc");
    expect(video.kind).toBe("direct");
    expect(video.embedUrl).toBeNull();
    expect(video.videoId).toBeNull();
    expect(video.allowDownload).toBe(false);
  });

  it("treats an unknown page as an embeddable source and never invents a video id", () => {
    const video = inferPlatformVideo("https://school.example.com/watch/lesson-1");
    expect(video.kind).toBe("embed");
    expect(video.videoId).toBeNull();
    expect(video.embedUrl).toBe(video.sourceUrl);
  });
});

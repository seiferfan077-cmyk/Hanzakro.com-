import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const chatPage = readFileSync(new URL("./ChatPage.tsx", import.meta.url), "utf8");
const floatingChat = readFileSync(new URL("../components/FloatingChat.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
const home = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

describe("امتداد صفحة الدردشة", () => {
  it("يثبت سطح الدردشة كشاشة مستقلة حتى أسفل الجهاز بلا شريط المنصة", () => {
    expect(chatPage).toContain("chat-page-root");
    expect(floatingChat).toContain("chat-page-surface");
    expect(css).toContain(".chat-page-root");
    expect(css).toContain(".chat-page-surface");
    expect(css).toContain(".chat-page-surface { bottom: 0");
    expect(css).toContain("position: fixed");
    expect(home).toContain('if (location === "/chat")');
    expect(home).toContain("<ChatPage />");
    expect(home).not.toContain('<Route path="/chat" component={ChatPage} />');
    expect(chatPage).toContain("chat-platform-back");
    expect(chatPage).toContain('setLocation("/")');
    expect(chatPage).toContain("الرجوع إلى المنصة");
  });
});

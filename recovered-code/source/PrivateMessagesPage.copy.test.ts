import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./PrivateMessagesPage.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");

describe("رسائلنا الخاصة", () => {
  it("تدعم رسائل طويلة ومعاينة مختصرة وقراءة كاملة مقسمة", () => {
    expect(page).toContain("privateMessages.create");
    expect(page).toContain("PAGE_SIZE = 180");
    expect(page).toContain("message.content.slice(0, 240)");
    expect(page).not.toContain("maxLength");
    expect(page).toContain("تابع القراءة");
  });
  it("يعرض خطاً جميلاً قابلاً للتبديل واحتفال دخول يحترم الحركة", () => {
    expect(page).toContain("الخط العادي");
    expect(page).toContain("private-message-romance-celebration");
    expect(css).toContain("private-message-reader.is-pretty");
    expect(css).toContain("prefers-reduced-motion: no-preference");
  });
});

it("يسجّل مسار رسائلنا الخاصة قبل المسار الاحتياطي", () => {
  const routes = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");
  expect(routes).toContain('<Route path="/private-messages" component={PrivateMessagesPage} />');
});

it("يشغّل الكتابة لكل رسالة ويدعم السحب بين أجزائها مع بدائل الوصول", () => {
  expect(page).toContain("typedText");
  expect(page).toContain("setInterval");
  expect(page).toContain("justSentContent");
  expect(page).toContain("onPointerDown");
  expect(page).toContain("SWIPE_THRESHOLD");
  expect(page).toContain("ArrowLeft");
  expect(page).toContain("اكتبناها بالخط الأحمر المائل");
  expect(css).toContain("private-message-reader.is-pretty .private-message-typewriter");
  expect(css).toContain("private-message-preview-typewriter");
});

it("يعرض جزء الرسالة من دون تمرير سفلي غير ضروري وبمدخل قارئ صاعد", () => {
  expect(css).toContain("align-items: flex-end");
  expect(css).toContain("max-height: calc(100dvh - 1rem)");
  expect(css).toContain("privateMessageReaderLift");
  expect(css).toContain("overflow: hidden");
});

it("يوحّد النص الأحمر المائل ويبطئ الكتابة ويحتفل عند فتح القارئ", () => {
  expect(page).toContain("readerCelebration");
  expect(page).toContain("private-message-romance-celebration");
  expect(page).toContain("Math.ceil(current.length / 360)");
  expect(page).toContain("}, typingIntervalMs)");
  expect(page).toContain("romantic-script-text");
  expect(css).toContain("font-style: italic");
  expect(css).toContain("privateMessageHeartRise");
});

it("يعيد تشغيل النص والقلوب ويقدّم نغمات خفيفة للكتابة والاحتفال", () => {
  expect(page).toContain("replayReader");
  expect(page).toContain("إعادة تشغيل");
  expect(page).toContain("playTypingTone");
  expect(page).toContain("playHeartsTone");
});

it("يقسم الرسالة إلى ستة أجزاء كحد أقصى ويتابع القراءة تلقائياً", () => {
  expect(page).toContain("MAX_MESSAGE_PARTS = 6");
  expect(page).toContain("Math.ceil(active.content.length / MAX_MESSAGE_PARTS)");
  expect(page).toContain("scrollTo({ top: reader.scrollHeight, behavior: \"smooth\" })");
  expect(page).toContain("setTimeout(() => setPage");
  expect(page).toContain("autoAdvanceSeconds * 1000");
});

it("يمنح القارئ تحكماً في السرعة والانتظار والتقدم والإيقاف المؤقت", () => {
  expect(page).toContain("typingIntervalMs");
  expect(page).toContain("autoAdvanceSeconds");
  expect(page).toContain("autoAdvancePaused");
  expect(page).toContain("countdownSeconds");
  expect(page).toContain("إيقاف التلقائي");
  expect(page).toContain("الجزء التالي بعد");
  expect(css).toContain("private-message-auto-progress");
});

it("يحفظ التفضيلات ويتيح تخطي الكتابة وشريط تقدم متدرج وخط المنصة العادي", () => {
  expect(page).toContain("haneenstudy-private-reader-preferences-v1");
  expect(page).toContain("readReaderPreferences");
  expect(page).toContain("skipTyping");
  expect(page).toContain("تخطي الكتابة");
  expect(page).toContain("countdownRemainingMs");
  expect(page).toContain("window.setInterval(updateCountdown, 80)");
  expect(css).toContain("private-message-reader.is-plain .private-message-reading-copy .private-message-typewriter");
  expect(css).toContain("color: #315f4d");
});

it("يشغّل ملف الصوت المرفق تلقائياً عند فتح الرسالة ويتلاشى عند الإغلاق", () => {
  expect(page).toContain("private-message-opening-song_2db2ad84.mp3");
  expect(page).toContain("openingTrackRef");
  expect(page).toContain("playOpeningTrack");
  expect(page).toContain("fadeOutTracks");
  expect(page).toContain("const duration = 420");
  expect(page).toContain("onEnded={playFollowupTrack}");
});

it("يشغّل المقاطع الأربعة بترتيبها ويمنح القارئ نبضاً وتحكماً مباشراً في الصوت", () => {
  expect(page).toContain("private-message-intro-song_ec523dae.mp3");
  expect(page).toContain("private-message-followup-song_ef8870d6.mp3");
  expect(page).toContain("private-message-final-song_ae5f9339.mp3");
  expect(page).toContain("onEnded={playIntroTrack}");
  expect(page).toContain("onEnded={playFollowupTrack}");
  expect(page).toContain("onEnded={playFinalTrack}");
  expect(page).toContain("followupTrackRef");
  expect(page).toContain("trackVolume");
  expect(page).toContain("tracksMuted");
  expect(page).toContain("كتم الأغاني");
  expect(page).toContain("مستوى صوت أغاني الرسالة");
  expect(css).toContain("private-message-reader.is-music-playing");
  expect(css).toContain("privateMessageMusicPulse");
});

it("يعرض نوتات موسيقية متحركة وقفل موسيقى مستقلاً عن صوت الكتابة", () => {
  expect(page).toContain("private-message-music-notes");
  expect(page).toContain("musicLocked");
  expect(page).toContain("قفل الموسيقى");
  expect(page).toContain("if (!track || (musicLocked && !preview)) return");
  expect(page).toContain("playTypingTone");
  expect(css).toContain("privateMessageNoteFloat");
});

it("يقدّم افتتاحية رسائلنا لعبارة فكرة حنون ومعاينة كاملة للتسلسل", () => {
  expect(page).toContain("showPageIntro");
  expect(page).toContain("فكرة حنون");
  expect(page).toContain("introText");
  expect(page).toContain("private-messages-page-intro");
  expect(page).toContain("previewFullSequence");
  expect(page).toContain("معاينة التسلسل");
  expect(page).toContain("يعمل الآن:");
  expect(page).toContain("التالي:");
  expect(page).toContain("music-theme-${currentTrack.theme}");
  expect(css).toContain("privateMessageIntroReveal");
  expect(css).toContain("music-theme-violet");
});

it("يبدّل خلفية الافتتاحية ويضيء Good Trip, Hanoun ويمنحها تخطياً وبطاقات أعمق", () => {
  expect(page).toContain("introThemeIndex");
  expect(page).toContain("Good Trip, Hanoun");
  expect(page).toContain("introComplete");
  expect(page).toContain("تخطي الافتتاحية");
  expect(css).toContain("intro-theme-rose");
  expect(css).toContain("intro-theme-violet");
  expect(css).toContain("intro-theme-amber");
  expect(css).toContain("private-message-preview::before");
  expect(css).toContain("0 23px 40px");
});

it("يحوّل معاينة الرسالة إلى هدية عمودية ثلاثية الأبعاد تنقلب قبل فتح القارئ", () => {
  expect(page).toContain("Gift");
  expect(page).toContain("revealedMessageId");
  expect(page).toContain("revealOrOpenMessage");
  expect(page).toContain("رسالة هدية");
  expect(page).toContain("افتحي ي روحقلبي");
  expect(page).toContain("اضغط مرة تانية للرسالة كاملة");
  expect(css).toContain("private-message-gift-card");
  expect(css).toContain("rotateY(180deg)");
  expect(css).toContain("backface-visibility: hidden");
});

it("يشغّل صوت فتح البطاقة ونوتاتها ويعيدها لوجه الهدية عند الإغلاق", () => {
  expect(page).toContain("playCardFlipTone");
  expect(page).toContain("launchingMessageId");
  expect(page).toContain("private-message-gift-launch-notes");
  expect(page).toContain("setRevealedMessageId(null)");
  expect(page).toContain("private-message-reader-close");
  expect(css).toContain("privateMessageGiftNotes");
  expect(css).toContain("private-message-reader-close");
});

it("يوجه نص هدية الرسالة تلقائياً للمستلم بحسب هوية الكاتب", () => {
  expect(page).toContain('message.createdBy === "saif"');
  expect(page).toContain("افتحي ي روحقلبي");
  expect(page).toContain("شوف حنين كتبتلك اي 🫣");
  expect(page).toContain("giftRecipient");
});

it("يدعم صورة صغيرة مع الرسالة ويعرضها عند قلب البطاقة بلمعة", () => {
  expect(page).toContain("sender-${message.createdBy}");
  expect(page).toContain("private-message-saif-hearts");
  expect(page).toContain("private-message-reader-attachment");
  expect(page).toContain("إرفاق صورة صغيرة");
  expect(page).toContain("dataBase64");
  expect(page).toContain("MAX_MESSAGE_IMAGE_BYTES = 500 * 1024 * 1024");
  expect(css).toContain("private-message-card-attachment");
  expect(css).toContain("privateMessageAttachmentShimmer");
  expect(css).toContain("sender-saif");
  expect(css).toContain("sender-haneen");
});

it("يدعم الصور الكبيرة والتنزيل والحذف والتاريخ ونغمة النبض", () => {
  expect(page).toContain("MAX_MESSAGE_IMAGE_BYTES = 500 * 1024 * 1024");
  expect(page).toContain("privateMessages.remove");
  expect(page).toContain("startCardLongPress");
  expect(page).toContain("window.confirm");
  expect(page).toContain("downloadCardImage");
  expect(page).toContain("html2canvas");
  expect(page).toContain("playHeartbeatTone");
  expect(page).toContain("private-message-card-front-time");
  expect(css).toContain("privateMessageAttachmentShimmer");
});

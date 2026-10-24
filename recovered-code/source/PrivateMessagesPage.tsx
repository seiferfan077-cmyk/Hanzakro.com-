import html2canvas from "html2canvas";
import { Gift, Heart, ImagePlus, MessageCircleHeart, Send, Download, Type, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { memberDisplayName, useWorkspaceMember } from "@/lib/workspaceIdentity";
import { toast } from "sonner";

type PrivateMessage = { id: number; content: string; createdBy: "saif" | "haneen"; createdAt: string | Date; attachmentUrl?: string | null; attachmentName?: string | null; attachmentMime?: string | null; attachmentSize?: number | null };
type DraftAttachment = { originalName: string; mimeType: "image/jpeg" | "image/png" | "image/webp"; sizeBytes: number; dataBase64: string; previewUrl: string };
const PAGE_SIZE = 180;
const MAX_MESSAGE_PARTS = 6;
const SWIPE_THRESHOLD = 48;
const MAX_MESSAGE_IMAGE_BYTES = 500 * 1024 * 1024;
const MESSAGE_OPENING_TRACK_URL = "/manus-storage/private-message-opening-song_2db2ad84.mp3";
const MESSAGE_INTRO_TRACK_URL = "/manus-storage/private-message-intro-song_ec523dae.mp3";
const MESSAGE_FOLLOWUP_TRACK_URL = "/manus-storage/private-message-followup-song_ef8870d6.mp3";
const MESSAGE_FINAL_TRACK_URL = "/manus-storage/private-message-final-song_ae5f9339.mp3";
const MUSIC_TRACKS = [
  { label: "المقطع الأول", theme: "rose" },
  { label: "مقدمة الرسالة", theme: "violet" },
  { label: "المقطع الثاني", theme: "amber" },
  { label: "الخاتمة", theme: "ocean" },
] as const;
const READER_PREFERENCES_STORAGE_KEY = "haneenstudy-private-reader-preferences-v1";
const readReaderPreferences = () => {
  if (typeof window === "undefined") return { typingIntervalMs: 42, autoAdvanceSeconds: 3, autoAdvancePaused: false };
  try {
    const saved = JSON.parse(window.localStorage.getItem(READER_PREFERENCES_STORAGE_KEY) || "{}");
    return { typingIntervalMs: [26, 42, 64].includes(saved.typingIntervalMs) ? saved.typingIntervalMs : 42, autoAdvanceSeconds: [3, 5, 8].includes(saved.autoAdvanceSeconds) ? saved.autoAdvanceSeconds : 3, autoAdvancePaused: Boolean(saved.autoAdvancePaused) };
  } catch { return { typingIntervalMs: 42, autoAdvanceSeconds: 3, autoAdvancePaused: false }; }
};

export default function PrivateMessagesPage() {
  const member = useWorkspaceMember();
  const messages = trpc.privateMessages.list.useQuery(undefined, { enabled: Boolean(member) });
  const [draft, setDraft] = useState("");
  const [draftAttachment, setDraftAttachment] = useState<DraftAttachment | null>(null);
  const [active, setActive] = useState<PrivateMessage | null>(null);
  const [page, setPage] = useState(0);
  const [prettyFont, setPrettyFont] = useState(true);
  const [readerCelebration, setReaderCelebration] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [readerPreferences] = useState(readReaderPreferences);
  const [replayNonce, setReplayNonce] = useState(0);
  const [typingIntervalMs, setTypingIntervalMs] = useState(readerPreferences.typingIntervalMs);
  const [autoAdvanceSeconds, setAutoAdvanceSeconds] = useState(readerPreferences.autoAdvanceSeconds);
  const [autoAdvancePaused, setAutoAdvancePaused] = useState(readerPreferences.autoAdvancePaused);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [countdownRemainingMs, setCountdownRemainingMs] = useState(0);
  const [trackVolume, setTrackVolume] = useState(.72);
  const [tracksMuted, setTracksMuted] = useState(false);
  const [musicLocked, setMusicLocked] = useState(false);
  const [isTrackPlaying, setIsTrackPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [showPageIntro, setShowPageIntro] = useState(true);
  const [introText, setIntroText] = useState("");
  const [introThemeIndex, setIntroThemeIndex] = useState(0);
  const [introComplete, setIntroComplete] = useState(false);
  const [revealedMessageId, setRevealedMessageId] = useState<number | null>(null);
  const [launchingMessageId, setLaunchingMessageId] = useState<number | null>(null);
  const [justSentContent, setJustSentContent] = useState<string | null>(null);
  const [pointerStartX, setPointerStartX] = useState<number | null>(null);
  const giftCardRef = useRef<HTMLSpanElement | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const suppressNextCardClickRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const openingTrackRef = useRef<HTMLAudioElement | null>(null);
  const introTrackRef = useRef<HTMLAudioElement | null>(null);
  const followupTrackRef = useRef<HTMLAudioElement | null>(null);
  const finalTrackRef = useRef<HTMLAudioElement | null>(null);
  const fadeFrameRef = useRef<number | null>(null);
  const cardLaunchTimerRef = useRef<number | null>(null);
  const skipTypewriterRef = useRef(false);
  const getAudioContext = () => {
    if (typeof window === "undefined") return null;
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContextRef.current ??= new AudioContextClass();
    if (audioContextRef.current.state === "suspended") void audioContextRef.current.resume();
    return audioContextRef.current;
  };
  const playNote = (frequency: number, duration: number, volume: number) => {
    const context = getAudioContext(); if (!context) return;
    const oscillator = context.createOscillator(); const gain = context.createGain(); const now = context.currentTime;
    oscillator.type = "sine"; oscillator.frequency.value = frequency; gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(volume, now + .012); gain.gain.exponentialRampToValueAtTime(.0001, now + duration); oscillator.connect(gain).connect(context.destination); oscillator.start(now); oscillator.stop(now + duration + .015);
  };
  const playTypingTone = () => playNote(570, .045, .018);
  const playHeartsTone = () => [523.25, 659.25, 783.99].forEach((frequency, index) => window.setTimeout(() => playNote(frequency, .28, .035), index * 75));
  const playCardFlipTone = () => [392, 587.33].forEach((frequency, index) => window.setTimeout(() => playNote(frequency, .16, .032), index * 92));
  const playHeartbeatTone = () => [82.41, 73.42].forEach((frequency, index) => window.setTimeout(() => playNote(frequency, .16, .028), index * 150));
  const activeTracks = () => [openingTrackRef.current, introTrackRef.current, followupTrackRef.current, finalTrackRef.current].filter(Boolean) as HTMLAudioElement[];
  const stopTracksImmediately = () => { if (fadeFrameRef.current) window.cancelAnimationFrame(fadeFrameRef.current); activeTracks().forEach(track => { track.pause(); track.currentTime = 0; track.volume = tracksMuted ? 0 : trackVolume; }); setIsTrackPlaying(false); };
  const fadeOutTracks = (onFinished?: () => void) => {
    if (fadeFrameRef.current) window.cancelAnimationFrame(fadeFrameRef.current);
    const tracks = activeTracks().filter(track => !track.paused); if (!tracks.length) { onFinished?.(); return; }
    const initialVolumes = tracks.map(track => track.volume); const startedAt = performance.now(); const duration = 420;
    const fade = (now: number) => { const progress = Math.min(1, (now - startedAt) / duration); tracks.forEach((track, index) => { track.volume = initialVolumes[index] * (1 - progress); }); if (progress < 1) { fadeFrameRef.current = window.requestAnimationFrame(fade); return; } tracks.forEach(track => { track.pause(); track.currentTime = 0; track.volume = tracksMuted ? 0 : trackVolume; }); setIsTrackPlaying(false); onFinished?.(); };
    fadeFrameRef.current = window.requestAnimationFrame(fade);
  };
  const playTrack = (track: HTMLAudioElement | null, trackIndex: number, preview = false) => { if (!track || (musicLocked && !preview)) return; track.volume = preview ? .92 : (tracksMuted ? 0 : trackVolume); track.currentTime = 0; setCurrentTrackIndex(trackIndex); setIsTrackPlaying(true); void track.play().catch(() => setIsTrackPlaying(false)); };
  const playOpeningTrack = () => playTrack(openingTrackRef.current, 0);
  const playIntroTrack = () => playTrack(introTrackRef.current, 1);
  const playFollowupTrack = () => playTrack(followupTrackRef.current, 2);
  const playFinalTrack = () => playTrack(finalTrackRef.current, 3);
  const remove = trpc.privateMessages.remove.useMutation({ onSuccess: () => { setActive(null); setRevealedMessageId(null); void messages.refetch(); toast.success("اتحذفت الرسالة."); }, onError: error => toast.error(error.message || "ما قدرناش نحذف الرسالة دلوقتي.") });
  const create = trpc.privateMessages.create.useMutation({
    onSuccess: () => { setDraft(""); setDraftAttachment(null); void messages.refetch(); toast.success("وصلت الرسالة عندكم الاتنين."); },
    onError: error => { setJustSentContent(null); toast.error(error.message || "الرسالة ما اتبعتتش دلوقتي."); },
  });
  const chunks = active ? (() => { const segmentSize = Math.max(PAGE_SIZE, Math.ceil(active.content.length / MAX_MESSAGE_PARTS)); return Array.from({ length: Math.ceil(active.content.length / segmentSize) }, (_, index) => active.content.slice(index * segmentSize, (index + 1) * segmentSize)); })() : [];
  const current = chunks[page] || "";
  const autoAdvanceProgress = autoAdvanceSeconds ? Math.max(0, Math.min(100, ((autoAdvanceSeconds * 1000 - countdownRemainingMs) / (autoAdvanceSeconds * 1000)) * 100)) : 0;
  const goToPage = (direction: -1 | 1) => setPage(value => Math.max(0, Math.min(Math.max(0, chunks.length - 1), value + direction)));

  useEffect(() => {
    if (!active) { fadeOutTracks(); setReaderCelebration(false); return; }
    setReaderCelebration(active.createdBy === "saif");
    const timer = window.setTimeout(() => setReaderCelebration(false), 2200);
    return () => window.clearTimeout(timer);
  }, [active?.id]);
  useEffect(() => () => { stopTracksImmediately(); if (cardLaunchTimerRef.current) window.clearTimeout(cardLaunchTimerRef.current); }, []);
  useEffect(() => { window.localStorage.setItem(READER_PREFERENCES_STORAGE_KEY, JSON.stringify({ typingIntervalMs, autoAdvanceSeconds, autoAdvancePaused })); }, [typingIntervalMs, autoAdvanceSeconds, autoAdvancePaused]);
  useEffect(() => () => { void audioContextRef.current?.close(); }, []);
  useEffect(() => { const timer = window.setTimeout(() => setShowPageIntro(false), window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 650 : 2900); return () => window.clearTimeout(timer); }, []);
  useEffect(() => {
    if (!showPageIntro) return;
    const phrase = "فكرة حنون";
    setIntroComplete(false);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setIntroText(phrase); setIntroComplete(true); return; }
    setIntroText(""); let cursor = 0;
    const timer = window.setInterval(() => { cursor += 1; setIntroText(phrase.slice(0, cursor)); if (cursor >= phrase.length) { setIntroComplete(true); window.clearInterval(timer); } }, 145);
    return () => window.clearInterval(timer);
  }, [showPageIntro]);
  useEffect(() => { if (!showPageIntro || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; const timer = window.setInterval(() => setIntroThemeIndex(value => (value + 1) % 3), 720); return () => window.clearInterval(timer); }, [showPageIntro]);
  useEffect(() => {
    if (!justSentContent) return;
    const timer = window.setTimeout(() => setJustSentContent(null), 1800);
    return () => window.clearTimeout(timer);
  }, [justSentContent]);
  useEffect(() => {
    if (!active || !current) { setTypedText(""); return; }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setTypedText(current); return; }
    setTypedText("");
    skipTypewriterRef.current = false;
    let cursor = 0;
    const step = Math.max(1, Math.ceil(current.length / 360));
    const timer = window.setInterval(() => {
      if (skipTypewriterRef.current) { window.clearInterval(timer); return; }
      cursor = Math.min(current.length, cursor + step);
      setTypedText(current.slice(0, cursor));
      if (cursor % 12 < step) playTypingTone();
      if (cursor >= current.length) window.clearInterval(timer);
    }, typingIntervalMs);
    return () => window.clearInterval(timer);
  }, [active?.id, page, current, replayNonce, typingIntervalMs]);
  useEffect(() => { document.querySelector<HTMLDivElement>(".private-message-reading-copy")?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }); }, [active?.id, page, replayNonce]);
  useEffect(() => { const reader = document.querySelector<HTMLDivElement>(".private-message-reading-copy"); if (typedText && reader) reader.scrollTo({ top: reader.scrollHeight, behavior: "smooth" }); }, [typedText]);
  useEffect(() => {
    if (!active || !current || typedText !== current || page >= chunks.length - 1 || autoAdvancePaused) { setCountdownSeconds(0); setCountdownRemainingMs(0); return; }
    const waitMs = autoAdvanceSeconds * 1000; const startedAt = Date.now();
    const updateCountdown = () => { const remaining = Math.max(0, waitMs - (Date.now() - startedAt)); setCountdownRemainingMs(remaining); setCountdownSeconds(Math.ceil(remaining / 1000)); };
    updateCountdown();
    const ticker = window.setInterval(updateCountdown, 80);
    const timer = window.setTimeout(() => setPage(value => Math.min(chunks.length - 1, value + 1)), waitMs);
    return () => { window.clearInterval(ticker); window.clearTimeout(timer); };
  }, [active?.id, current, page, typedText, chunks.length, replayNonce, autoAdvancePaused, autoAdvanceSeconds]);

  const send = () => {
    const content = draft.trim();
    if (!member || !content || create.isPending) return;
    setJustSentContent(content);
    create.mutate({ content, attachment: draftAttachment ? { originalName: draftAttachment.originalName, mimeType: draftAttachment.mimeType, sizeBytes: draftAttachment.sizeBytes, dataBase64: draftAttachment.dataBase64 } : undefined });
  };
  const chooseAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const accepted = ["image/jpeg", "image/png", "image/webp"] as const;
    if (!accepted.includes(file.type as typeof accepted[number])) { toast.error("اختار صورة JPG أو PNG أو WebP."); return; }
    if (file.size > MAX_MESSAGE_IMAGE_BYTES) { toast.error("الصورة لازم تكون أقل من 500 ميجابايت."); return; }
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result !== "string") return; setDraftAttachment({ originalName: file.name, mimeType: file.type as DraftAttachment["mimeType"], sizeBytes: file.size, dataBase64: reader.result.split(",")[1] || "", previewUrl: reader.result }); };
    reader.readAsDataURL(file);
  };
  const handleReaderPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerStartX === null) return;
    const delta = event.clientX - pointerStartX;
    setPointerStartX(null);
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;
    goToPage(delta < 0 ? 1 : -1);
  };
  const replayReader = () => { getAudioContext(); setReaderCelebration(false); window.requestAnimationFrame(() => { playHeartsTone(); setReplayNonce(value => value + 1); setReaderCelebration(true); window.setTimeout(() => setReaderCelebration(false), 2200); }); };
  const openReader = (message: PrivateMessage) => { getAudioContext(); fadeOutTracks(() => { playOpeningTrack(); playHeartsTone(); playHeartbeatTone(); setActive(message); setPage(0); }); };
  const startCardLongPress = (message: PrivateMessage) => { longPressTimerRef.current = window.setTimeout(() => { suppressNextCardClickRef.current = true; if (window.confirm("تحذف الرسالة دي نهائياً؟ الصورة والرسالة هيتحذفوا مع بعض.")) remove.mutate({ id: message.id }); }, 720); };
  const cancelCardLongPress = () => { if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; };
  const downloadCardImage = async (message: PrivateMessage) => { const card = giftCardRef.current; if (!card) return; try { const canvas = await html2canvas(card, { backgroundColor: null, scale: Math.min(2, window.devicePixelRatio || 1), useCORS: true, logging: false }); const link = document.createElement("a"); link.download = `رسالة-${message.createdBy}-${message.id}.png`; link.href = canvas.toDataURL("image/png"); link.click(); toast.success("نزلنا البطاقة بالصورة والرسالة كصورة واحدة."); } catch { toast.error("ما قدرناش نجهز صورة البطاقة دلوقتي."); } };
  const closeReader = () => { setActive(null); setRevealedMessageId(null); fadeOutTracks(); };
  const skipTyping = () => { skipTypewriterRef.current = true; setTypedText(current); };
  const revealOrOpenMessage = (message: PrivateMessage) => {
    getAudioContext();
    if (revealedMessageId === message.id) {
      if (launchingMessageId === message.id) return;
      playCardFlipTone(); setLaunchingMessageId(message.id);
      cardLaunchTimerRef.current = window.setTimeout(() => { setLaunchingMessageId(null); openReader(message); }, 460);
      return;
    }
    playCardFlipTone(); setRevealedMessageId(message.id);
  };
  const previewFullSequence = () => { setMusicLocked(false); setTracksMuted(false); setTrackVolume(.92); fadeOutTracks(() => playTrack(openingTrackRef.current, 0, true)); };
  const currentTrack = MUSIC_TRACKS[currentTrackIndex];
  const nextTrack = MUSIC_TRACKS[currentTrackIndex + 1] || null;

  return <div className="page-wrap private-messages-page" dir="rtl"><audio ref={openingTrackRef} preload="metadata" src={MESSAGE_OPENING_TRACK_URL} onEnded={playIntroTrack} /><audio ref={introTrackRef} preload="metadata" src={MESSAGE_INTRO_TRACK_URL} onEnded={playFollowupTrack} /><audio ref={followupTrackRef} preload="metadata" src={MESSAGE_FOLLOWUP_TRACK_URL} onEnded={playFinalTrack} /><audio ref={finalTrackRef} preload="metadata" src={MESSAGE_FINAL_TRACK_URL} onEnded={stopTracksImmediately} />{showPageIntro ? <button type="button" className={`private-messages-page-intro intro-theme-${MUSIC_TRACKS[introThemeIndex].theme}`} onClick={() => setShowPageIntro(false)} aria-label="تخطي افتتاحية رسائلنا"><span>رسائلنا</span><strong aria-live="polite">{introText}</strong><em className={introComplete ? "is-lit" : ""}>Good Trip, Hanoun</em><small>حكايات صغيرة… وتفاصيل كبيرة بينكم</small><b>↓</b><mark>تخطي الافتتاحية</mark></button> : null}
    <header className="private-messages-hero"><div><p className="eyebrow">مساحتكم السرية</p><h1 className="page-title">رسائلنا الخاصة</h1><p>كلام بين سيف وحنين فقط. اكتبوا براحتكم؛ المعاينة تختصر الرسالة لكن القراءة تفتحها كاملة.</p></div><div className="private-message-hero-icon"><MessageCircleHeart size={30} /></div></header>
    <section className="private-message-compose surface-card"><label htmlFor="private-message-draft">رسالة جديدة</label><p className="private-message-composer-note">الكتابة الشخصية هنا تظهر بالخط الأحمر المائل نفسه الموجود في الأوراق.</p><textarea id="private-message-draft" value={draft} onChange={event => setDraft(event.target.value)} rows={7} className="field-input romantic-script-text" placeholder="اكتب اللي جواك براحتك… الرسالة الطويلة عادي." />{draftAttachment ? <div className="private-message-attachment-chip"><img src={draftAttachment.previewUrl} alt="معاينة الصورة المرفقة" /><span>{draftAttachment.originalName}</span><button type="button" onClick={() => setDraftAttachment(null)} aria-label="إزالة الصورة المرفقة"><X size={15} /></button></div> : null}<div><p>{draft.trim().length ? `كتبت ${draft.trim().length.toLocaleString("ar-EG")} حرف.` : "مفيش حد صغير للحروف في واجهة الكتابة."}</p><label className="private-message-attach-button"><ImagePlus size={15} /><input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseAttachment} disabled={create.isPending} />إرفاق صورة صغيرة</label><button type="button" onClick={send} disabled={!member || !draft.trim() || create.isPending}><Send size={17} />{create.isPending ? "بنرسل…" : "إرسال الرسالة"}</button></div></section>
    <section className="private-message-list" aria-label="رسائلنا المحفوظة">{messages.isLoading ? <div className="surface-card p-6 text-sm text-[#718078]">بنرتّب رسائلكم…</div> : (messages.data as PrivateMessage[] | undefined)?.length ? (messages.data as PrivateMessage[]).map(message => { const isNew = message.content === justSentContent; const isRevealed = revealedMessageId === message.id; const isLaunching = launchingMessageId === message.id; const giftPrompt = message.createdBy === "saif" ? "افتحي ي روحقلبي" : "شوف حنين كتبتلك اي 🫣"; const giftRecipient = message.createdBy === "saif" ? "لحنين" : "لسيف"; return <button type="button" key={message.id} className={`private-message-preview private-message-gift-card sender-${message.createdBy} ${isRevealed ? "is-revealed" : ""} ${isLaunching ? "is-launching" : ""} ${isNew ? "is-new-message" : ""}`} onClick={() => { if (suppressNextCardClickRef.current) { suppressNextCardClickRef.current = false; return; } revealOrOpenMessage(message); }} onPointerDown={() => startCardLongPress(message)} onPointerUp={cancelCardLongPress} onPointerCancel={cancelCardLongPress} onPointerLeave={cancelCardLongPress} aria-expanded={isRevealed} aria-label={isRevealed ? "افتح الرسالة كاملة" : "اكشف هدية الرسالة"} disabled={isLaunching}><span className="private-message-gift-card-inner" ref={isRevealed ? giftCardRef : undefined}><span className="private-message-gift-card-face private-message-gift-card-front"><Gift size={34} aria-hidden="true" /><b>رسالة هدية {giftRecipient}</b><strong>{giftPrompt}</strong><small>اضغط عشان تكشفها · ضغطة مطولة للحذف</small><time className="private-message-card-front-time">{new Date(message.createdAt).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })}</time></span><span className="private-message-gift-card-face private-message-gift-card-back"><span className="private-message-author"><Heart size={14} fill="currentColor" />{memberDisplayName(message.createdBy)}</span><span className={`private-message-gift-card-copy ${isNew ? "private-message-preview-typewriter" : ""}`}>{message.content.slice(0, 240)}{message.content.length > 240 ? "…" : ""}</span>{message.attachmentUrl ? <span className="private-message-card-attachment"><img src={message.attachmentUrl} alt={message.attachmentName ? `صورة مرفقة: ${message.attachmentName}` : "صورة مرفقة مع الرسالة"} /><b>صورة مع الرسالة</b></span> : null}<time>{new Date(message.createdAt).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })}</time><small>اضغط مرة تانية للرسالة كاملة · ضغطة مطولة للحذف</small>{isRevealed ? <span className="private-message-card-actions"><span role="button" tabIndex={0} onClick={event => { event.stopPropagation(); void downloadCardImage(message); }} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); void downloadCardImage(message); } }}><Download size={13} />تحميل البطاقة</span></span> : null}</span></span>{isLaunching ? <span className="private-message-gift-launch-notes" aria-hidden="true"><i>♪</i><i>♫</i><i>♪</i><i>♫</i></span> : null}</button>; }) : <div className="private-message-empty surface-card"><MessageCircleHeart size={26} /><h2>أول رسالة تبدأ المساحة دي</h2><p>اكتبوا رسالة قصيرة أو طويلة، وهتظهر للطرفين هنا.</p></div>}</section>
    {active ? <div className="private-message-modal-backdrop" role="dialog" aria-modal="true" aria-label="قراءة رسالة خاصة">
      {readerCelebration ? <div className="private-message-romance-celebration private-message-saif-hearts" aria-label="قلوب حب لحنين" aria-hidden="true"><i>♥</i><i>♥</i><i>♥</i><i>♥</i><i>♥</i><i>♥</i><i>♥</i><i>♥</i></div> : null}
      <article tabIndex={0} onKeyDown={event => { if (event.key === "ArrowLeft") { event.preventDefault(); goToPage(1); } if (event.key === "ArrowRight") { event.preventDefault(); goToPage(-1); } }} className={`private-message-reader ${prettyFont ? "is-pretty" : "is-plain"} music-theme-${currentTrack.theme} ${isTrackPlaying ? "is-music-playing" : ""}`}>
        {isTrackPlaying ? <div className="private-message-music-notes" aria-hidden="true"><i>♪</i><i>♫</i><i>♪</i><i>♫</i><i>♪</i></div> : null}
        <header><div><span>{memberDisplayName(active.createdBy)}</span><time>{new Date(active.createdAt).toLocaleString("ar-EG", { dateStyle: "full", timeStyle: "short" })}</time></div><button type="button" className="private-message-reader-close" onClick={closeReader} aria-label="إغلاق الرسالة والعودة إلى بطاقة الهدية"><X size={16} /><span>إغلاق</span></button></header>
        {active.attachmentUrl ? <figure className="private-message-reader-attachment"><img src={active.attachmentUrl} alt={active.attachmentName ? `صورة مرفقة: ${active.attachmentName}` : "صورة مرفقة مع الرسالة"} /><figcaption>تفصيلة صغيرة محفوظة مع الرسالة</figcaption></figure> : null}<div className="private-message-reading-copy" onPointerDown={event => setPointerStartX(event.clientX)} onPointerUp={handleReaderPointerUp} onPointerCancel={() => setPointerStartX(null)}><p className="private-message-swipe-hint">اكتبناها بالخط الأحمر المائل · بتظهر بهدوء عشان تقروها براحتكم</p><p className="private-message-typewriter romantic-script-text" aria-live="polite" key={`${active.id}-${page}-${prettyFont}-${replayNonce}`}>{typedText}</p></div>
        <div className="private-message-auto-controls" aria-label="التحكم في قراءة الرسالة">
          <label>سرعة الكتابة<select value={typingIntervalMs} onChange={event => setTypingIntervalMs(Number(event.target.value))}><option value={26}>سريعة</option><option value={42}>هادئة</option><option value={64}>بطيئة</option></select></label>
          <label>الانتظار<select value={autoAdvanceSeconds} onChange={event => setAutoAdvanceSeconds(Number(event.target.value))}><option value={3}>3 ثوانٍ</option><option value={5}>5 ثوانٍ</option><option value={8}>8 ثوانٍ</option></select></label>
          <button type="button" onClick={() => setAutoAdvancePaused(value => !value)} aria-pressed={autoAdvancePaused}>{autoAdvancePaused ? "استئناف التلقائي" : "إيقاف التلقائي"}</button>
          <button type="button" onClick={skipTyping} disabled={typedText === current}>تخطي الكتابة</button>
          <label className="private-message-volume-control">صوت الرسالة<input type="range" min="0" max="1" step="0.05" value={tracksMuted ? 0 : trackVolume} onChange={event => { const value = Number(event.target.value); setTrackVolume(value); setTracksMuted(value === 0); activeTracks().forEach(track => { track.volume = value; }); }} aria-label="مستوى صوت أغاني الرسالة" /></label>
          <button type="button" onClick={() => setTracksMuted(value => { const next = !value; activeTracks().forEach(track => { track.volume = next ? 0 : trackVolume; }); return next; })} aria-pressed={tracksMuted}>{tracksMuted ? "تشغيل الأغاني" : "كتم الأغاني"}</button>
          <button type="button" onClick={() => setMusicLocked(value => { const next = !value; if (next) fadeOutTracks(); return next; })} aria-pressed={musicLocked}>{musicLocked ? "فتح الموسيقى" : "قفل الموسيقى"}</button>
          <button type="button" onClick={previewFullSequence}>معاينة التسلسل</button>
          <p className="private-message-track-status" aria-live="polite"><b>يعمل الآن: {currentTrack.label}</b><span>{nextTrack ? `التالي: ${nextTrack.label}` : "هذا آخر مقطع"}</span></p>
          {typedText === current && page < chunks.length - 1 ? <div className="private-message-auto-progress" role="progressbar" aria-label="الوقت المتبقي للجزء التالي" aria-valuemin={0} aria-valuemax={autoAdvanceSeconds} aria-valuenow={countdownSeconds}><span style={{ transform: `scaleX(${autoAdvanceProgress / 100})` }} /><b>{autoAdvancePaused ? "الانتقال متوقف" : `الجزء التالي بعد ${countdownSeconds} ث`}</b></div> : null}
        </div>
        <footer><button type="button" onClick={() => setPrettyFont(value => !value)}><Type size={15} />{prettyFont ? "الخط العادي" : "الخط الجميل"}</button><button type="button" onClick={replayReader}>إعادة تشغيل</button><span>الجزء {page + 1} من {chunks.length || 1}</span><div><button type="button" disabled={page === 0} onClick={() => goToPage(-1)}>السابق</button><button type="button" disabled={page >= chunks.length - 1} onClick={() => goToPage(1)}>تابع القراءة ←</button></div></footer>
      </article>
    </div> : null}
  </div>;
}

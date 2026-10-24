export type PronunciationAccent = "en-US" | "en-GB";
export type AutoPronunciation = "off" | "once" | "twice" | "each";
export type PronunciationSettings = { accent: PronunciationAccent; voiceName: string; rate: number; repeatCount: 1 | 2 | 3 | 5; autoPronunciation: AutoPronunciation };
export const PRONUNCIATION_STORAGE_KEY = "haneenstudy-pronunciation-settings-v1";
export const defaultPronunciationSettings: PronunciationSettings = { accent: "en-US", voiceName: "", rate: 0.8, repeatCount: 1, autoPronunciation: "off" };

export function speechSynthesisSupported() { return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined"; }
export function getAvailableVoices() { return speechSynthesisSupported() ? window.speechSynthesis.getVoices().filter(voice => /^en(-|_)/i.test(voice.lang)) : []; }
export function chooseVoice(settings: PronunciationSettings) {
  const voices = getAvailableVoices();
  return voices.find(voice => voice.name === settings.voiceName) || voices.find(voice => voice.lang.toLowerCase() === settings.accent.toLowerCase()) || voices.find(voice => voice.lang.toLowerCase().startsWith(settings.accent.slice(0, 2).toLowerCase())) || voices[0];
}
export function loadPronunciationSettings(): PronunciationSettings {
  if (typeof window === "undefined") return defaultPronunciationSettings;
  try {
    const value = JSON.parse(localStorage.getItem(PRONUNCIATION_STORAGE_KEY) || "null") as Partial<PronunciationSettings> | null;
    const rate = [0.6, 0.8, 1, 1.2, 1.5].includes(Number(value?.rate)) ? Number(value?.rate) : 0.8;
    const repeatCount = [1, 2, 3, 5].includes(Number(value?.repeatCount)) ? Number(value?.repeatCount) as 1 | 2 | 3 | 5 : 1;
    return { ...defaultPronunciationSettings, ...value, accent: value?.accent === "en-GB" ? "en-GB" : "en-US", rate, repeatCount, autoPronunciation: ["off", "once", "twice", "each"].includes(value?.autoPronunciation || "") ? value!.autoPronunciation! : "off" };
  } catch { return defaultPronunciationSettings; }
}
export function savePronunciationSettings(settings: PronunciationSettings) { if (typeof window !== "undefined") localStorage.setItem(PRONUNCIATION_STORAGE_KEY, JSON.stringify(settings)); }

let activeRun = 0;
export function stopPronunciation() { activeRun += 1; if (speechSynthesisSupported()) window.speechSynthesis.cancel(); }
export function speakWord(text: string, settings: PronunciationSettings, overrides: Partial<Pick<PronunciationSettings, "rate" | "repeatCount">> = {}, onState?: (speaking: boolean) => void) {
  if (!speechSynthesisSupported()) return false;
  const run = ++activeRun;
  window.speechSynthesis.cancel();
  const voice = chooseVoice(settings);
  const count = overrides.repeatCount ?? settings.repeatCount;
  const rate = overrides.rate ?? settings.rate;
  let index = 0;
  const next = () => {
    if (run !== activeRun || index >= count) { onState?.(false); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = settings.accent;
    utterance.rate = rate;
    if (voice) utterance.voice = voice;
    utterance.onstart = () => onState?.(true);
    utterance.onend = () => { index += 1; window.setTimeout(next, 260); };
    utterance.onerror = () => onState?.(false);
    window.speechSynthesis.speak(utterance);
  };
  next();
  return true;
}

export type RecognitionResult = { supported: boolean; transcript?: string; error?: string };
export function speechRecognitionSupported() { return typeof window !== "undefined" && Boolean((window as Window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition || (window as Window & { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition); }
export function recognizeWord(language: string): Promise<RecognitionResult> {
  if (!speechRecognitionSupported()) return Promise.resolve({ supported: false, error: "التحقق من النطق غير مدعوم على جهازك، لكن يمكنك الاستماع للكلمة." });
  return new Promise(resolve => {
    const Ctor = ((window as Window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any }).SpeechRecognition || (window as Window & { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition)!;
    const recognition = new Ctor(); recognition.lang = language; recognition.interimResults = false; recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => resolve({ supported: true, transcript: String(event.results?.[0]?.[0]?.transcript || "") });
    recognition.onerror = () => resolve({ supported: true, error: "ما قدرناش نسمع الكلمة بوضوح. جرّب مرة تانية." });
    recognition.onend = () => undefined;
    try { recognition.start(); } catch { resolve({ supported: true, error: "الميكروفون مش متاح دلوقتي." }); }
  });
}
export function normalizePronunciationText(value: string) { return value.toLocaleLowerCase().replace(/[^a-z\s'-]/gi, "").replace(/\s+/g, " ").trim(); }

import { useEffect, useRef, useState } from "react";
import { Grip, Maximize2, Minimize2, X } from "lucide-react";
import { clampFloatingWindowPosition } from "@/lib/floatingWindowBounds";
import { YOUTUBE_TIME_EVENT } from "@/lib/liveShare";

export type PlatformVideoPayload = { id: number; title: string; kind: "youtube" | "direct" | "embed"; sourceUrl: string; embedUrl: string | null; videoId: string | null; currentSeconds?: number };
type WindowState = { x: number; y: number; width: number; height: number };
const initialWindow: WindowState = { x: 18, y: 110, width: 520, height: 320 };

export function openPlatformVideoOverBoard(video: PlatformVideoPayload) {
  window.dispatchEvent(new CustomEvent<PlatformVideoPayload>("saf-haneen-open-platform-video", { detail: video }));
}

function displaySize(state: WindowState, compact: boolean) {
  return compact ? { width: 290, height: 210 } : { width: state.width, height: state.height };
}

function clampWindow(state: WindowState, compact: boolean) {
  if (typeof window === "undefined") return state;
  const size = displaySize(state, compact);
  return { ...state, ...clampFloatingWindowPosition({ ...state, ...size, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight }) };
}

export default function PlatformVideoBoardFloating() {
  const [video, setVideo] = useState<PlatformVideoPayload | null>(null);
  const [state, setState] = useState(initialWindow);
  const [compact, setCompact] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; originWidth: number; originHeight: number } | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const open = (event: Event) => {
      const detail = (event as CustomEvent<PlatformVideoPayload>).detail;
      if (!detail?.sourceUrl || !detail?.title) return;
      setVideo(detail); setCompact(false); setState(current => clampWindow(current, false));
    };
    window.addEventListener("saf-haneen-open-platform-video", open);
    return () => window.removeEventListener("saf-haneen-open-platform-video", open);
  }, []);
  useEffect(() => {
    const keepVisible = () => setState(current => clampWindow(current, compact));
    window.addEventListener("resize", keepVisible);
    return () => window.removeEventListener("resize", keepVisible);
  }, [compact]);
  useEffect(() => {
    if (!video || video.kind !== "youtube" || !video.videoId || !video.embedUrl) return;
    const targetOrigin = new URL(video.embedUrl).origin;
    const postCommand = (func: string, args: unknown[]) => frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), targetOrigin);
    const askTime = () => postCommand("getCurrentTime", []);
    const syncPosition = () => { if (typeof video.currentSeconds === "number" && video.currentSeconds > 0) postCommand("seekTo", [video.currentSeconds, true]); };
    const receiveTime = (event: MessageEvent) => {
      if (event.origin !== targetOrigin || typeof event.data !== "string") return;
      try {
        const data = JSON.parse(event.data);
        const seconds = data?.info?.currentTime;
        if (typeof seconds === "number") window.dispatchEvent(new CustomEvent(YOUTUBE_TIME_EVENT, { detail: { videoId: video.videoId, seconds } }));
      } catch { /* Ignore unrelated iframe messages. */ }
    };
    const timer = window.setInterval(askTime, 1600);
    const positionTimer = window.setTimeout(syncPosition, 900);
    window.addEventListener("message", receiveTime);
    return () => { window.clearInterval(timer); window.clearTimeout(positionTimer); window.removeEventListener("message", receiveTime); };
  }, [video]);
  useEffect(() => {
    if (video?.kind === "direct" && videoRef.current && typeof video.currentSeconds === "number") videoRef.current.currentTime = Math.max(0, video.currentSeconds);
  }, [video]);
  if (!video) return null;
  const size = displaySize(state, compact);
  const beginDrag = (event: React.PointerEvent<HTMLDivElement>) => { event.currentTarget.setPointerCapture?.(event.pointerId); dragRef.current = { startX: event.clientX, startY: event.clientY, originX: state.x, originY: state.y }; };
  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => { const drag = dragRef.current; if (!drag) return; setState(current => clampWindow({ ...current, x: drag.originX + event.clientX - drag.startX, y: drag.originY + event.clientY - drag.startY }, compact)); };
  const endDrag = () => { dragRef.current = null; };
  const beginResize = (event: React.PointerEvent<HTMLButtonElement>) => { event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture?.(event.pointerId); resizeRef.current = { startX: event.clientX, startY: event.clientY, originWidth: state.width, originHeight: state.height }; };
  const moveResize = (event: React.PointerEvent<HTMLButtonElement>) => { const resize = resizeRef.current; if (!resize) return; setState(current => clampWindow({ ...current, width: Math.max(280, Math.min(window.innerWidth - 16, resize.originWidth + event.clientX - resize.startX)), height: Math.max(200, Math.min(window.innerHeight - 88, resize.originHeight + event.clientY - resize.startY)) }, false)); };
  const endResize = () => { resizeRef.current = null; };
  return <div className="pointer-events-none fixed inset-0 z-[131]" dir="rtl"><section className="pointer-events-auto fixed overflow-hidden rounded-3xl border border-white/70 bg-[#17251f] shadow-[0_24px_70px_rgba(20,40,29,.3)]" style={{ left: `${state.x}px`, top: `${state.y}px`, width: `${size.width}px`, height: `${size.height}px`, maxWidth: "calc(100vw - 16px)", maxHeight: "calc(100vh - 88px)", minWidth: 280, minHeight: 200 }} aria-label="فيديو منصة عائم فوق السبورة"><div onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} className="flex h-11 cursor-grab touch-none items-center gap-2 bg-[#243c31] px-3 text-white active:cursor-grabbing"><Grip size={16} /><span className="min-w-0 flex-1 truncate text-xs font-black">{video.title}</span><button type="button" onClick={() => setCompact(value => { const next = !value; setState(current => clampWindow(current, next)); return next; })} className="rounded-lg p-1.5 hover:bg-white/10" aria-label={compact ? "تكبير فيديو المنصة" : "تصغير فيديو المنصة"}>{compact ? <Maximize2 size={15} /> : <Minimize2 size={15} />}</button><button type="button" onClick={() => setVideo(null)} className="rounded-lg p-1.5 hover:bg-white/10" aria-label="إغلاق فيديو المنصة"><X size={16} /></button></div>{video.kind === "direct" ? <video ref={videoRef} controls autoPlay className="block size-full bg-black object-contain" src={video.sourceUrl} onTimeUpdate={event => window.dispatchEvent(new CustomEvent(YOUTUBE_TIME_EVENT, { detail: { sourceId: String(video.id), seconds: Math.floor(event.currentTarget.currentTime) } }))} /> : <iframe ref={frameRef} title={video.title} src={video.embedUrl ?? video.sourceUrl} className="block size-full border-0 bg-black" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />}{!compact ? <button type="button" onPointerDown={beginResize} onPointerMove={moveResize} onPointerUp={endResize} onPointerCancel={endResize} className="absolute bottom-0 left-0 grid size-11 touch-none place-items-center text-white" aria-label="تحجيم فيديو المنصة"><span className="h-4 w-4 rounded-sm border-b-2 border-l-2 border-white/90" /></button> : null}</section></div>;
}

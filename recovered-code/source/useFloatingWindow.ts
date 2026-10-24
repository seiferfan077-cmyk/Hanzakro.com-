import { useEffect, useRef, useState, type PointerEvent } from "react";

export type FloatingWindowPosition = { x: number; y: number };
type FloatingWindowSize = { width: number; height: number };

function viewport() {
  return {
    width: typeof window === "undefined" ? 390 : window.innerWidth,
    height: typeof window === "undefined" ? 760 : window.innerHeight,
  };
}

export function clampFloatingWindowPosition(position: FloatingWindowPosition, size: FloatingWindowSize, margin = 12): FloatingWindowPosition {
  const currentViewport = viewport();
  const maxX = Math.max(margin, currentViewport.width - size.width - margin);
  const maxY = Math.max(margin, currentViewport.height - size.height - margin);
  return {
    x: Math.round(Math.max(margin, Math.min(Number.isFinite(position.x) ? position.x : margin, maxX))),
    y: Math.round(Math.max(margin, Math.min(Number.isFinite(position.y) ? position.y : margin, maxY))),
  };
}

export function useFloatingWindow({ storageKey, initialPosition, getSize, margin = 12 }: { storageKey: string; initialPosition: () => FloatingWindowPosition; getSize: () => FloatingWindowSize; margin?: number }) {
  const getSizeRef = useRef(getSize);
  getSizeRef.current = getSize;
  const dragRef = useRef<{ origin: FloatingWindowPosition; startX: number; startY: number } | null>(null);
  const [position, setPosition] = useState<FloatingWindowPosition>(() => {
    const fallback = clampFloatingWindowPosition(initialPosition(), getSize(), margin);
    if (typeof window === "undefined") return fallback;
    try {
      const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? "");
      if (typeof parsed?.x === "number" && typeof parsed?.y === "number") return clampFloatingWindowPosition(parsed, getSize(), margin);
    } catch { /* أول فتح أو بيانات قديمة غير صالحة. */ }
    return fallback;
  });

  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify(position)); } catch { /* التخزين اختياري. */ }
  }, [position, storageKey]);
  useEffect(() => {
    const keepInsideViewport = () => setPosition(current => clampFloatingWindowPosition(current, getSizeRef.current(), margin));
    window.addEventListener("resize", keepInsideViewport);
    return () => window.removeEventListener("resize", keepInsideViewport);
  }, [margin]);

  const startDrag = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    dragRef.current = { origin: position, startX: event.clientX, startY: event.clientY };
    event.preventDefault();
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* دعم Pointer Capture اختياري. */ }
  };
  const moveDrag = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    setPosition(clampFloatingWindowPosition({ x: drag.origin.x + event.clientX - drag.startX, y: drag.origin.y + event.clientY - drag.startY }, getSizeRef.current(), margin));
  };
  const stopDrag = () => { dragRef.current = null; };

  return { position, setPosition, dragHandleProps: { onPointerDown: startDrag, onPointerMove: moveDrag, onPointerUp: stopDrag, onPointerCancel: stopDrag } };
}

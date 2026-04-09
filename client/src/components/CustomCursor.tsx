/**
 * CustomCursor — Global custom cursor with inner dot + trailing outer ring.
 * Extracted from SpyOps landing page for app-wide use.
 * Hides on touch devices. Expands on hover over interactive elements.
 */
import { useEffect, useState, useCallback, useRef } from "react";

export default function CustomCursor() {
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [ringPos, setRingPos] = useState({ x: -100, y: -100 });
  const [cursorHover, setCursorHover] = useState(false);
  const [visible, setVisible] = useState(false);
  const ringRef = useRef({ x: -100, y: -100 });

  // Hide on touch devices
  useEffect(() => {
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouch) return;
    setVisible(true);
  }, []);

  // Track mouse position
  const handleMouseMove = useCallback((e: MouseEvent) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
    ringRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    if (!visible) return;
    window.addEventListener("mousemove", handleMouseMove);
    // Ring follows with lag
    const iv = setInterval(() => {
      setRingPos((prev) => ({
        x: prev.x + (ringRef.current.x - prev.x) * 0.15,
        y: prev.y + (ringRef.current.y - prev.y) * 0.15,
      }));
    }, 16);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearInterval(iv);
    };
  }, [handleMouseMove, visible]);

  // Hover detection for interactive elements
  useEffect(() => {
    if (!visible) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const interactive =
        t.closest("a") ||
        t.closest("button") ||
        t.closest("[role='button']") ||
        t.closest("input") ||
        t.closest("textarea") ||
        t.closest("select") ||
        t.closest("[data-cursor-hover]");
      setCursorHover(!!interactive);
    };
    window.addEventListener("mouseover", handler);
    return () => window.removeEventListener("mouseover", handler);
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      {/* Inner dot */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          left: cursorPos.x - (cursorHover ? 8 : 6),
          top: cursorPos.y - (cursorHover ? 8 : 6),
          width: cursorHover ? 16 : 12,
          height: cursorHover ? 16 : 12,
          border: "1px solid #fff",
          background: cursorHover ? "rgba(255,255,255,0.2)" : "transparent",
          pointerEvents: "none",
          zIndex: 99999,
          transition: "width 0.1s, height 0.1s, background 0.1s",
        }}
      />
      {/* Outer ring (trails with lag) */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          left: ringPos.x - 18,
          top: ringPos.y - 18,
          width: 36,
          height: 36,
          border: "1px solid rgba(255,255,255,0.3)",
          pointerEvents: "none",
          zIndex: 99998,
        }}
      />
    </>
  );
}

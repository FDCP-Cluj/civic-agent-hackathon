import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Tap-to-listen text reader using the Web SpeechSynthesis API (no network calls).
 * Highlights the currently-spoken element via the `.reading-now` CSS class.
 */
export function useReadAloud(enabled: boolean, lang = "ro-RO") {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentEl = useRef<Element | null>(null);

  const stop = useCallback(() => {
    if (typeof window === "undefined") return;
    window.speechSynthesis?.cancel();
    if (currentEl.current) {
      currentEl.current.classList.remove("reading-now");
      currentEl.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string, sourceEl?: Element | null) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      if (!text.trim()) return;
      stop();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = 0.95;
      u.onend = () => {
        if (currentEl.current) {
          currentEl.current.classList.remove("reading-now");
          currentEl.current = null;
        }
        setIsSpeaking(false);
      };
      u.onerror = () => {
        if (currentEl.current) {
          currentEl.current.classList.remove("reading-now");
          currentEl.current = null;
        }
        setIsSpeaking(false);
      };
      utterRef.current = u;
      if (sourceEl) {
        sourceEl.classList.add("reading-now");
        currentEl.current = sourceEl;
      }
      window.speechSynthesis.speak(u);
      setIsSpeaking(true);
    },
    [lang, stop],
  );

  // When enabled, install a global click delegate that reads any p / h1 / h2 / h3 / li.
  useEffect(() => {
    if (!enabled) {
      stop();
      return;
    }
    document.documentElement.classList.add("read-aloud-mode");

    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      // Walk up to the nearest text-bearing element
      const el = target.closest("p, h1, h2, h3, li");
      if (!el) return;
      // Ignore clicks inside form controls and links
      if (target.closest("button, a, input, textarea, select, [role=button]")) return;
      const text = el.textContent?.trim();
      if (!text) return;
      event.stopPropagation();
      speak(text, el);
    };

    document.addEventListener("click", handler);
    return () => {
      document.removeEventListener("click", handler);
      document.documentElement.classList.remove("read-aloud-mode");
      stop();
    };
  }, [enabled, speak, stop]);

  return { isSpeaking, speak, stop };
}

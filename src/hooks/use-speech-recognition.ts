import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionLike = {
  lang: string;
  continuous?: boolean;
  interimResults?: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type Options = {
  lang?: string;
  onResult: (transcript: string) => void;
  onError?: (message: string) => void;
};

export function useSpeechRecognition({ lang = "ro-RO", onResult, onError }: Options) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setIsSupported(getCtor() !== null);
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) {
      onError?.("Recunoașterea vocală nu este disponibilă pe acest browser.");
      return;
    }
    try {
      const rec = new Ctor();
      rec.lang = lang;
      rec.onresult = (e) => {
        const transcript = e.results[0]?.[0]?.transcript ?? "";
        if (transcript) onResult(transcript);
      };
      rec.onerror = () => onError?.("Nu am putut accesa microfonul.");
      rec.onend = () => setIsListening(false);
      rec.start();
      recRef.current = rec;
      setIsListening(true);
    } catch {
      onError?.("Nu am putut porni recunoașterea vocală.");
    }
  }, [lang, onResult, onError]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      recRef.current?.stop();
    };
  }, []);

  return { isListening, isSupported, start, stop };
}

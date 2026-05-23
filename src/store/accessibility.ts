import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type AppLanguage = "ro" | "en" | "hu";

// Accessibility settings drive global CSS classes on documentElement:
// .high-contrast, .dyslexic-font, .read-aloud-mode. The sync is done by
// the AccessibilityClassSync component mounted once in AppShell.

type AccessibilityState = {
  highContrast: boolean;
  dyslexicFont: boolean;
  readAloud: boolean;
  language: AppLanguage;
  setHighContrast: (v: boolean) => void;
  setDyslexicFont: (v: boolean) => void;
  setReadAloud: (v: boolean) => void;
  setLanguage: (lang: AppLanguage) => void;
};

export const useAccessibility = create<AccessibilityState>()(
  persist(
    (set) => ({
      highContrast: false,
      dyslexicFont: false,
      readAloud: false,
      language: "ro",
      setHighContrast: (v) => set({ highContrast: v }),
      setDyslexicFont: (v) => set({ dyslexicFont: v }),
      setReadAloud: (v) => set({ readAloud: v }),
      setLanguage: (language) => set({ language }),
    }),
    { name: "civis-a11y", storage: createJSONStorage(() => localStorage) },
  ),
);

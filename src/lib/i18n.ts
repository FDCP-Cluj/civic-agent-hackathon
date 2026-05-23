// Minimal i18n scaffold. Hooked into `useAccessibility.language` so that
// the accessibility menu's language selector toggles all translated copy
// without a page reload.
//
// Why minimal: most user-facing copy in ActeAI lives inside JSX, not a
// resource file. This scaffold gives the seam: we can extract strings
// into the dictionaries over time without refactoring component logic.
//
// Default and fallback: Romanian. English and Hungarian dictionaries are
// stubbed and inherit any missing key from `ro`.

import { useAccessibility, type AppLanguage } from "@/store";

type Dict = Record<string, string>;

const ro: Dict = {
  "common.back": "Înapoi",
  "common.save": "Salvează",
  "common.cancel": "Anulează",
  "common.continue": "Continuă",
  "common.close": "Închide",
  "common.start": "Pornește",
  "common.loading": "Se încarcă…",
  "common.offline": "Funcționează și fără internet.",
  "nav.home": "Acasă",
  "nav.vault": "Seif",
  "nav.tasks": "Sarcini",
  "vault.title": "Seiful meu local",
  "vault.subtitle": "Datele și actele tale rămân pe acest dispozitiv.",
  "vault.zeroGdpr": "Zero GDPR. ActeAI nu trimite niciun document către servere.",
  "chat.title": "Agentul ActeAI",
  "chat.subtitle": "Întreabă orice despre birocrația din România.",
  "chat.privacyNote": "Datele tale rămân pe acest dispozitiv. Nu trimitem documente.",
};

const en: Dict = {
  "common.back": "Back",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.continue": "Continue",
  "common.close": "Close",
  "common.start": "Start",
  "common.loading": "Loading…",
  "common.offline": "Works offline too.",
  "nav.home": "Home",
  "nav.vault": "Vault",
  "nav.tasks": "Tasks",
  "vault.title": "My local vault",
  "vault.subtitle": "Your data and documents stay on this device.",
  "vault.zeroGdpr": "Zero GDPR. ActeAI never sends documents to a server.",
  "chat.title": "ActeAI Agent",
  "chat.subtitle": "Ask anything about Romanian bureaucracy.",
  "chat.privacyNote": "Your data stays on this device. We don't send documents.",
};

const hu: Dict = {
  "common.back": "Vissza",
  "common.save": "Mentés",
  "common.continue": "Tovább",
  "common.close": "Bezárás",
};

const DICTS: Record<AppLanguage, Dict> = { ro, en, hu };

/**
 * Imperative lookup. Returns the key itself if no translation exists,
 * which makes missing-string regressions immediately visible in the UI.
 */
export function translate(key: string, language: AppLanguage): string {
  return DICTS[language][key] ?? ro[key] ?? key;
}

/** React hook bound to `useAccessibility.language`. */
export function useT(): (key: string) => string {
  const language = useAccessibility((s) => s.language);
  return (key: string) => translate(key, language);
}

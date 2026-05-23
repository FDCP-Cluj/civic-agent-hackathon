import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// Local Vault — the heart of the zero-GDPR pillar.
//
// EVERY field below is persisted to localStorage only. Nothing in this slice
// is ever sent to a server. The Gemini chat reads the profile to personalize
// answers, but it sees a masked CNP and never sees the document previews
// (see services/geminiChat.ts).

export type VaultProfile = {
  fullName: string;
  cnp: string;
  address: string;
  phone: string;
  email: string;
  birthDate: string;
};

export type VaultDocument = {
  id: string;
  type: "id_card" | "driver_license" | "birth_cert" | "car_papers" | "passport" | "other";
  label: string;
  fileName: string;
  /** base64 preview (mock) — kept in localStorage only */
  preview?: string;
  uploadedAt: string;
  /** Optional ISO date — used by dashboard to surface expiry reminders. */
  expiryDate?: string;
};

/** Each document type maps to the workflow that renews it. */
export const RENEWAL_WORKFLOW_FOR_DOC: Record<VaultDocument["type"], string | null> = {
  id_card: "id-change-relocation",
  driver_license: "renew-driver-license",
  passport: "passport-issuance",
  birth_cert: null,
  car_papers: null,
  other: null,
};

type VaultState = {
  profile: VaultProfile;
  documents: VaultDocument[];
  updateProfile: (p: Partial<VaultProfile>) => void;
  addDocument: (d: VaultDocument) => void;
  updateDocument: (id: string, patch: Partial<VaultDocument>) => void;
  removeDocument: (id: string) => void;
};

const emptyProfile: VaultProfile = {
  fullName: "",
  cnp: "",
  address: "",
  phone: "",
  email: "",
  birthDate: "",
};

export const useVault = create<VaultState>()(
  persist(
    (set) => ({
      profile: emptyProfile,
      documents: [],
      updateProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      addDocument: (d) => set((s) => ({ documents: [d, ...s.documents] })),
      updateDocument: (id, patch) =>
        set((s) => ({
          documents: s.documents.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        })),
      removeDocument: (id) => set((s) => ({ documents: s.documents.filter((x) => x.id !== id) })),
    }),
    { name: "civis-vault", storage: createJSONStorage(() => localStorage) },
  ),
);

// ---------- Derived selectors ----------

/** Days until an ISO date string. Negative if past. Floored. */
export function daysUntil(iso: string): number {
  const target = new Date(iso).getTime();
  const now = Date.now();
  return Math.floor((target - now) / (1000 * 60 * 60 * 24));
}

export type ExpiringDocument = VaultDocument & { daysLeft: number };

/** React hook: vault documents expiring within `withinDays` days, sorted soonest-first. */
export function useExpiringDocuments(withinDays = 60): ExpiringDocument[] {
  const documents = useVault((s) => s.documents);
  return documents
    .filter((d): d is VaultDocument & { expiryDate: string } => Boolean(d.expiryDate))
    .map((d) => ({ ...d, daysLeft: daysUntil(d.expiryDate) }))
    .filter((d) => d.daysLeft <= withinDays)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

/** Returns 0–1 indicating how complete the profile is, based on filled fields. */
export function useProfileCompleteness(): number {
  const profile = useVault((s) => s.profile);
  const fields: (keyof VaultProfile)[] = [
    "fullName",
    "cnp",
    "address",
    "phone",
    "email",
    "birthDate",
  ];
  const filled = fields.filter((f) => profile[f]?.trim().length > 0).length;
  return filled / fields.length;
}

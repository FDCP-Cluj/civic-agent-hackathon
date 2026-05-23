import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  emptyStructuredAddress,
  formatStructuredAddress,
  mergeAddressParts,
  parseRomanianAddress,
  type StructuredAddress,
} from "@/lib/address";

// Local Vault — the heart of the zero-GDPR pillar.
//
// EVERY field below is persisted to localStorage only. Nothing in this slice
// is ever sent to a server. The Gemini chat reads the profile to personalize
// answers, but it sees a masked CNP and never sees the document previews
// (see services/geminiChat.ts).

export type { StructuredAddress };

export type VaultProfile = {
  fullName: string;
  firstName: string;
  lastName: string;
  cnp: string;
  /** Legacy one-line address; kept in sync with addressParts. */
  address: string;
  addressParts: StructuredAddress;
  phone: string;
  email: string;
  birthDate: string;
  birthLocality: string;
  birthCounty: string;
  birthCountry: string;
  citizenship: string;
  orctOffice: string;
  idCardType: string;
  idCardSeries: string;
  idCardNumber: string;
  idCardIssuedBy: string;
  idCardIssueDate: string;
  idCardExpiryDate: string;
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
  updateAddressParts: (patch: Partial<StructuredAddress>) => void;
  addDocument: (d: VaultDocument) => void;
  updateDocument: (id: string, patch: Partial<VaultDocument>) => void;
  removeDocument: (id: string) => void;
};

export function splitRomanianFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: "", lastName: parts[0] };
  return { lastName: parts[0], firstName: parts.slice(1).join(" ") };
}

function syncDerivedProfileFields(profile: VaultProfile): VaultProfile {
  const next = { ...profile };
  if (next.fullName.trim()) {
    const split = splitRomanianFullName(next.fullName);
    if (!next.firstName.trim()) next.firstName = split.firstName;
    if (!next.lastName.trim()) next.lastName = split.lastName;
  } else if (next.firstName.trim() || next.lastName.trim()) {
    next.fullName = [next.lastName, next.firstName].filter(Boolean).join(" ").trim();
  }
  if (!next.addressParts.country.trim()) next.addressParts = { ...next.addressParts, country: "România" };
  if (!next.citizenship.trim()) next.citizenship = "Română";
  if (!next.idCardType.trim()) next.idCardType = "CI";
  const formatted = formatStructuredAddress(next.addressParts);
  if (formatted) next.address = formatted;
  return next;
}

const emptyProfile: VaultProfile = syncDerivedProfileFields({
  fullName: "",
  firstName: "",
  lastName: "",
  cnp: "",
  address: "",
  addressParts: emptyStructuredAddress(),
  phone: "",
  email: "",
  birthDate: "",
  birthLocality: "",
  birthCounty: "",
  birthCountry: "România",
  citizenship: "Română",
  orctOffice: "",
  idCardType: "CI",
  idCardSeries: "",
  idCardNumber: "",
  idCardIssuedBy: "",
  idCardIssueDate: "",
  idCardExpiryDate: "",
});

function migratePersistedProfile(raw: unknown): VaultProfile {
  const p = (raw && typeof raw === "object" ? raw : {}) as Partial<VaultProfile> & {
    addressParts?: Partial<StructuredAddress>;
  };
  const addressParts = mergeAddressParts(
    emptyStructuredAddress(),
    p.addressParts ?? (p.address ? parseRomanianAddress(p.address) : {}),
  );
  return syncDerivedProfileFields({
    ...emptyProfile,
    ...p,
    addressParts,
    address: p.address ?? formatStructuredAddress(addressParts),
  });
}

export const useVault = create<VaultState>()(
  persist(
    (set) => ({
      profile: emptyProfile,
      documents: [],
      updateProfile: (p) =>
        set((s) => {
          let profile = { ...s.profile, ...p };
          if (p.addressParts) {
            profile.addressParts = mergeAddressParts(s.profile.addressParts, p.addressParts);
          }
          if (p.address && !p.addressParts) {
            profile.addressParts = mergeAddressParts(
              s.profile.addressParts,
              parseRomanianAddress(p.address),
            );
          }
          return { profile: syncDerivedProfileFields(profile) };
        }),
      updateAddressParts: (patch) =>
        set((s) => ({
          profile: syncDerivedProfileFields({
            ...s.profile,
            addressParts: mergeAddressParts(s.profile.addressParts, patch),
          }),
        })),
      addDocument: (d) => set((s) => ({ documents: [d, ...s.documents] })),
      updateDocument: (id, patch) =>
        set((s) => ({
          documents: s.documents.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        })),
      removeDocument: (id) => set((s) => ({ documents: s.documents.filter((x) => x.id !== id) })),
    }),
    {
      name: "civis-vault",
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        const p = persisted as { profile?: unknown; documents?: VaultDocument[] } | undefined;
        return {
          ...current,
          profile: migratePersistedProfile(p?.profile),
          documents: p?.documents ?? current.documents,
        };
      },
    },
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
  const checks = [
    profile.fullName,
    profile.cnp,
    profile.addressParts.street,
    profile.addressParts.locality,
    profile.phone,
    profile.email,
    profile.birthDate,
    profile.idCardSeries,
    profile.idCardNumber,
  ];
  const filled = checks.filter((f) => f?.trim().length > 0).length;
  return filled / checks.length;
}

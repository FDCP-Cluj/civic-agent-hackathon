// Demo seed used by the verify step. When a tester signs in with `test@gmail.com`
// and the local vault is still empty, we drop in a complete Romanian persona and
// a realistic spread of documents — including one ID card that's about to expire
// so the dashboard expiry banner, civic hero, and Magic Autofill all have
// something meaningful to show off in a 30-second demo.
//
// All data is fabricated; the CNP below validates against the official Romanian
// CNP control-digit formula but does not correspond to any real person.

import { useAuth, useVault, type VaultDocument, type VaultProfile } from "@/store";

export const DEMO_EMAIL = "test@gmail.com";

export const DEMO_PROFILE: VaultProfile = {
  fullName: "Andrei Popescu",
  cnp: "1850612431527", // M, 12.06.1985, sector 3 București — valid control digit
  address: "Calea Victoriei nr. 25, ap. 14, Sector 3, București",
  phone: "+40 723 456 789",
  email: DEMO_EMAIL,
  birthDate: "1985-06-12",
};

/**
 * Returns the mock document list, with expiry dates computed relative to `now`
 * so the demo behaves the same whether you test it today or six months from now.
 */
export function buildDemoDocuments(now: Date = new Date()): VaultDocument[] {
  const isoIn = (days: number) => {
    const d = new Date(now.getTime());
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const isoAgo = (days: number) => isoIn(-days);

  return [
    {
      id: "demo-id-card",
      type: "id_card",
      label: "Carte de identitate",
      fileName: "ci-rx-758421.pdf",
      uploadedAt: isoAgo(120),
      // Expires in 35 days — triggers civic hero renewal banner and dashboard
      // expiry strip out of the box.
      expiryDate: isoIn(35),
    },
    {
      id: "demo-driver-license",
      type: "driver_license",
      label: "Permis de conducere (cat. B)",
      fileName: "permis-12345678.pdf",
      uploadedAt: isoAgo(400),
      expiryDate: isoIn(540),
    },
    {
      id: "demo-passport",
      type: "passport",
      label: "Pașaport simplu electronic",
      fileName: "pasaport-048372961.pdf",
      uploadedAt: isoAgo(200),
      expiryDate: isoIn(1280),
    },
    {
      id: "demo-car-papers",
      type: "car_papers",
      label: "Talon auto · B-129-CIV (Dacia Sandero 2019)",
      fileName: "talon-b129civ.pdf",
      uploadedAt: isoAgo(60),
    },
    {
      id: "demo-birth-cert",
      type: "birth_cert",
      label: "Certificat de naștere · seria CN 5847291",
      fileName: "certificat-nastere.pdf",
      uploadedAt: isoAgo(800),
    },
  ];
}

/**
 * Seeds the vault when the demo email signs in for the first time, leaving any
 * manually-edited data untouched. Idempotent: re-running on an already-seeded
 * vault is a no-op.
 */
export function maybeSeedDemoVault(email: string | null | undefined): boolean {
  if (!email || email.trim().toLowerCase() !== DEMO_EMAIL) return false;

  const vault = useVault.getState();
  const profileIsEmpty = !vault.profile.fullName.trim() && !vault.profile.cnp.trim();
  const hasNoRealDocs = vault.documents.length === 0;

  if (!profileIsEmpty && !hasNoRealDocs) return false;

  if (profileIsEmpty) {
    vault.updateProfile(DEMO_PROFILE);
  }
  if (hasNoRealDocs) {
    for (const doc of buildDemoDocuments()) {
      vault.addDocument(doc);
    }
  }
  return true;
}

/** Convenience hook for the login screen to surface the demo creds. */
export function useIsDemoAccountActive(): boolean {
  const email = useAuth((s) => s.email);
  return (email ?? "").trim().toLowerCase() === DEMO_EMAIL;
}

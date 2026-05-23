import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { FormValues } from "@/services/forms/types";

export type PfaAttachmentType = "ci" | "sediu" | "diploma";

export type PfaDossierState = {
  codCaenPrincipal: string;
  codCaenSecondare: string[];
  denumirePfa: string;
  sediuProfesional: string;
  doarAdresaAdministrativa: boolean;
  activitateDescriere: string;
  attachments: Partial<Record<PfaAttachmentType, string>>;
  formDrafts: Record<string, FormValues>;
  cardModes: Record<string, "autofill" | "manual">;
  cardStatus: Record<string, "necompletat" | "draft" | "gata">;
};

type PfaDossierActions = {
  updateDossier: (patch: Partial<PfaDossierState>) => void;
  setFormDraft: (templateId: string, values: FormValues) => void;
  setCardMode: (cardId: string, mode: "autofill" | "manual") => void;
  setCardStatus: (cardId: string, status: "necompletat" | "draft" | "gata") => void;
  setAttachment: (type: PfaAttachmentType, vaultDocId: string | undefined) => void;
  syncFromProfile: (profile: { fullName: string; address: string; cnp: string }) => void;
};

const initialState: PfaDossierState = {
  codCaenPrincipal: "",
  codCaenSecondare: [],
  denumirePfa: "",
  sediuProfesional: "",
  doarAdresaAdministrativa: false,
  activitateDescriere: "",
  attachments: {},
  formDrafts: {},
  cardModes: {},
  cardStatus: {},
};

export const usePfaDossier = create<PfaDossierState & PfaDossierActions>()(
  persist(
    (set) => ({
      ...initialState,
      updateDossier: (patch) => set((s) => ({ ...s, ...patch })),
      setFormDraft: (templateId, values) =>
        set((s) => ({
          formDrafts: { ...s.formDrafts, [templateId]: values },
        })),
      setCardMode: (cardId, mode) =>
        set((s) => ({
          cardModes: { ...s.cardModes, [cardId]: mode },
        })),
      setCardStatus: (cardId, status) =>
        set((s) => ({
          cardStatus: { ...s.cardStatus, [cardId]: status },
        })),
      setAttachment: (type, vaultDocId) =>
        set((s) => {
          const attachments = { ...s.attachments };
          if (vaultDocId) attachments[type] = vaultDocId;
          else delete attachments[type];
          return { attachments };
        }),
      syncFromProfile: (profile) =>
        set((s) => {
          const denumire =
            s.denumirePfa || (profile.fullName.trim() ? `${profile.fullName.trim()} PFA` : "");
          return {
            denumirePfa: denumire,
            sediuProfesional: s.sediuProfesional || profile.address || "",
          };
        }),
    }),
    { name: "civis-pfa-dossier", storage: createJSONStorage(() => localStorage) },
  ),
);

export function defaultDenumireFromName(fullName: string): string {
  const n = fullName.trim();
  if (!n) return "";
  return `${n} PFA`;
}

import { applyLabelsToTemplateFields } from "@/data/forms/pfa/field-labels.ro";
import { PFA_FIELD_SOURCES } from "@/data/forms/pfa/pfa-field-sources";
import type { PfaDossierCardDef, PfaFormTemplate, SubmissionInfo } from "./types";

import rezervareTemplate from "@/data/forms/pfa/rezervare-denumire-24940.template.json";
import declaratieTemplate from "@/data/forms/pfa/declaratie-propria-raspundere.template.json";

const ONRC_SUBMISSION: SubmissionInfo = {
  institution: "ONRC",
  channels: [
    {
      label: "Portal online",
      url: "https://portal.onrc.ro/",
      requires: ["semnatura_electronica_calificata"],
    },
    { label: "Ghișeu ORCT", url: "https://www.onrc.ro", requires: ["deplasare"] },
  ],
};

export const PFA_FORM_TEMPLATES: Record<string, PfaFormTemplate> = {
  [rezervareTemplate.id]: rezervareTemplate as PfaFormTemplate,
  [declaratieTemplate.id]: declaratieTemplate as PfaFormTemplate,
};

export const PFA_DOSSIER_CARDS: PfaDossierCardDef[] = [
  {
    id: "rezervare-denumire",
    title: "Rezervare denumire PFA",
    description: "Cerere de verificare disponibilitate și rezervare denumire (ONRC).",
    kind: "acroform",
    templateId: "rezervare-denumire-24940",
    submission: ONRC_SUBMISSION,
  },
  {
    id: "cerere-inregistrare",
    title: "Cerere înregistrare PFA",
    description:
      "PDF-ul oficial eDirect nu are câmpuri editabile — generăm un draft structurat din datele tale.",
    kind: "generated_pdf",
    submission: ONRC_SUBMISSION,
  },
  {
    id: "declaratie-propria-raspundere",
    title: "Declarație pe propria răspundere",
    description: "Formular tip ONRC privind îndeplinirea condițiilor legale.",
    kind: "acroform",
    templateId: "declaratie-propria-raspundere",
    submission: ONRC_SUBMISSION,
  },
  {
    id: "act-identitate",
    title: "Act de identitate al solicitantului",
    description: "Copie CI — se atașează la dosarul ONRC (nu se completează ca PDF).",
    kind: "attach",
    attachType: "ci",
    submission: ONRC_SUBMISSION,
  },
  {
    id: "dovada-sediu",
    title: "Dovadă sediu profesional",
    description: "Contract comodat/închiriere, extras CF sau titlu proprietate.",
    kind: "attach",
    attachType: "sediu",
    submission: ONRC_SUBMISSION,
  },
  {
    id: "specimen-semnatura",
    title: "Specimen de semnătură",
    description: "Se obține la notar sau la ghișeul ONRC — nu se poate genera digital aici.",
    kind: "checklist",
    submission: {
      institution: "Notar / ONRC",
      channels: [
        { label: "Notar public", url: "https://www.google.com/maps/search/notar" },
        { label: "Ghișeu ONRC", url: "https://www.onrc.ro" },
      ],
    },
  },
  {
    id: "dovada-calificare",
    title: "Dovadă calificare profesională",
    description: "Doar dacă codul CAEN o impune (diplomă, atestat).",
    kind: "attach",
    attachType: "diploma",
    submission: ONRC_SUBMISSION,
  },
];

export function loadPfaTemplate(templateId: string): PfaFormTemplate | undefined {
  const raw = PFA_FORM_TEMPLATES[templateId];
  if (!raw) return undefined;
  return {
    ...raw,
    fields: applyLabelsToTemplateFields(templateId, raw.fields),
    fieldSources: { ...PFA_FIELD_SOURCES[templateId], ...raw.fieldSources },
  };
}

export async function loadPfaPdfBytes(pdfFileName: string): Promise<ArrayBuffer> {
  const res = await fetch(`/forms/pfa/${pdfFileName}`);
  if (!res.ok) throw new Error(`Nu am putut încărca ${pdfFileName}`);
  return res.arrayBuffer();
}

export function getDossierCard(cardId: string): PfaDossierCardDef | undefined {
  return PFA_DOSSIER_CARDS.find((c) => c.id === cardId);
}

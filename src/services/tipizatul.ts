// Curated links into [Tipizatul.eu](https://www.tipizatul.eu/) — open-source Romanian
// government forms fillable in-browser. Procedure IDs come from tipizatul.eu/procedures.json.

export const TIPIZATUL_BASE = "https://www.tipizatul.eu";

export type TipizatulFormLink = {
  /** eDirect / Tipizatul procedure id */
  procedureId: string;
  label: string;
  title: string;
};

/** Forms relevant to each ActeAI workflow id. */
export const WORKFLOW_TIPIZATUL_FORMS: Record<string, TipizatulFormLink[]> = {
  "pfa-registration": [
    {
      procedureId: "24940",
      label: "Rezervare denumire PFA",
      title: "Rezervare denumire firmă PFA/II/IF",
    },
    {
      procedureId: "24952",
      label: "Cerere înregistrare PFA",
      title: "Înregistrare PFA/II/IF",
    },
  ],
  "property-sale": [
    {
      procedureId: "25882",
      label: "Declarație acte defunct",
      title: "Declarație lipsă certificat naștere/casătorie defunct",
    },
  ],
  "id-change-relocation": [
    {
      procedureId: "26022",
      label: "CI — schimbare domiciliu",
      title: "Eliberarea cărții de identitate la schimbarea domiciliului",
    },
    {
      procedureId: "25629",
      label: "CI — eliberare",
      title: "Procedura privind eliberarea cărții de identitate",
    },
  ],
  "renew-driver-license": [
    {
      procedureId: "25629",
      label: "CI — eliberare",
      title: "Procedura privind eliberarea cărții de identitate",
    },
  ],
  "passport-issuance": [
    {
      procedureId: "25629",
      label: "CI — eliberare",
      title: "Procedura privind eliberarea cărții de identitate",
    },
  ],
  "anaf-declaration": [
    {
      procedureId: "26045",
      label: "Declarație fiscală persoane fizice",
      title: "Procedura privind declarația fiscală / decizia de impunere",
    },
    {
      procedureId: "26047",
      label: "Declarație fiscală PF",
      title: "Declarația fiscală / decizia de impunere persoane fizice",
    },
  ],
  "anaf-declaratie-unica": [
    {
      procedureId: "26045",
      label: "Declarație fiscală",
      title: "Declarația fiscală pentru persoane fizice",
    },
  ],
  "car-registration-2nd-hand": [
    {
      procedureId: "25734",
      label: "Înmatriculare vehicul",
      title: "Înregistrarea vehiculelor care nu se supun înmatriculării",
    },
  ],
  "vanzare-auto": [
    {
      procedureId: "25734",
      label: "Înmatriculare vehicul",
      title: "Înregistrarea vehiculelor",
    },
  ],
  "birth-certificate": [
    {
      procedureId: "26006",
      label: "Transcriere naștere",
      title: "SPCLEP — acte de stare civilă transcrise — naștere",
    },
  ],
  "civil-marriage": [
    {
      procedureId: "25898",
      label: "Cerere oficiere căsătorie",
      title: "Cerere oficiere căsătorie înainte / după termenul legal",
    },
    {
      procedureId: "26007",
      label: "Transcriere căsătorie",
      title: "SPCLEP — acte de stare civilă transcrise — căsătorie",
    },
  ],
  "cadastral-registration": [
    {
      procedureId: "25748",
      label: "Adeverință rol agricol",
      title: "Adeverință rol agricol cu modificări prin cerere/declarație tip",
    },
  ],
};

export function tipizatulBrowseUrl(): string {
  return `${TIPIZATUL_BASE}/proceduri`;
}

export function tipizatulProcedureUrl(procedureId: string): string {
  return `${TIPIZATUL_BASE}/procedura/${procedureId}`;
}

export function tipizatulFormsForWorkflow(workflowId: string): TipizatulFormLink[] {
  return WORKFLOW_TIPIZATUL_FORMS[workflowId] ?? [];
}

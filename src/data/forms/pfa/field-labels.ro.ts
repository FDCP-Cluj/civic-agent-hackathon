export type FieldLabelMeta = {
  label: string;
  hint?: string;
  group?: string;
  /** CAEN matrix / secondary rows — collapsed until expanded */
  collapsible?: boolean;
};

const DECLARATIE_EXACT: Record<string, FieldLabelMeta> = {
  SubNume: { label: "Nume titular", group: "Date titular" },
  SubPrenume: { label: "Prenume titular", group: "Date titular" },
  SubCNP: { label: "CNP", group: "Date titular", hint: "13 cifre" },
  SubCalitate: { label: "Calitate", group: "Date titular" },
  SubCetatenia: { label: "Cetățenie", group: "Date titular" },
  SubTara: { label: "Țara domiciliu", group: "Date titular" },
  SubLocalitatea: { label: "Localitate domiciliu", group: "Date titular" },
  SubJudSect: { label: "Județ / sector domiciliu", group: "Date titular" },
  SubStrada: { label: "Stradă domiciliu", group: "Date titular" },
  SubNr: { label: "Număr domiciliu", group: "Date titular" },
  SubBl: { label: "Bloc", group: "Date titular" },
  SubSc: { label: "Scara", group: "Date titular" },
  SubEt: { label: "Etaj", group: "Date titular" },
  SubAp: { label: "Apartament", group: "Date titular" },
  SubTipActIdent: { label: "Tip act identitate", group: "Act identitate" },
  SubSerieActIdent: { label: "Serie CI", group: "Act identitate" },
  SubNrActIdent: { label: "Număr CI", group: "Act identitate" },
  SubEmisActIdent: { label: "Emis de", group: "Act identitate" },
  SubEmisActIdentLaData: { label: "Data emiterii CI", group: "Act identitate" },
  SubEmisActIdentPanaData: { label: "Valabil până la", group: "Act identitate" },
  SubNData: { label: "Data nașterii", group: "Date titular" },
  SubNLocalitatea: { label: "Localitate naștere", group: "Date titular" },
  SubNSectJud: { label: "Județ naștere", group: "Date titular" },
  SubNTara: { label: "Țara nașterii", group: "Date titular" },
  InmFirma: { label: "Denumire PFA / firmă", group: "Sediu profesional" },
  InmLocalitatea: { label: "Localitate sediu", group: "Sediu profesional" },
  InmJudSect: { label: "Județ / sector sediu", group: "Sediu profesional" },
  InmStrada: { label: "Stradă sediu", group: "Sediu profesional" },
  InmNr: { label: "Număr sediu", group: "Sediu profesional" },
  InmBl: { label: "Bloc sediu", group: "Sediu profesional" },
  InmSc: { label: "Scara sediu", group: "Sediu profesional" },
  InmEt: { label: "Etaj sediu", group: "Sediu profesional" },
  InmAp: { label: "Apartament sediu", group: "Sediu profesional" },
  InmTel: { label: "Telefon sediu", group: "Contact" },
  InmEmail: { label: "E-mail sediu", group: "Contact" },
  InmSite: { label: "Site web", group: "Contact" },
  DataCerere: { label: "Data cererii", group: "General" },
  TRIBUNALUL: { label: "Tribunal / instanță", group: "General" },
};

/** Curated labels for rezervare denumire (top fields — rest use Text{N} heuristic). */
const REZERVARE_EXACT: Record<string, FieldLabelMeta> = {
  Text1: { label: "Oficiu ORCT / Tribunal", group: "Instituție" },
  Text2: { label: "Nume solicitant", group: "Date solicitant" },
  Text3: { label: "Prenume solicitant", group: "Date solicitant" },
  Text4: { label: "CNP / NIF", group: "Date solicitant", hint: "13 cifre" },
  Text5: { label: "Localitate domiciliu", group: "Adresă domiciliu" },
  Text6: { label: "Stradă domiciliu", group: "Adresă domiciliu" },
  Text7: { label: "Bloc", group: "Adresă domiciliu" },
  Text8: { label: "Scara", group: "Adresă domiciliu" },
  Text9: { label: "Număr", group: "Adresă domiciliu" },
  Text10: { label: "Etaj", group: "Adresă domiciliu" },
  Text11: { label: "Apartament", group: "Adresă domiciliu" },
  Text12: { label: "Județ / sector domiciliu", group: "Adresă domiciliu" },
  Text13: { label: "Țară domiciliu", group: "Adresă domiciliu" },
  Text14: { label: "Cetățenie", group: "Date personale" },
  Text15: { label: "Localitate naștere", group: "Date personale" },
  Text16: { label: "Județ / sector naștere", group: "Date personale" },
  Text17: { label: "Țară naștere", group: "Date personale" },
  Text18: { label: "Data nașterii", group: "Date personale" },
  Text46: { label: "Telefon (persoană comunicare)", group: "Contact", collapsible: true },
  Text47: { label: "E-mail (persoană comunicare)", group: "Contact", collapsible: true },
  CheckBox1: {
    label: "Opțiune formular (secțiunea I)",
    group: "Denumire rezervată",
    collapsible: true,
    hint: "Bifează direct în PDF dacă e cazul",
  },
  CheckBox1_2: {
    label: "Opțiune formular (secțiunea I) — 2",
    group: "Denumire rezervată",
    collapsible: true,
    hint: "Bifează direct în PDF dacă e cazul",
  },
  Text19: { label: "Tip act identitate", group: "Act identitate" },
  Text20: { label: "Serie CI", group: "Act identitate" },
  Text21: { label: "Număr CI", group: "Act identitate" },
  Text22: { label: "Emis de", group: "Act identitate" },
  Text23: { label: "Data emiterii CI", group: "Act identitate" },
  Text24: { label: "Valabil până la", group: "Act identitate" },
  Text68: { label: "Denumire firmă propusă", group: "Denumire rezervată" },
  Text69: { label: "Denumire alternativă", group: "Denumire rezervată", collapsible: true },
};

const TEMPLATE_OVERRIDES: Record<string, Record<string, FieldLabelMeta>> = {
  "declaratie-propria-raspundere": DECLARATIE_EXACT,
  "rezervare-denumire-24940": REZERVARE_EXACT,
};

function matchCaenField(name: string): FieldLabelMeta | null {
  const code = /^clasa_caen\.(\d+)\.(\d+)$/.exec(name);
  if (code) {
    const row = Number(code[1]) + 1;
    const col = Number(code[2]) + 1;
    return {
      label: `Cod CAEN — activitate ${row}, cifra ${col}`,
      group: row === 1 ? "Activitate CAEN principală" : "Activități CAEN secundare",
      collapsible: row > 1,
      hint: "Vezi caseta corespunzătoare în PDF",
    };
  }
  const desc = /^clasa_caen_desc\.(\d+)\.(\d+)$/.exec(name);
  if (desc) {
    const row = Number(desc[1]) + 1;
    return {
      label: `Descriere activitate CAEN ${row}`,
      group: row === 1 ? "Activitate CAEN principală" : "Activități CAEN secundare",
      collapsible: true,
      hint: "Completează manual dacă e necesar",
    };
  }
  const sedCaen = /^sedii_sec_caen\.(\d+)\.(\d+)$/.exec(name);
  if (sedCaen) {
    return {
      label: `Sediu secundar — cod CAEN ${Number(sedCaen[2]) + 1}`,
      group: "Sedii secundare",
      collapsible: true,
    };
  }
  const sedDesc = /^sedii_sec_caen_desc\.(\d+)\.(\d+)$/.exec(name);
  if (sedDesc) {
    return {
      label: `Sediu secundar — descriere CAEN ${Number(sedDesc[2]) + 1}`,
      group: "Sedii secundare",
      collapsible: true,
    };
  }
  const sedAdr = /^sedii_sec_adresa\.(\d+)\.(\d+)$/.exec(name);
  if (sedAdr) {
    return {
      label: `Sediu secundar — adresă ${Number(sedAdr[2]) + 1}`,
      group: "Sedii secundare",
      collapsible: true,
    };
  }
  const nrCrt = /^nr_crt\.(\d+)\.(\d+)$/.exec(name);
  if (nrCrt) {
    return {
      label: `Nr. crt. activitate ${Number(nrCrt[2]) + 1}`,
      group: "Activitate CAEN principală",
      collapsible: Number(nrCrt[2]) > 0,
    };
  }
  return null;
}

function matchTextField(name: string): FieldLabelMeta | null {
  const m = /^Text(\d+)$/.exec(name);
  if (!m) return null;
  const n = m[1];
  return {
    label: `Câmp ${n} (vezi poziția în PDF)`,
    group: "Alte câmpuri",
    hint: "Completează conform etichetei de pe formularul din dreapta",
    collapsible: Number(n) > 18,
  };
}

export function resolveFieldLabel(
  templateId: string,
  pdfFieldName: string,
): FieldLabelMeta {
  const exact = TEMPLATE_OVERRIDES[templateId]?.[pdfFieldName];
  if (exact) return exact;

  const caen = matchCaenField(pdfFieldName);
  if (caen) return caen;

  const text = matchTextField(pdfFieldName);
  if (text) return text;

  if (/^nr\d+$/.test(pdfFieldName)) {
    return { label: `Număr ${pdfFieldName}`, group: "Altele", collapsible: true };
  }
  if (/^[1-4]$/.test(pdfFieldName)) {
    return { label: `Opțiune ${pdfFieldName}`, group: "General" };
  }

  return {
    label: pdfFieldName.replace(/_/g, " ").replace(/\./g, " · "),
    group: "Altele",
  };
}

export function isCollapsibleField(templateId: string, pdfFieldName: string): boolean {
  return resolveFieldLabel(templateId, pdfFieldName).collapsible === true;
}

export function applyLabelsToTemplateFields<
  T extends { pdfFieldName: string; label: string; hint?: string; group?: string },
>(templateId: string, fields: T[]): T[] {
  return fields.map((f) => {
    const meta = resolveFieldLabel(templateId, f.pdfFieldName);
    return {
      ...f,
      label: meta.label,
      hint: meta.hint ?? f.hint ?? "",
      group: meta.group ?? f.group ?? "General",
    };
  });
}

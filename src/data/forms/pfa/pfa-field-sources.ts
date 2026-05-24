import type { FieldSourcePath } from "@/services/forms/types";

/**
 * Exact vault/dossier → PDF field bindings (verified against ONRC PDF layout).
 * Heuristics are not used when a binding exists here.
 */
export const PFA_FIELD_SOURCES: Record<string, Record<string, FieldSourcePath>> = {
  "rezervare-denumire-24940": {
    Text1: "vault.orctOffice",
    Text2: "vault.lastName",
    Text3: "vault.firstName",
    Text4: "vault.cnp",
    Text5: "vault.address.locality",
    Text6: "vault.address.street",
    Text7: "vault.address.streetNumber",
    Text8: "vault.address.block",
    Text9: "vault.address.stair",
    Text10: "vault.address.floor",
    Text11: "vault.address.apartment",
    Text12: "vault.address.county",
    Text13: "vault.address.country",
    Text14: "vault.citizenship",
    Text15: "vault.birthLocality",
    Text16: "vault.birthCounty",
    Text17: "vault.birthCountry",
    Text18: "vault.birthDate",
    Text46: "vault.phone",
    Text47: "vault.email",
    Text19: "vault.idCardType",
    Text20: "vault.idCardSeries",
    Text21: "vault.idCardNumber",
    Text22: "vault.idCardIssuedBy",
    Text23: "vault.idCardIssueDate",
    Text24: "vault.idCardExpiryDate",
    Text68: "dossier.denumirePfa",
    Text69: "dossier.denumirePfaAlt",
  },
  "declaratie-propria-raspundere": {
    SubNume: "vault.lastName",
    SubPrenume: "vault.firstName",
    SubCNP: "vault.cnp",
    SubLocalitatea: "vault.address.locality",
    SubStrada: "vault.address.street",
    SubNr: "vault.address.streetNumber",
    SubBl: "vault.address.block",
    SubSc: "vault.address.stair",
    SubEt: "vault.address.floor",
    SubAp: "vault.address.apartment",
    SubJudSect: "vault.address.county",
    SubTara: "vault.address.country",
    SubCetatenia: "vault.citizenship",
    SubNData: "vault.birthDate",
    SubNLocalitatea: "vault.birthLocality",
    SubNSectJud: "vault.birthCounty",
    SubNTara: "vault.birthCountry",
    SubTipActIdent: "vault.idCardType",
    SubSerieActIdent: "vault.idCardSeries",
    SubNrActIdent: "vault.idCardNumber",
    SubEmisActIdent: "vault.idCardIssuedBy",
    SubEmisActIdentLaData: "vault.idCardIssueDate",
    SubEmisActIdentPanaData: "vault.idCardExpiryDate",
    InmFirma: "dossier.denumirePfa",
    InmLocalitatea: "dossier.sediu.locality",
    InmStrada: "dossier.sediu.street",
    InmNr: "dossier.sediu.streetNumber",
    InmBl: "dossier.sediu.block",
    InmSc: "dossier.sediu.stair",
    InmEt: "dossier.sediu.floor",
    InmAp: "dossier.sediu.apartment",
    InmJudSect: "dossier.sediu.county",
    InmTel: "vault.phone",
    InmEmail: "vault.email",
  },
};

/** Fields that must never receive autofill (matrix / optional sections). */
export function isUiHiddenField(templateId: string, pdfFieldName: string): boolean {
  if (templateId === "rezervare-denumire-24940" && /^CheckBox/i.test(pdfFieldName)) {
    return true;
  }
  return false;
}

export function isAutofillBlockedField(pdfFieldName: string): boolean {
  if (/^CheckBox/i.test(pdfFieldName)) return true;
  if (pdfFieldName.startsWith("sedii_sec_")) return true;
  const caenRow = /^clasa_caen\.(\d+)\./.exec(pdfFieldName);
  if (caenRow && Number(caenRow[1]) > 0) return true;
  const caenDescRow = /^clasa_caen_desc\.(\d+)\./.exec(pdfFieldName);
  if (caenDescRow && Number(caenDescRow[1]) > 0) return true;
  const nrCrt = /^nr_crt\.(\d+)\./.exec(pdfFieldName);
  if (nrCrt && Number(nrCrt[1]) > 0) return true;
  return false;
}

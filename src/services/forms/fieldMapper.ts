import { PFA_FIELD_SOURCES, isAutofillBlockedField } from "@/data/forms/pfa/pfa-field-sources";
import { parseRomanianAddress, type StructuredAddress } from "@/lib/address";
import type { VaultProfile } from "@/store/vault";
import { splitRomanianFullName } from "@/store/vault";
import type { PfaDossierState } from "@/store/pfaDossier";
import type { FieldSourcePath, FormValues, PfaFormTemplate } from "./types";

export type FieldMapperResult = {
  values: FormValues;
  confidence: number;
  lowConfidenceFields: string[];
  filledCount: number;
};

function parseSediuAddress(dossier: PfaDossierState): StructuredAddress {
  const raw = dossier.sediuProfesional?.trim() || "";
  if (!raw) return parseRomanianAddress("");
  return parseRomanianAddress(raw);
}

function getByPath(
  path: FieldSourcePath,
  vault: VaultProfile,
  dossier: PfaDossierState,
): string | undefined {
  const sediu = parseSediuAddress(dossier);

  if (path.startsWith("vault.address.")) {
    const key = path.replace("vault.address.", "") as keyof StructuredAddress;
    const v = vault.addressParts[key];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  }

  if (path.startsWith("dossier.sediu.")) {
    const key = path.replace("dossier.sediu.", "") as keyof StructuredAddress;
    const v = sediu[key];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  }

  if (path === "vault.lastName") {
    return vault.lastName.trim() || splitRomanianFullName(vault.fullName).lastName || undefined;
  }
  if (path === "vault.firstName") {
    return vault.firstName.trim() || splitRomanianFullName(vault.fullName).firstName || undefined;
  }

  if (path === "dossier.denumirePfaAlt") {
    return undefined;
  }

  const [root, key] = path.split(".") as [string, string];
  if (root === "vault") {
    const val = vault[key as keyof VaultProfile];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  if (root === "dossier") {
    const val = dossier[key as keyof PfaDossierState];
    if (typeof val === "string" && val.trim()) return val.trim();
    if (Array.isArray(val) && val.length) return val.join(", ");
  }
  return undefined;
}

function fillCaenDigit(pdfFieldName: string, codCaen: string): string | undefined {
  const codeMatch = /^clasa_caen\.(\d+)\.(\d+)$/.exec(pdfFieldName);
  if (!codeMatch) return undefined;
  const row = Number(codeMatch[1]);
  const col = Number(codeMatch[2]);
  if (row !== 0) return undefined;
  const code = codCaen.replace(/\D/g, "");
  return code[col] ?? undefined;
}

export function mapVaultToFormValues(
  template: PfaFormTemplate,
  vault: VaultProfile,
  dossier: PfaDossierState,
  existingDraft?: FormValues,
): FieldMapperResult {
  const values: FormValues = { ...existingDraft };
  const lowConfidenceFields: string[] = [];
  let filled = 0;
  let confidenceSum = 0;

  const bindings = {
    ...PFA_FIELD_SOURCES[template.id],
    ...template.fieldSources,
  };

  const visible = template.fields.filter((f) => !f.hidden && f.type !== "unsupported");
  const codCaen = dossier.codCaenPrincipal?.trim() ?? "";

  for (const field of visible) {
    if (
      values[field.pdfFieldName] !== undefined &&
      values[field.pdfFieldName] !== "" &&
      values[field.pdfFieldName] !== false
    ) {
      continue;
    }

    if (isAutofillBlockedField(field.pdfFieldName)) {
      continue;
    }

    const caenVal = fillCaenDigit(field.pdfFieldName, codCaen);
    if (caenVal !== undefined) {
      values[field.pdfFieldName] = caenVal;
      filled += 1;
      confidenceSum += 0.85;
      continue;
    }

    const source = bindings[field.pdfFieldName];
    if (source) {
      const v = getByPath(source, vault, dossier);
      if (v) {
        values[field.pdfFieldName] = v;
        filled += 1;
        confidenceSum += 0.95;
        continue;
      }
      if (field.isRequired) lowConfidenceFields.push(field.pdfFieldName);
      continue;
    }
  }

  const confidence = filled > 0 ? confidenceSum / filled : 0;

  return {
    values,
    confidence,
    lowConfidenceFields,
    filledCount: filled,
  };
}

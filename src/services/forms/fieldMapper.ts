import type { VaultProfile } from "@/store/vault";
import type { PfaDossierState } from "@/store/pfaDossier";
import type { FieldSourcePath, FormValues, PfaFormTemplate } from "./types";

export type FieldMapperResult = {
  values: FormValues;
  confidence: number;
  lowConfidenceFields: string[];
  filledCount: number;
};

function splitRomanianName(fullName: string): { lastName: string; firstName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { lastName: "", firstName: "" };
  if (parts.length === 1) return { lastName: parts[0], firstName: "" };
  return { lastName: parts[0], firstName: parts.slice(1).join(" ") };
}

const HEURISTIC_RULES: Array<{
  test: (label: string, name: string) => boolean;
  resolve: (vault: VaultProfile, dossier: PfaDossierState) => string | undefined;
  confidence: number;
}> = [
  {
    test: (_l, n) => n === "subcnp" || n.endsWith("cnp"),
    resolve: (v) => v.cnp || undefined,
    confidence: 0.98,
  },
  {
    test: (_l, n) =>
      n === "subnume" || /^nume$/i.test(n) || (n.endsWith("nume") && !/prenume/i.test(n)),
    resolve: (v) => splitRomanianName(v.fullName).lastName || undefined,
    confidence: 0.88,
  },
  {
    test: (_l, n) => n === "subprenume" || /prenume/i.test(n),
    resolve: (v) => splitRomanianName(v.fullName).firstName || undefined,
    confidence: 0.88,
  },
  {
    test: (l, n) => /cnp/i.test(l) || /cnp/i.test(n),
    resolve: (v) => v.cnp || undefined,
    confidence: 0.95,
  },
  {
    test: (l, n) =>
      /nume.*prenume|numele.*titular|subsemnat/i.test(l) ||
      (/nume/i.test(l) && /prenume/i.test(l)) ||
      /nume_complet/i.test(n),
    resolve: (v) => v.fullName || undefined,
    confidence: 0.9,
  },
  {
    test: (l, n) => /adres|domiciliu|sediu/i.test(l) || /address/i.test(n),
    resolve: (v, d) => d.sediuProfesional || v.address || undefined,
    confidence: 0.75,
  },
  {
    test: (l, n) => /telefon|phone|mobil/i.test(l) || /tel/i.test(n),
    resolve: (v) => v.phone || undefined,
    confidence: 0.85,
  },
  {
    test: (l, n) => /e-?mail|email/i.test(l),
    resolve: (v) => v.email || undefined,
    confidence: 0.85,
  },
  {
    test: (l, n) => /data.*naster|nascut/i.test(l),
    resolve: (v) => v.birthDate || undefined,
    confidence: 0.8,
  },
  {
    test: (l, n) => /caen|cod.*activitate/i.test(l),
    resolve: (_, d) => d.codCaenPrincipal || undefined,
    confidence: 0.8,
  },
  {
    test: (l, n) => /denumire|firma|pfa/i.test(l) && !/rezerv/i.test(l),
    resolve: (_, d) => d.denumirePfa || undefined,
    confidence: 0.7,
  },
  {
    test: (l, n) => /activitate|obiect/i.test(l),
    resolve: (_, d) => d.activitateDescriere || undefined,
    confidence: 0.65,
  },
];

function resolveSource(
  path: FieldSourcePath,
  vault: VaultProfile,
  dossier: PfaDossierState,
): string | undefined {
  const [root, key] = path.split(".") as [string, string];
  if (root === "vault") {
    const val = vault[key as keyof VaultProfile];
    return typeof val === "string" && val.trim() ? val.trim() : undefined;
  }
  if (root === "dossier") {
    const val = dossier[key as keyof PfaDossierState];
    if (typeof val === "string" && val.trim()) return val.trim();
    if (Array.isArray(val) && val.length) return val.join(", ");
  }
  return undefined;
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

  const visible = template.fields.filter((f) => !f.hidden && f.type !== "unsupported");

  for (const field of visible) {
    if (
      values[field.pdfFieldName] !== undefined &&
      values[field.pdfFieldName] !== "" &&
      values[field.pdfFieldName] !== false
    ) {
      continue;
    }

    const explicit = template.fieldSources?.[field.pdfFieldName];
    if (explicit) {
      const v = resolveSource(explicit, vault, dossier);
      if (v) {
        values[field.pdfFieldName] = v;
        filled += 1;
        confidenceSum += 0.95;
        continue;
      }
    }

    const label = field.label.toLowerCase();
    const name = field.pdfFieldName.toLowerCase();
    let matched = false;

    for (const rule of HEURISTIC_RULES) {
      if (!rule.test(label, name)) continue;
      const v = rule.resolve(vault, dossier);
      if (!v) continue;
      values[field.pdfFieldName] = v;
      filled += 1;
      confidenceSum += rule.confidence;
      if (rule.confidence < 0.8) lowConfidenceFields.push(field.pdfFieldName);
      matched = true;
      break;
    }

    if (!matched && field.isRequired) {
      lowConfidenceFields.push(field.pdfFieldName);
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

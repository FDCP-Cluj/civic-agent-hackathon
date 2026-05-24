import { CLASSIFIED_TYPE_LABELS_RO } from "./config";
import type { ClassifiedDocumentType, DocumentValidationResult, ExtractedFields } from "./types";

export type ScanKeyField = { label: string; value: string };

export function keyFieldsFromExtracted(fields: ExtractedFields | undefined): ScanKeyField[] {
  if (!fields) return [];
  const rows: ScanKeyField[] = [];
  const push = (label: string, value: string | null | undefined) => {
    const v = value?.trim();
    if (v) rows.push({ label, value: v });
  };

  const fullName = [fields.firstName, fields.lastName].filter(Boolean).join(" ");
  push("Nume complet", fullName);
  push("Prenume", fields.firstName);
  push("Nume", fields.lastName);
  push("CNP", fields.cnp);
  push("Data nașterii", fields.birthDate);
  push("Serie CI", fields.idCardSeries);
  push("Număr CI", fields.idCardNumber);
  push("Adresă", fields.address);
  push("Stradă", fields.addressStreet);
  push("Nr. stradă", fields.addressNumber);
  push("Scara", fields.addressStair);
  push("Etaj", fields.addressFloor);
  push("Apartament", fields.addressApartment);
  push("Localitate", fields.addressLocality);
  push("Județ", fields.addressCounty);
  push("Emis de", fields.idCardIssuedBy);
  push("Valabil până la", fields.expiryDate);
  push("Sumă", fields.amount);
  push("Termen", fields.dueDate);
  push("IBAN", fields.iban);
  push("Cod fiscal", fields.fiscalCode);
  push("Nr. auto", fields.vehiclePlate);

  return rows;
}

export function buildScanExplanation(
  validation: DocumentValidationResult | null,
  editedType: ClassifiedDocumentType,
  ocrError?: string,
): string {
  if (ocrError) {
    return `Citirea automată nu a reușit: ${ocrError} Poți completa manual câmpurile de mai jos sau încerca o fotografie mai clară (lumină uniformă, fără reflexii).`;
  }

  if (!validation) {
    return "Nu am putut finaliza analiza. Încearcă JPG/PNG sau un PDF cu text lizibil pe prima pagină.";
  }

  const typeLabel = CLASSIFIED_TYPE_LABELS_RO[editedType] ?? "document";
  const hasText = Boolean(validation.rawText?.trim());
  const keys = keyFieldsFromExtracted(validation.extractedFields);

  if (!hasText) {
    return `Am procesat fișierul, dar OCR-ul nu a găsit text lizibil. Verifică că documentul este drept, bine luminat și că nu este doar o copie foarte estompată. Poți completa manual datele pentru ${typeLabel}.`;
  }

  if (validation.success) {
    return `Document identificat ca ${typeLabel}. Am extras ${keys.length} câmpuri relevante — verifică-le și apasă „Salvează în seif” când ești sigur.`;
  }

  if (validation.documentType === "unknown") {
    return `Am citit text din document, dar tipul nu este sigur. ${keys.length > 0 ? `Am găsit ${keys.length} date posibile — corectează-le manual.` : "Completează manual tipul și câmpurile."}`;
  }

  return `Pare a fi ${CLASSIFIED_TYPE_LABELS_RO[validation.documentType]}. Calitatea sau încrederea sunt sub pragul pentru autofill automat, dar poți folosi datele extrase după verificare (${keys.length} câmpuri detectate).`;
}

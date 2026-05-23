import { PDFDocument } from "pdf-lib";
import { embedRomanianFonts } from "@/services/pdf/fonts";
import type { FormValues, PfaFormTemplate } from "./types";

export type FillPdfOptions = {
  /** Keep AcroForm fields editable (live preview / Doar PDF). Default false for download. */
  skipFlatten?: boolean;
};

function hasFilledValues(values: FormValues): boolean {
  return Object.values(values).some(
    (v) => v !== undefined && v !== null && v !== "" && v !== false,
  );
}

export async function fillPdf(
  template: PfaFormTemplate,
  pdfBytes: ArrayBuffer,
  values: FormValues,
  options?: FillPdfOptions,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const visibleFields = template.fields.filter((f) => !f.hidden);

  if (!hasFilledValues(values)) {
    return pdfDoc.save();
  }

  const { regular: font } = await embedRomanianFonts(pdfDoc);

  for (const fieldDef of visibleFields) {
    const rawValue = values[fieldDef.pdfFieldName];
    if (rawValue === undefined || rawValue === null || rawValue === "") continue;

    try {
      switch (fieldDef.type) {
        case "text": {
          const tf = form.getTextField(fieldDef.pdfFieldName);
          tf.setText(String(rawValue));
          tf.updateAppearances(font);
          break;
        }
        case "checkbox": {
          const cb = form.getCheckBox(fieldDef.pdfFieldName);
          if (rawValue === true || rawValue === "true") cb.check();
          else cb.uncheck();
          break;
        }
        case "dropdown": {
          try {
            form.getDropdown(fieldDef.pdfFieldName).select(String(rawValue));
          } catch {
            form.getOptionList(fieldDef.pdfFieldName).select(String(rawValue));
          }
          break;
        }
        case "radio": {
          form.getRadioGroup(fieldDef.pdfFieldName).select(String(rawValue));
          break;
        }
      }
    } catch (err) {
      console.warn(`[pdf-fill] Could not fill field "${fieldDef.pdfFieldName}":`, err);
    }
  }

  if (!options?.skipFlatten) {
    form.flatten();
  }
  return pdfDoc.save();
}

export function triggerPdfDownload(bytes: Uint8Array, fileName: string): void {
  const copy = new Uint8Array(bytes);
  const blob = new Blob([copy], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function fillAndDownload(
  template: PfaFormTemplate,
  pdfBytes: ArrayBuffer,
  values: FormValues,
  fileName?: string,
): Promise<void> {
  const filledBytes = await fillPdf(template, pdfBytes, values);
  triggerPdfDownload(filledBytes, fileName ?? `${template.name}.pdf`);
}

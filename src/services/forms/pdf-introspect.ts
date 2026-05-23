import {
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField,
} from "pdf-lib";
import type { FieldType, TemplateField } from "./types";

export async function introspectPdf(arrayBuffer: ArrayBuffer): Promise<TemplateField[]> {
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const rawFields = form.getFields();
  const fields = rawFields.filter(Boolean);

  const result: TemplateField[] = [];
  let order = 0;

  for (const field of fields) {
    const pdfFieldName = field.getName();

    let type: FieldType = "unsupported";
    let isMultiline = false;
    let maxLength: number | null = null;
    let options: string[] | undefined;

    if (field instanceof PDFTextField) {
      type = "text";
      isMultiline = field.isMultiline();
      maxLength = field.getMaxLength() ?? null;
    } else if (field instanceof PDFCheckBox) {
      type = "checkbox";
    } else if (field instanceof PDFDropdown) {
      type = "dropdown";
      options = field.getOptions();
    } else if (field instanceof PDFOptionList) {
      type = "dropdown";
      options = field.getOptions();
    } else if (field instanceof PDFRadioGroup) {
      type = "radio";
      options = field.getOptions();
    }

    let isReadOnly = false;
    try {
      isReadOnly = field.isReadOnly();
    } catch {
      isReadOnly = true;
    }

    let isRequired = false;
    try {
      isRequired = field.isRequired();
    } catch {
      isRequired = false;
    }

    const hidden = type === "unsupported" || isReadOnly;

    result.push({
      pdfFieldName,
      type,
      label: prettifyFieldName(pdfFieldName),
      hint: "",
      group: "",
      order: order++,
      isRequired,
      isMultiline: isMultiline || undefined,
      maxLength: maxLength ?? undefined,
      options,
      hidden,
    });
  }

  return result;
}

function prettifyFieldName(name: string): string {
  const last = name.split(".").pop() ?? name;
  return last
    .replace(/[_-]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

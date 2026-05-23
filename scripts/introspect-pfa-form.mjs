#!/usr/bin/env node
/**
 * One-time dev script: introspect AcroForm fields in public/forms/pfa/*.pdf
 * and write matching *.template.json files.
 *
 * Usage: node scripts/introspect-pfa-form.mjs
 */
import { readFile, writeFile, readdir } from "node:fs/promises";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField,
} from "pdf-lib";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const formsDir = join(root, "public/forms/pfa");
const dataDir = join(root, "src/data/forms/pfa");

const META = {
  "rezervare-denumire-24940.pdf": {
    id: "rezervare-denumire-24940",
    name: "Cerere rezervare denumire PFA",
    procedureId: "24940",
  },
  "cerere-inregistrare-pfa-24952.pdf": {
    id: "cerere-inregistrare-pfa-24952",
    name: "Cerere înregistrare PFA",
    procedureId: "24952",
  },
  "declaratie-propria-raspundere.pdf": {
    id: "declaratie-propria-raspundere",
    name: "Declarație pe propria răspundere",
    procedureId: "24952",
  },
};

const ONRC_SUBMISSION = {
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

function prettifyFieldName(name) {
  const last = name.split(".").pop() ?? name;
  return last
    .replace(/[_-]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

async function introspectPdf(bytes) {
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const fields = form.getFields().filter(Boolean);
  const result = [];
  let order = 0;

  for (const field of fields) {
    const pdfFieldName = field.getName();
    let type = "unsupported";
    let isMultiline = false;
    let maxLength = null;
    let options;

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
      ...(isMultiline ? { isMultiline: true } : {}),
      ...(maxLength != null ? { maxLength } : {}),
      ...(options ? { options } : {}),
      hidden,
    });
  }

  return result;
}

async function main() {
  const files = (await readdir(formsDir)).filter((f) => f.endsWith(".pdf"));
  if (!files.length) {
    console.error("No PDFs in", formsDir);
    process.exit(1);
  }

  for (const pdfFile of files) {
    const meta = META[pdfFile];
    if (!meta) {
      console.warn("Skip (no meta):", pdfFile);
      continue;
    }
    const pdfPath = join(formsDir, pdfFile);
    const bytes = await readFile(pdfPath);
    const fields = await introspectPdf(bytes);
    const visible = fields.filter((f) => !f.hidden).length;
    console.log(`${pdfFile}: ${fields.length} fields (${visible} visible)`);

    const template = {
      ...meta,
      pdfFileName: pdfFile,
      version: 1,
      createdAt: new Date().toISOString(),
      fields,
      submission: ONRC_SUBMISSION,
      fieldSources: {},
    };

    const jsonName = basename(pdfFile, ".pdf") + ".template.json";
    const jsonBody = JSON.stringify(template, null, 2);
    await writeFile(join(formsDir, jsonName), jsonBody, "utf8");
    await writeFile(join(dataDir, jsonName), jsonBody, "utf8");
    console.log("  →", jsonName, "(public + src/data)");
    console.log("  ℹ Romanian labels applied at runtime via field-labels.ro.ts");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

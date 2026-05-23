// Client-side antecontract (promisiune de vânzare-cumpărare) PDF generator.
// Uses pdf-lib so the document is rendered entirely in the browser — no
// document bytes ever leave the device.
//
// This is a draft template intended for the user to review with a notary
// before signing. We print a clear "DRAFT" notice in the header.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { VaultProfile } from "@/store";

export type AntecontractInput = {
  vanzator: Partial<VaultProfile> & { fullName?: string };
  cumparator: Partial<VaultProfile> & { fullName?: string };
  imobil: {
    adresa: string;
    nrCadastral?: string;
    suprafata?: string;
    tip?: string; // "apartament 3 camere" etc.
  };
  pret: string; // e.g. "85000 EUR"
  arvuna?: string;
  termenAutentificare?: string; // ISO date or natural
};

export async function generateAntecontractPdf(input: AntecontractInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4 portrait, points
  const width = page.getWidth();
  const height = page.getHeight();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Sanitize for WinAnsi: pdf-lib's standard fonts don't support Romanian
  // diacritics. Strip them to ASCII so the PDF renders cleanly without
  // tofu boxes. Real signing requires a notary anyway — they'll re-issue
  // the final contract with full diacritics.
  const ascii = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ș|ş/gi, (m) => (m === m.toUpperCase() ? "S" : "s"))
      .replace(/ț|ţ/gi, (m) => (m === m.toUpperCase() ? "T" : "t"));

  const margin = 50;
  let y = height - margin;
  const lineHeight = 14;

  const text = (s: string, opts: { bold?: boolean; size?: number; indent?: number } = {}) => {
    page.drawText(ascii(s), {
      x: margin + (opts.indent ?? 0),
      y,
      size: opts.size ?? 11,
      font: opts.bold ? bold : font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= opts.size ? opts.size + 4 : lineHeight;
  };

  // Draft watermark
  page.drawRectangle({
    x: 0,
    y: height - 28,
    width,
    height: 28,
    color: rgb(0.97, 0.85, 0.4),
  });
  page.drawText("DRAFT — Pentru revizuire la notar. Nu este un act autentic.", {
    x: margin,
    y: height - 19,
    size: 10,
    font: bold,
    color: rgb(0.15, 0.15, 0.15),
  });
  y -= 40;

  text("ANTECONTRACT DE VANZARE-CUMPARARE", { bold: true, size: 16 });
  text(`Generat de Civis · ${new Date().toLocaleDateString("ro-RO")}`, { size: 9 });
  y -= 6;

  text("PARTI:", { bold: true });
  text("VANZATOR:");
  text(
    `${input.vanzator.fullName ?? "[Nume vanzator]"}, CNP ${input.vanzator.cnp ?? "[CNP]"}, domiciliat in ${input.vanzator.address ?? "[adresa]"}.`,
    { indent: 12 },
  );
  text("CUMPARATOR:");
  text(
    `${input.cumparator.fullName ?? "[Nume cumparator]"}, CNP ${input.cumparator.cnp ?? "[CNP]"}, domiciliat in ${input.cumparator.address ?? "[adresa]"}.`,
    { indent: 12 },
  );
  y -= 6;

  text("OBIECTUL CONTRACTULUI:", { bold: true });
  text(`Imobil ${input.imobil.tip ?? ""} situat in ${input.imobil.adresa}.`);
  if (input.imobil.nrCadastral) text(`Numar cadastral: ${input.imobil.nrCadastral}.`);
  if (input.imobil.suprafata) text(`Suprafata: ${input.imobil.suprafata}.`);
  y -= 6;

  text("PRET SI MODALITATE DE PLATA:", { bold: true });
  text(`Pretul vanzarii: ${input.pret}.`);
  if (input.arvuna) text(`Arvuna achitata la semnarea prezentului antecontract: ${input.arvuna}.`);
  y -= 6;

  text("TERMEN:", { bold: true });
  text(
    `Partile se obliga sa autentifice contractul de vanzare-cumpărare la notar pana la data de ${
      input.termenAutentificare ?? "[data]"
    }.`,
  );
  y -= 6;

  text("CLAUZE STANDARD:", { bold: true });
  text("1. Vanzatorul declara ca imobilul nu este grevat de sarcini, ipoteci sau interdictii.");
  text("2. In caz de neexecutare imputabila cumparatorului, acesta pierde arvuna.");
  text("3. In caz de neexecutare imputabila vanzatorului, acesta restituie arvuna in dublu.");
  text("4. Antecontractul poate fi notat in Cartea Funciara la cererea oricarei parti.");
  y -= 16;

  text("SEMNATURI:", { bold: true });
  y -= 14;
  page.drawText("Vanzator: ____________________", { x: margin, y, size: 11, font });
  page.drawText("Cumparator: ____________________", { x: margin + 280, y, size: 11, font });
  y -= 30;
  page.drawText(`Data: ${new Date().toLocaleDateString("ro-RO")}`, {
    x: margin,
    y,
    size: 11,
    font,
  });

  return await pdf.save();
}

/** Trigger a browser download for the generated PDF. */
export function downloadPdf(bytes: Uint8Array, filename: string): void {
  // Force a fresh ArrayBuffer view so Blob receives an unambiguous BufferSource —
  // some TS targets reject Uint8Array directly under ArrayBufferLike inference.
  const ab = bytes.slice().buffer;
  const blob = new Blob([ab], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

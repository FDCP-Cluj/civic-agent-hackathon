// Client-side antecontract (promisiune de vânzare-cumpărare) PDF generator.
// Uses pdf-lib so the document is rendered entirely in the browser — no
// document bytes ever leave the device.
//
// This is a draft template intended for the user to review with a notary
// before signing. We print a clear "DRAFT" notice in the header.

import { PDFDocument, rgb } from "pdf-lib";
import type { VaultProfile } from "@/store";
import { embedRomanianFonts } from "@/services/pdf/fonts";

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
  const { regular: font, bold } = await embedRomanianFonts(pdf);

  const margin = 50;
  let y = height - margin;
  const lineHeight = 14;

  const text = (s: string, opts: { bold?: boolean; size?: number; indent?: number } = {}) => {
    page.drawText(s, {
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

  text("ANTECONTRACT DE VÂNZARE-CUMPĂRARE", { bold: true, size: 16 });
  text(`Generat de Civis · ${new Date().toLocaleDateString("ro-RO")}`, { size: 9 });
  y -= 6;

  text("PĂRȚI:", { bold: true });
  text("VÂNZĂTOR:");
  text(
    `${input.vanzator.fullName ?? "[Nume vânzător]"}, CNP ${input.vanzator.cnp ?? "[CNP]"}, domiciliat în ${input.vanzator.address ?? "[adresă]"}.`,
    { indent: 12 },
  );
  text("CUMPĂRĂTOR:");
  text(
    `${input.cumparator.fullName ?? "[Nume cumpărător]"}, CNP ${input.cumparator.cnp ?? "[CNP]"}, domiciliat în ${input.cumparator.address ?? "[adresă]"}.`,
    { indent: 12 },
  );
  y -= 6;

  text("OBIECTUL CONTRACTULUI:", { bold: true });
  text(`Imobil ${input.imobil.tip ?? ""} situat în ${input.imobil.adresa}.`);
  if (input.imobil.nrCadastral) text(`Număr cadastral: ${input.imobil.nrCadastral}.`);
  if (input.imobil.suprafata) text(`Suprafață: ${input.imobil.suprafata}.`);
  y -= 6;

  text("PREȚ ȘI MODALITATE DE PLATĂ:", { bold: true });
  text(`Prețul vânzării: ${input.pret}.`);
  if (input.arvuna) text(`Arvuna achitată la semnarea prezentului antecontract: ${input.arvuna}.`);
  y -= 6;

  text("TERMEN:", { bold: true });
  text(
    `Părțile se obligă să autentifice contractul de vânzare-cumpărare la notar până la data de ${
      input.termenAutentificare ?? "[data]"
    }.`,
  );
  y -= 6;

  text("CLAUZE STANDARD:", { bold: true });
  text("1. Vânzătorul declară că imobilul nu este grevat de sarcini, ipoteci sau interdicții.");
  text("2. În caz de neexecutare imputabilă cumpărătorului, acesta pierde arvuna.");
  text("3. În caz de neexecutare imputabilă vânzătorului, acesta restituie arvuna în dublu.");
  text("4. Antecontractul poate fi notat în Cartea Funciară la cererea oricărei părți.");
  y -= 16;

  text("SEMNĂTURI:", { bold: true });
  y -= 14;
  page.drawText("Vânzător: ____________________", { x: margin, y, size: 11, font });
  page.drawText("Cumpărător: ____________________", { x: margin + 280, y, size: 11, font });
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

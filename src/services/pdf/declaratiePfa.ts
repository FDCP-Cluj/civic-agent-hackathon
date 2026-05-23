// Declarația pe propria răspundere — one of the documents required in the
// ONRC PFA registration dossier. This is a draft generator: the actual
// content text is the standard wording most ONRC ORCT offices accept, but
// the registrar may ask for a slightly different phrasing. The final form
// is always signed in front of the notary or ORCT clerk.

import { PDFDocument, rgb } from "pdf-lib";
import type { VaultProfile } from "@/store";
import { embedRomanianFonts } from "@/services/pdf/fonts";

export type DeclaratiePfaInput = {
  profile: Partial<VaultProfile>;
  /** CAEN principal (eg. "6201"). Falls back to a placeholder. */
  codCaen?: string;
  /** Free-form activity description; one or two sentences. */
  descriereActivitate?: string;
  /** Address of the chosen sediu profesional. Defaults to the vault address. */
  sediuProfesional?: string;
  /** Optional "Nu desfășor activitate la sediu" override. */
  doarAdresaAdministrativa?: boolean;
};

export async function generateDeclaratiePfaPdf(input: DeclaratiePfaInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const width = page.getWidth();
  const height = page.getHeight();
  const { regular: font, bold } = await embedRomanianFonts(pdf);

  const margin = 50;
  let y = height - margin;
  const lineHeight = 14;
  const sediu =
    input.sediuProfesional?.trim() ||
    input.profile.address?.trim() ||
    "[adresa sediului profesional]";

  const text = (
    s: string,
    opts: { bold?: boolean; size?: number; indent?: number; gap?: number } = {},
  ) => {
    const size = opts.size ?? 11;
    page.drawText(s, {
      x: margin + (opts.indent ?? 0),
      y,
      size,
      font: opts.bold ? bold : font,
      color: rgb(0.1, 0.1, 0.1),
      maxWidth: width - 2 * margin - (opts.indent ?? 0),
      lineHeight: size + 2,
    });
    y -= opts.gap ?? lineHeight;
  };

  // Header bar
  page.drawRectangle({
    x: 0,
    y: height - 28,
    width,
    height: 28,
    color: rgb(0.97, 0.85, 0.4),
  });
  page.drawText("DRAFT — Pentru depunere la ONRC. Verifică formularea cerută de ORCT-ul tău.", {
    x: margin,
    y: height - 19,
    size: 9,
    font: bold,
    color: rgb(0.15, 0.15, 0.15),
  });
  y -= 50;

  text("DECLARAȚIE PE PROPRIA RĂSPUNDERE", { bold: true, size: 14 });
  text(
    "privind îndeplinirea condițiilor de funcționare prevăzute de legislația specifică în domeniul sanitar, sanitar-veterinar, protecției mediului și protecției muncii",
    { size: 9 },
  );
  text(`Generat de Civis · ${new Date().toLocaleDateString("ro-RO")}`, { size: 9, gap: 22 });

  text("Subsemnatul/Subsemnata,", { size: 11 });
  text(input.profile.fullName ?? "[Numele și prenumele titularului PFA]", {
    bold: true,
    indent: 12,
  });
  text(
    `CNP ${input.profile.cnp ?? "[CNP]"}, domiciliat/ă în ${input.profile.address ?? "[adresă de domiciliu]"},`,
    { indent: 12 },
  );
  text(
    `posesor al actului de identitate seria ____ nr. _________ emis de _________ la data de _________,`,
    { indent: 12 },
  );
  text(
    "în calitate de titular al Persoanei Fizice Autorizate care urmează a fi înregistrată la ORCT,",
    { indent: 12, gap: 22 },
  );

  text("DECLAR PE PROPRIA RĂSPUNDERE,", { bold: true });
  text(
    "cunoscând prevederile art. 326 din Codul Penal privind falsul în declarații, următoarele:",
    { size: 10, gap: 18 },
  );

  text(
    `1. Activitatea principală a PFA va fi: ${
      input.descriereActivitate?.trim() ?? "[descriere scurtă a activității]"
    }`,
  );
  text(`   Cod CAEN principal: ${input.codCaen?.trim() ?? "[cod CAEN]"}.`, { gap: 16 });

  text(`2. Sediul profesional declarat este situat în ${sediu}.`, { gap: 16 });

  if (input.doarAdresaAdministrativa) {
    text(
      "3. La sediul declarat nu se desfășoară activitate. Sediul este folosit exclusiv ca adresă administrativă.",
      { gap: 16 },
    );
  } else {
    text(
      "3. La sediul declarat se desfășoară activitatea autorizată, cu respectarea condițiilor legale aplicabile.",
      { gap: 16 },
    );
  }

  text(
    "4. La data prezentei declarații îndeplinesc toate condițiile prevăzute de legislația specifică în domeniul sanitar, sanitar-veterinar, protecției mediului și protecției muncii pentru activitatea declarată.",
    { gap: 16 },
  );

  text(
    "5. Îmi asum integral răspunderea civilă și penală pentru veridicitatea datelor din prezenta declarație.",
    { gap: 22 },
  );

  // Signature block
  text(`Data: ${new Date().toLocaleDateString("ro-RO")}`, { gap: 26 });
  page.drawText("Semnătura titularului:", { x: margin, y, size: 11, font });
  page.drawLine({
    start: { x: margin + 130, y: y + 4 },
    end: { x: margin + 320, y: y + 4 },
    thickness: 0.7,
    color: rgb(0.2, 0.2, 0.2),
  });

  return await pdf.save();
}

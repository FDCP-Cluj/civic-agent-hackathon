import { PDFDocument, rgb } from "pdf-lib";
import type { VaultProfile } from "@/store";
import type { PfaDossierState } from "@/store/pfaDossier";
import { embedRomanianFonts } from "@/services/pdf/fonts";

export type CererePfaInput = {
  profile: Partial<VaultProfile>;
  dossier: Partial<PfaDossierState>;
};

export async function generateCererePfaPdf(input: CererePfaInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const width = page.getWidth();
  const { regular: font, bold } = await embedRomanianFonts(pdf);
  const margin = 50;
  let y = page.getHeight() - margin;
  const lh = 14;

  const line = (s: string, opts: { bold?: boolean; size?: number; gap?: number } = {}) => {
    const size = opts.size ?? 11;
    page.drawText(s, {
      x: margin,
      y,
      size,
      font: opts.bold ? bold : font,
      color: rgb(0.1, 0.1, 0.1),
      maxWidth: width - 2 * margin,
      lineHeight: size + 2,
    });
    y -= opts.gap ?? lh;
  };

  page.drawRectangle({
    x: 0,
    y: page.getHeight() - 28,
    width,
    height: 28,
    color: rgb(0.97, 0.85, 0.4),
  });
  page.drawText("DRAFT ActeAI — Cerere înregistrare PFA. Verifică la ORCT înainte de depunere.", {
    x: margin,
    y: page.getHeight() - 19,
    size: 9,
    font: bold,
    color: rgb(0.15, 0.15, 0.15),
  });
  y -= 50;

  line("CERERE DE ÎNREGISTRARE", { bold: true, size: 14 });
  line("Persoană Fizică Autorizată (PFA)", { size: 12, gap: 20 });
  line(`Data: ${new Date().toLocaleDateString("ro-RO")}`, { size: 10, gap: 18 });

  line("1. Date solicitant", { bold: true, gap: 16 });
  line(`Nume și prenume: ${input.profile.fullName ?? "[—]"}`);
  line(`CNP: ${input.profile.cnp ?? "[—]"}`);
  line(`Adresă domiciliu: ${input.profile.address ?? "[—]"}`);
  line(`Telefon: ${input.profile.phone ?? "[—]"}`);
  line(`E-mail: ${input.profile.email ?? "[—]"}`, { gap: 18 });

  line("2. Denumire și activitate", { bold: true, gap: 16 });
  line(`Denumire PFA: ${input.dossier.denumirePfa ?? "[—]"}`);
  line(`Cod CAEN principal: ${input.dossier.codCaenPrincipal ?? "[—]"}`);
  line(`Descriere activitate: ${input.dossier.activitateDescriere ?? "[—]"}`, { gap: 18 });

  line("3. Sediu profesional", { bold: true, gap: 16 });
  line(`Adresă sediu: ${input.dossier.sediuProfesional ?? input.profile.address ?? "[—]"}`);
  if (input.dossier.doarAdresaAdministrativa) {
    line("Activitatea nu se desfășoară la sediu (doar adresă administrativă).");
  }
  line("", { gap: 18 });

  line("4. Declarații", { bold: true, gap: 16 });
  line(
    "Subsemnatul declar că datele de mai sus sunt corecte și complete, cunoscând prevederile legale privind falsul în declarații.",
  );
  line("", { gap: 24 });
  line("Semnătura: _________________________", { gap: 8 });
  line(`(${input.profile.fullName ?? "Titular PFA"})`);

  return pdf.save();
}

import fontkit from "@pdf-lib/fontkit";
import type { PDFFont, PDFDocument } from "pdf-lib";

type PdfFontSet = {
  regular: PDFFont;
  bold: PDFFont;
};

let cachedBytes: { regular: ArrayBuffer; bold: ArrayBuffer } | null = null;

async function loadFontBytes(): Promise<{ regular: ArrayBuffer; bold: ArrayBuffer }> {
  if (cachedBytes) return cachedBytes;
  const [regularRes, boldRes] = await Promise.all([
    fetch("/fonts/NotoSans-Regular.ttf"),
    fetch("/fonts/NotoSans-Bold.ttf"),
  ]);
  if (!regularRes.ok || !boldRes.ok) {
    throw new Error("Nu am putut încărca fonturile Noto Sans pentru PDF.");
  }
  const [regular, bold] = await Promise.all([regularRes.arrayBuffer(), boldRes.arrayBuffer()]);
  cachedBytes = { regular, bold };
  return cachedBytes;
}

export async function embedRomanianFonts(pdf: PDFDocument): Promise<PdfFontSet> {
  pdf.registerFontkit(fontkit);
  const { regular: regularBytes, bold: boldBytes } = await loadFontBytes();

  const [regular, bold] = await Promise.all([
    pdf.embedFont(regularBytes, { subset: true }),
    pdf.embedFont(boldBytes, { subset: true }),
  ]);

  return { regular, bold };
}

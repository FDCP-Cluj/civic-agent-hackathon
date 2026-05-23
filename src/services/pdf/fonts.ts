import fontkit from "@pdf-lib/fontkit";
import type { PDFFont, PDFDocument } from "pdf-lib";
import notoSansBoldUrl from "@fontsource/noto-sans/files/noto-sans-latin-ext-700-normal.woff?url";
import notoSansRegularUrl from "@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff?url";

type PdfFontSet = {
  regular: PDFFont;
  bold: PDFFont;
};

async function fetchFontBytes(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font load failed (${res.status})`);
  return res.arrayBuffer();
}

export async function embedRomanianFonts(pdf: PDFDocument): Promise<PdfFontSet> {
  pdf.registerFontkit(fontkit);
  const [regularBytes, boldBytes] = await Promise.all([
    fetchFontBytes(notoSansRegularUrl),
    fetchFontBytes(notoSansBoldUrl),
  ]);

  const [regular, bold] = await Promise.all([
    pdf.embedFont(regularBytes, { subset: true }),
    pdf.embedFont(boldBytes, { subset: true }),
  ]);

  return { regular, bold };
}

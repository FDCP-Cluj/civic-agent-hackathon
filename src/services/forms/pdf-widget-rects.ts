import * as pdfjsLib from "pdfjs-dist";

export type WidgetRect = {
  pageIndex: number;
  pdfFieldName: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export async function harvestWidgetRects(bytes: ArrayBuffer | Uint8Array): Promise<WidgetRect[]> {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const copy = new Uint8Array(view.length);
  copy.set(view);

  const task = pdfjsLib.getDocument({ data: copy });
  try {
    const pdf = await task.promise;
    const rects: WidgetRect[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      try {
        const annots = await page.getAnnotations();
        for (const a of annots) {
          if (a.subtype !== "Widget") continue;
          if (!a.fieldName || !a.rect) continue;
          const [x1, y1, x2, y2] = a.rect as [number, number, number, number];
          rects.push({
            pageIndex: i - 1,
            pdfFieldName: a.fieldName,
            x: Math.min(x1, x2),
            y: Math.min(y1, y2),
            width: Math.abs(x2 - x1),
            height: Math.abs(y2 - y1),
          });
        }
      } finally {
        page.cleanup();
      }
    }
    pdf.destroy();
    return rects;
  } finally {
    task.destroy();
  }
}

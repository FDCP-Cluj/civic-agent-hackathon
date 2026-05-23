import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { WidgetRect } from "@/services/forms/pdf-widget-rects";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export type PdfPageInfo = {
  pageIndex: number;
  wrapper: HTMLElement;
  canvas: HTMLCanvasElement;
  scale: number;
  pdfWidth: number;
  pdfHeight: number;
};

type Props = {
  pdfBytes: ArrayBuffer | Uint8Array;
  onPagesReady?: (pages: PdfPageInfo[]) => void;
  highlightRect?: WidgetRect | null;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
};

export function PdfPreview({ pdfBytes, onPagesReady, highlightRect, scrollContainerRef }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [mobileUrl, setMobileUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<PdfPageInfo[]>([]);
  const onPagesReadyRef = useRef(onPagesReady);
  useEffect(() => {
    onPagesReadyRef.current = onPagesReady;
  }, [onPagesReady]);

  useEffect(() => {
    const bytes =
      pdfBytes instanceof Uint8Array ? new Uint8Array(pdfBytes) : new Uint8Array(pdfBytes);
    const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)], {
      type: "application/pdf",
    });
    const url = URL.createObjectURL(blob);
    setMobileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pdfBytes]);

  useEffect(() => {
    let cancelled = false;
    const view = pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
    const copy = new Uint8Array(view.length);
    copy.set(view);

    const task = pdfjsLib.getDocument({ data: copy });

    task.promise
      .then(async (pdf) => {
        if (cancelled) {
          pdf.destroy();
          return;
        }
        const container = containerRef.current;
        const wrapper = wrapperRef.current;
        if (!container || !wrapper) {
          pdf.destroy();
          return;
        }

        const containerWidth = container.clientWidth;
        const pageWidth = Math.max(200, containerWidth - 32);
        const dpr = window.devicePixelRatio || 1;

        while (wrapper.children.length < pdf.numPages) {
          const pageWrap = document.createElement("div");
          pageWrap.style.position = "relative";
          pageWrap.style.marginBottom = "8px";
          pageWrap.style.maxWidth = "100%";
          pageWrap.style.boxShadow = "0 1px 3px rgba(0,0,0,0.12)";
          pageWrap.style.lineHeight = "0";
          pageWrap.dataset.pageIndex = String(wrapper.children.length);
          const c = document.createElement("canvas");
          c.style.display = "block";
          c.style.maxWidth = "100%";
          pageWrap.appendChild(c);
          wrapper.appendChild(pageWrap);
        }
        while (wrapper.children.length > pdf.numPages) {
          wrapper.removeChild(wrapper.lastChild!);
        }

        const pageInfos: PdfPageInfo[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) {
            pdf.destroy();
            return;
          }
          const page = await pdf.getPage(i);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = pageWidth / baseViewport.width;
          const viewport = page.getViewport({ scale });

          const pageWrap = wrapper.children[i - 1] as HTMLElement;
          const canvas = pageWrap.firstElementChild as HTMLCanvasElement;
          const newW = Math.round(viewport.width * dpr);
          const newH = Math.round(viewport.height * dpr);

          const offscreen = document.createElement("canvas");
          offscreen.width = newW;
          offscreen.height = newH;
          const transform = dpr === 1 ? undefined : [dpr, 0, 0, dpr, 0, 0];
          const ctx = offscreen.getContext("2d");
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport, transform }).promise;

          if (cancelled) {
            pdf.destroy();
            return;
          }

          if (canvas.width !== newW || canvas.height !== newH) {
            canvas.width = newW;
            canvas.height = newH;
            canvas.style.width = `${viewport.width}px`;
            canvas.style.height = `${viewport.height}px`;
          }
          pageWrap.style.width = `${viewport.width}px`;
          pageWrap.style.height = `${viewport.height}px`;

          const displayCtx = canvas.getContext("2d");
          if (displayCtx) displayCtx.drawImage(offscreen, 0, 0);

          pageInfos.push({
            pageIndex: i - 1,
            wrapper: pageWrap,
            canvas,
            scale,
            pdfWidth: baseViewport.width,
            pdfHeight: baseViewport.height,
          });
        }

        pdf.destroy();
        if (!cancelled) {
          setError(null);
          setPages(pageInfos);
          onPagesReadyRef.current?.(pageInfos);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.name === "RenderingCancelledException") return;
        console.warn("[PdfPreview]", err);
        setError(err instanceof Error ? err.message : "Eroare la afișarea PDF-ului.");
      });

    return () => {
      cancelled = true;
      task.destroy();
    };
  }, [pdfBytes]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    wrapper.querySelectorAll("[data-field-highlight]").forEach((el) => el.remove());
    if (!highlightRect) return;

    const page = pages.find((p) => p.pageIndex === highlightRect.pageIndex);
    if (!page) return;

    const cssScale = page.scale;
    const top = (page.pdfHeight - highlightRect.y - highlightRect.height) * cssScale;
    const left = highlightRect.x * cssScale;

    const hl = document.createElement("div");
    hl.dataset.fieldHighlight = "1";
    hl.style.position = "absolute";
    hl.style.left = `${left}px`;
    hl.style.top = `${top}px`;
    hl.style.width = `${Math.max(highlightRect.width * cssScale, 24)}px`;
    hl.style.height = `${Math.max(highlightRect.height * cssScale, 16)}px`;
    hl.style.border = "2px solid hsl(var(--primary))";
    hl.style.borderRadius = "4px";
    hl.style.background = "hsla(var(--primary) / 0.2)";
    hl.style.pointerEvents = "none";
    hl.style.zIndex = "10";
    page.wrapper.appendChild(hl);

    scrollContainerRef?.current?.scrollTo({
      top: page.wrapper.offsetTop + top - 60,
      behavior: "smooth",
    });
  }, [highlightRect, scrollContainerRef, pages]);

  return (
    <>
      {mobileUrl && (
        <div className="md:hidden mb-3 rounded-lg border border-border/80 bg-muted/30 p-3 text-center">
          <a
            href={mobileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary"
          >
            <ExternalLink className="size-4" />
            Deschide PDF-ul
          </a>
          <p className="text-xs text-muted-foreground mt-1">Se deschide cu vizualizatorul telefonului</p>
        </div>
      )}

      <div ref={containerRef} className="hidden md:block w-full h-full overflow-auto">
        {error ? (
          <p className="text-sm text-destructive p-4">{error}</p>
        ) : (
          <div ref={wrapperRef} className="mx-auto py-2" />
        )}
      </div>
    </>
  );
}

export function PdfIframePreview({ pdfBytes }: { pdfBytes: ArrayBuffer | Uint8Array }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const bytes =
      pdfBytes instanceof Uint8Array ? new Uint8Array(pdfBytes) : new Uint8Array(pdfBytes);
    const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)], {
      type: "application/pdf",
    });
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [pdfBytes]);

  if (!url) return null;
  return (
    <iframe
      title="Formular PDF"
      src={url}
      className="w-full h-full min-h-[480px] border-0 rounded-lg bg-white"
    />
  );
}

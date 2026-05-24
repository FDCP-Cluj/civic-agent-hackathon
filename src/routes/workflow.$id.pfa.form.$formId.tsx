import { createFileRoute, Link } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { copyArrayBuffer, pdfBytesFingerprint } from "@/lib/pdf-bytes";
import { useForm, useWatch } from "react-hook-form";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Download,
  FileWarning,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Save,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PfaFormField } from "@/components/pfa/pfa-form-field";
import { PdfIframePreview, PdfPreview } from "@/components/pfa/pdf-preview";
import { SubmissionStrip } from "@/components/pfa/submission-strip";
import { isCollapsibleField } from "@/data/forms/pfa/field-labels.ro";
import { isUiHiddenField } from "@/data/forms/pfa/pfa-field-sources";
import {
  buildZodSchema,
  fillAndDownload,
  fillPdf,
  harvestWidgetRects,
  loadPfaPdfBytes,
  loadPfaTemplate,
  mapVaultToFormValues,
  type FormValues,
  type PfaFormTemplate,
  type WidgetRect,
} from "@/services/forms";
import { usePfaDossier, useVault } from "@/store";
import { toast } from "sonner";
import { z } from "zod";

type Search = { autofill?: string };

export const Route = createFileRoute("/workflow/$id/pfa/form/$formId")({
  component: PfaFormFillPage,
  validateSearch: (s: Record<string, unknown>): Search => ({
    autofill: s.autofill === "1" || s.autofill === "true" ? "1" : undefined,
  }),
});

function hasAnyValue(values: FormValues): boolean {
  return Object.values(values).some(
    (v) => v !== undefined && v !== null && v !== "" && v !== false,
  );
}

function PfaFormFillPage() {
  const { id, formId } = Route.useParams();
  const { autofill } = Route.useSearch();
  const profile = useVault((s) => s.profile);
  const formDrafts = usePfaDossier((s) => s.formDrafts);
  const setFormDraft = usePfaDossier((s) => s.setFormDraft);
  const setCardStatus = usePfaDossier((s) => s.setCardStatus);
  const syncFromProfile = usePfaDossier((s) => s.syncFromProfile);

  const template = loadPfaTemplate(formId);
  const [pdfOriginalBytes, setPdfOriginalBytes] = useState<ArrayBuffer | null>(null);
  const [previewBytes, setPreviewBytes] = useState<ArrayBuffer | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [lowConfidence, setLowConfidence] = useState<string[]>([]);
  const [pdfOnly, setPdfOnly] = useState(false);
  const [widgetRects, setWidgetRects] = useState<WidgetRect[]>([]);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const pdfScrollRef = useRef<HTMLDivElement>(null);
  const initKeyRef = useRef<string | null>(null);
  const previewFingerprintRef = useRef<string | null>(null);
  const previewGenRef = useRef(0);
  const valuesFingerprintRef = useRef<string>("");

  const visibleFields = useMemo(
    () =>
      template?.fields.filter(
        (f) =>
          !f.hidden &&
          f.type !== "unsupported" &&
          !isUiHiddenField(formId, f.pdfFieldName),
      ) ?? [],
    [template, formId],
  );

  const zodSchema = useMemo(
    () => (template ? buildZodSchema(template) : z.object({})),
    [template],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(zodSchema),
    defaultValues: {},
  });

  const watchedValues = useWatch({ control: form.control }) as FormValues;

  const groupedFields = useMemo(() => {
    const groups: Record<string, typeof visibleFields> = {};
    for (const f of visibleFields) {
      const g = f.group?.trim() || "General";
      if (!groups[g]) groups[g] = [];
      groups[g].push(f);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, "ro"));
  }, [visibleFields]);

  const fieldsToShow = useMemo(() => {
    if (showAdvanced) return visibleFields;
    return visibleFields.filter((f) => !isCollapsibleField(formId, f.pdfFieldName));
  }, [visibleFields, showAdvanced, formId]);

  const hiddenCollapsibleCount = visibleFields.length - fieldsToShow.length;

  useEffect(() => {
    if (!template?.pdfFileName) return;
    let cancelled = false;
    loadPfaPdfBytes(template.pdfFileName).then((bytes) => {
      if (cancelled) return;
      setPdfOriginalBytes(bytes);
      setPreviewBytes(null);
      harvestWidgetRects(bytes).then(setWidgetRects).catch(() => setWidgetRects([]));
    });
    return () => {
      cancelled = true;
    };
  }, [template?.pdfFileName]);

  useEffect(() => {
    if (!template || id !== "pfa-registration") return;

    const initKey = `${formId}:${autofill ?? "0"}:${profile.cnp}:${profile.fullName}`;
    if (initKeyRef.current === initKey) return;
    initKeyRef.current = initKey;

    syncFromProfile(profile);
    const existing = formDrafts[formId];
    if (existing && Object.keys(existing).length > 0 && autofill !== "1") {
      form.reset(existing);
      return;
    }

    const dossier = usePfaDossier.getState();
    const mapped = mapVaultToFormValues(template, profile, dossier, existing);
    if (autofill === "1" || !existing || Object.keys(existing).length === 0) {
      form.reset(mapped.values);
      setLowConfidence(mapped.lowConfidenceFields);
      if (autofill === "1" && mapped.filledCount > 0) {
        toast.success(`Am completat ${mapped.filledCount} câmpuri din seif. Verifică în PDF.`);
      }
    }
  }, [
    template,
    formId,
    autofill,
    id,
    profile.cnp,
    profile.fullName,
    formDrafts,
    syncFromProfile,
    form,
  ]);

  const regeneratePreview = useCallback(
    async (values: FormValues, tmpl: PfaFormTemplate, bytes: ArrayBuffer, gen: number) => {
      if (!hasAnyValue(values)) {
        if (previewFingerprintRef.current !== null) {
          previewFingerprintRef.current = null;
          setPreviewBytes(null);
        }
        setPreviewing(false);
        return;
      }

      setPreviewing(true);
      try {
        const filled = await fillPdf(tmpl, bytes, values, { skipFlatten: true });
        if (gen !== previewGenRef.current) return;

        const copy = copyArrayBuffer(filled);
        const fp = pdfBytesFingerprint(copy);
        if (fp === previewFingerprintRef.current) {
          setPreviewing(false);
          return;
        }

        previewFingerprintRef.current = fp;
        setPreviewBytes(copy);
      } catch (err) {
        console.warn("[preview]", err);
      } finally {
        if (gen === previewGenRef.current) {
          setPreviewing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!template || !pdfOriginalBytes) return;
    if (typeof window !== "undefined" && !window.matchMedia("(min-width: 768px)").matches) return;

    const valuesJson = JSON.stringify(watchedValues ?? {});
    if (valuesJson === valuesFingerprintRef.current) return;

    const timer = setTimeout(() => {
      valuesFingerprintRef.current = valuesJson;
      const gen = ++previewGenRef.current;
      regeneratePreview(watchedValues ?? {}, template, pdfOriginalBytes, gen);
    }, 750);

    return () => clearTimeout(timer);
  }, [watchedValues, template, pdfOriginalBytes, regeneratePreview]);

  const highlightRect = useMemo(
    () => widgetRects.find((r) => r.pdfFieldName === focusedField) ?? null,
    [widgetRects, focusedField],
  );

  const previewSource = useMemo(
    () => previewBytes ?? pdfOriginalBytes,
    [previewBytes, pdfOriginalBytes],
  );
  const showingFilledPreview = previewBytes !== null;

  if (id !== "pfa-registration" || !template) {
    return (
      <AppShell>
        <Card className="p-5">
          <p className="text-sm">Formularul nu a fost găsit.</p>
          <Button asChild className="mt-3">
            <Link to="/workflow/$id/pfa" params={{ id: "pfa-registration" }}>
              Înapoi la dosar
            </Link>
          </Button>
        </Card>
      </AppShell>
    );
  }

  const cardIdForTemplate =
    formId === "rezervare-denumire-24940"
      ? "rezervare-denumire"
      : formId === "declaratie-propria-raspundere"
        ? "declaratie-propria-raspundere"
        : formId;

  const onSaveDraft = () => {
    setFormDraft(formId, form.getValues());
    setCardStatus(cardIdForTemplate, "draft");
    toast.success("Draft salvat local.");
  };

  const onDownload = async () => {
    const valid = await form.trigger();
    if (!valid) {
      toast.error("Corectează câmpurile evidențiate.");
      return;
    }
    if (!pdfOriginalBytes) return;
    setPdfLoading(true);
    try {
      const values = form.getValues();
      setFormDraft(formId, values);
      await fillAndDownload(template, pdfOriginalBytes, values, `acteai-${formId}.pdf`);
      setCardStatus(cardIdForTemplate, "gata");
      toast.success("PDF descărcat.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Eroare la generarea PDF.");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title={template.name}
        description="Formularul oficial ONRC — completezi în stânga, vezi PDF-ul actualizat în dreapta."
      >
        <Button asChild variant="outline" size="sm">
          <Link to="/workflow/$id/pfa" params={{ id: "pfa-registration" }}>
            <ArrowLeft className="size-4" />
            Dosar PFA
          </Link>
        </Button>
      </PageHeader>

      <div className="mt-4 space-y-3">
        <SubmissionStrip submission={template.submission} />

        <Card className="border-primary/20 bg-primary/5 p-3 text-sm">
          Acesta este PDF-ul oficial de pe eDirect. Scrie în câmpurile din stânga — valorile apar
          pe formularul din dreapta. Pentru casete fără etichetă clară, uită-te la poziția în PDF.
        </Card>

        {lowConfidence.length > 0 && (
          <Card className="border-amber-500/40 bg-amber-500/5 p-3 flex gap-2">
            <FileWarning className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm">
              Verifică câmpurile marcate — unele nu au putut fi mapate automat din seif.
            </p>
          </Card>
        )}

        <div className="flex flex-col lg:flex-row gap-4 lg:items-stretch lg:h-[calc(100vh-9rem)]">
          <div className="flex flex-col gap-3 lg:w-[42%] lg:min-h-0 lg:shrink-0">
            <Card className="flex flex-1 flex-col overflow-hidden p-0 min-h-[min(70vh,32rem)] lg:min-h-0">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                <div className="p-4 space-y-4">
                  {hiddenCollapsibleCount > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full justify-between"
                      onClick={() => setShowAdvanced((v) => !v)}
                    >
                      {showAdvanced ? (
                        <>
                          Ascunde câmpuri secundare
                          <ChevronDown className="size-4" />
                        </>
                      ) : (
                        <>
                          Afișează toate câmpurile ({hiddenCollapsibleCount} secundare)
                          <ChevronRight className="size-4" />
                        </>
                      )}
                    </Button>
                  )}

                  {(showAdvanced
                    ? groupedFields
                    : ([["", fieldsToShow]] as [string, typeof fieldsToShow][])
                  ).map(([groupName, fields]) => (
                    <div key={groupName || "main"}>
                      {showAdvanced && groupName ? (
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                          {groupName}
                        </h3>
                      ) : null}
                      <div className="space-y-3">
                        {fields.map((field) => (
                          <PfaFormField
                            key={field.pdfFieldName}
                            field={field}
                            value={watchedValues?.[field.pdfFieldName]}
                            onChange={(v) =>
                              form.setValue(field.pdfFieldName, v, { shouldValidate: true })
                            }
                            onFocus={() => setFocusedField(field.pdfFieldName)}
                            highlight={lowConfidence.includes(field.pdfFieldName)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <div className="flex flex-col sm:flex-row gap-2 mt-3 shrink-0">
              <Button type="button" variant="outline" onClick={onSaveDraft} className="flex-1">
                <Save className="size-4" />
                Salvează draft
              </Button>
              <Button type="button" onClick={onDownload} disabled={pdfLoading} className="flex-1">
                {pdfLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                Descarcă PDF
              </Button>
            </div>
          </div>

          <Card className="flex flex-col overflow-hidden p-0 min-h-[min(70vh,32rem)] lg:min-h-0 lg:flex-1">
            <div className="flex items-center justify-between gap-2 border-b border-border/80 px-3 py-2 shrink-0">
              <span className="text-sm font-medium truncate">
                {pdfOnly
                  ? "Completează direct în PDF"
                  : showingFilledPreview
                    ? "Previzualizare formular completat"
                    : "Formular original ONRC"}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="hidden lg:inline-flex h-8 text-xs"
                  onClick={() => setPdfOnly((v) => !v)}
                >
                  {pdfOnly ? (
                    <>
                      <PanelLeftOpen className="size-3.5" />
                      Cu panou câmpuri
                    </>
                  ) : (
                    <>
                      <PanelLeftClose className="size-3.5" />
                      Doar PDF
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div ref={pdfScrollRef} className="flex-1 overflow-auto bg-muted/30 p-2 min-h-[360px]">
              {!previewSource ? (
                <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
                  <Loader2 className="size-5 animate-spin mr-2" />
                  Se încarcă PDF-ul…
                </div>
              ) : pdfOnly ? (
                <PdfIframePreview pdfBytes={previewSource} />
              ) : (
                <PdfPreview
                  pdfBytes={previewSource}
                  highlightRect={highlightRect}
                  scrollContainerRef={pdfScrollRef}
                  isUpdating={previewing}
                />
              )}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

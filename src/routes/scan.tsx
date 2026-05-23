import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ScanLine,
  Upload,
  Sparkles,
  CheckCircle2,
  PenLine,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { govApi } from "@/services/govApiMock";
import {
  CLASSIFIED_TYPE_LABELS_RO,
  prefetchOcr,
  validateDocument,
  type DocumentValidationResult,
} from "@/services/docIntelligence";
import { useVault } from "@/store";

type FriendlyResult = Awaited<ReturnType<typeof govApi.explainDocument>>;
type ScanState = {
  friendly: FriendlyResult;
  validation: DocumentValidationResult | null;
  preview: string | null;
};

export const Route = createFileRoute("/scan")({ component: Scan });

function Scan() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<"idle" | "scanning" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [result, setResult] = useState<ScanState | null>(null);
  const [fileName, setFileName] = useState("");
  const updateProfile = useVault((s) => s.updateProfile);

  // Warm up Tesseract on mount so the WASM + lang download overlaps with
  // the user thinking about which document to pick.
  useEffect(() => {
    prefetchOcr();
  }, []);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setPhase("scanning");
    setProgress(0);
    setStage("starting");

    const preview = await fileToDataUrl(f).catch(() => null);

    // Run the friendly copy summary and the real local pipeline in
    // parallel — the friendly summary is instant (filename heuristic),
    // OCR is slow.
    const [friendly, validationOrError] = await Promise.all([
      govApi.explainDocument(f.name),
      validateDocument(f, {
        onProgress: (s, p) => {
          setStage(s);
          setProgress(p);
        },
      }),
    ]);

    const validation = "error" in validationOrError ? null : validationOrError;
    setResult({ friendly, validation, preview });
    setPhase("done");
  };

  const reset = () => {
    setPhase("idle");
    setResult(null);
    setFileName("");
    setProgress(0);
    setStage("");
  };

  const adoptToVault = () => {
    if (!result?.validation?.extractedFields) return;
    const f = result.validation.extractedFields;
    const patch: Parameters<typeof updateProfile>[0] = {};
    if (f.cnp) patch.cnp = f.cnp;
    if (f.firstName || f.lastName) {
      patch.fullName = [f.firstName, f.lastName].filter(Boolean).join(" ");
    }
    if (f.address) patch.address = f.address;
    if (f.birthDate) patch.birthDate = f.birthDate;
    if (Object.keys(patch).length === 0) return;
    updateProfile(patch);
  };

  return (
    <AppShell>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-4" /> Înapoi
      </Link>

      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <ScanLine className="size-5 text-primary" />
          <h1 className="text-xl font-semibold tracking-tight">Explică un document</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Recunoaștere locală — niciun byte nu părăsește dispozitivul. Vezi tipul, datele și un
          rezumat pe înțelesul tău.
        </p>
      </div>

      {phase === "idle" && (
        <Card className="p-10 border-dashed text-center animate-[fade-in_0.3s_ease-out]">
          <div className="relative size-20 mx-auto mb-4">
            <div className="absolute inset-0 rounded-2xl bg-accent" />
            <FileText className="size-10 text-primary absolute inset-0 m-auto" />
          </div>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
            Atașează o poză. Vom rula OCR + clasificare 100% local pentru a-ți spune ce tip de
            document este și ce conține.
          </p>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
          <Button onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" /> Alege fișier
          </Button>
        </Card>
      )}

      {phase === "scanning" && (
        <ScanningView fileName={fileName} progress={progress} stage={stage} />
      )}

      {phase === "done" && result && (
        <ResultView result={result} onReset={reset} onAdopt={adoptToVault} />
      )}
    </AppShell>
  );
}

/* ---------- Subcomponents ---------- */

function ScanningView({
  fileName,
  progress,
  stage,
}: {
  fileName: string;
  progress: number;
  stage: string;
}) {
  const label = stageLabel(stage);
  const pct = Math.max(5, Math.round(progress * 100));
  return (
    <div className="space-y-4 animate-[fade-in_0.3s_ease-out]">
      <Card className="p-5 overflow-hidden">
        <div className="text-xs text-muted-foreground mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            {label} · {fileName}
          </span>
          <span className="font-mono tabular-nums">{pct}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-4">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="relative mx-auto aspect-[4/5] w-full max-w-[260px] rounded-lg border border-border bg-gradient-to-b from-muted/40 to-muted/10 overflow-hidden">
          <div className="p-4 space-y-2">
            <div className="h-3 w-1/2 rounded bg-foreground/10" />
            <div className="h-2 w-3/4 rounded bg-foreground/10" />
            <div className="h-2 w-2/3 rounded bg-foreground/10" />
            <div className="h-px bg-border my-2" />
            <div className="h-2 w-full rounded bg-foreground/10" />
            <div className="h-2 w-5/6 rounded bg-foreground/10" />
            <div className="h-2 w-4/6 rounded bg-foreground/10" />
            <div className="h-2 w-full rounded bg-foreground/10" />
            <div className="h-px bg-border my-2" />
            <div className="h-2 w-3/5 rounded bg-foreground/10" />
            <div className="h-2 w-1/2 rounded bg-foreground/10" />
          </div>
          <div className="pointer-events-none absolute inset-x-0 h-12 -mt-6 animate-[laser_2.2s_ease-in-out_infinite]">
            <div className="h-full bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
            <div className="absolute inset-x-0 top-1/2 h-px bg-primary shadow-[0_0_16px_4px_oklch(0.55_0.18_258_/_0.7)]" />
          </div>
          <Corner pos="tl" />
          <Corner pos="tr" />
          <Corner pos="bl" />
          <Corner pos="br" />
          <style>{`
            @keyframes laser {
              0%   { top: 0%; }
              50%  { top: 92%; }
              100% { top: 0%; }
            }
          `}</style>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          <Pill label="Calitate" active={progress >= 0.05} done={progress >= 0.25} />
          <Pill label="OCR" active={progress >= 0.25} done={progress >= 0.85} />
          <Pill label="Clasificare" active={progress >= 0.85} done={progress >= 1} />
        </div>
      </Card>

      <Card className="p-5">
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-5 w-2/3 mb-4" />
        <Skeleton className="h-3 w-full mb-2" />
        <Skeleton className="h-3 w-5/6 mb-2" />
        <Skeleton className="h-3 w-4/6" />
      </Card>
    </div>
  );
}

function stageLabel(stage: string): string {
  switch (stage) {
    case "quality":
      return "Verific calitatea imaginii";
    case "ocr":
      return "Citesc textul (OCR local)";
    case "classify":
      return "Identific tipul";
    case "done":
      return "Gata";
    default:
      return "Pregătesc analiza";
  }
}

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const map = {
    tl: "top-1.5 left-1.5 border-l-2 border-t-2 rounded-tl",
    tr: "top-1.5 right-1.5 border-r-2 border-t-2 rounded-tr",
    bl: "bottom-1.5 left-1.5 border-l-2 border-b-2 rounded-bl",
    br: "bottom-1.5 right-1.5 border-r-2 border-b-2 rounded-br",
  } as const;
  return <div className={`absolute size-4 border-primary ${map[pos]}`} />;
}

function Pill({
  label,
  active = false,
  done = false,
}: {
  label: string;
  active?: boolean;
  done?: boolean;
}) {
  const tone = done
    ? "bg-success/15 text-success"
    : active
      ? "bg-primary/10 text-primary"
      : "bg-muted text-muted-foreground";
  return (
    <div className={`rounded-md px-2 py-1.5 text-center font-semibold ${tone}`}>
      {(active || done) && (
        <span
          className={`inline-block size-1.5 rounded-full mr-1.5 ${
            done ? "bg-success" : "bg-primary animate-pulse"
          }`}
        />
      )}
      {label}
    </div>
  );
}

function ResultView({
  result,
  onReset,
  onAdopt,
}: {
  result: ScanState;
  onReset: () => void;
  onAdopt: () => void;
}) {
  const { friendly, validation } = result;
  const hasExtractedAny =
    validation &&
    (validation.extractedFields.cnp ||
      validation.extractedFields.firstName ||
      validation.extractedFields.lastName ||
      validation.extractedFields.address ||
      validation.extractedFields.birthDate);

  return (
    <div className="space-y-4 animate-[fade-in_0.4s_ease-out]">
      {/* Identification card backed by the real local classifier */}
      {validation ? (
        validation.success ? (
          <Card className="p-5 border-success/30 bg-success/5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="size-4 text-success" />
              <span className="text-xs font-semibold uppercase tracking-wider text-success">
                Document identificat (local)
              </span>
            </div>
            <h2 className="text-lg font-semibold">
              {capitalize(CLASSIFIED_TYPE_LABELS_RO[validation.documentType])}
            </h2>
            <div className="text-xs text-muted-foreground mt-1">
              Încredere: {Math.round(validation.confidence * 100)}% · Calitate imagine:{" "}
              {Math.round(validation.qualityScore * 100)}%
            </div>
          </Card>
        ) : (
          <Card className="p-5 border-warning/30 bg-warning/5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="size-4 text-warning" />
              <span className="text-xs font-semibold uppercase tracking-wider text-warning">
                Nu am putut confirma cu siguranță
              </span>
            </div>
            <h2 className="text-base font-semibold">
              {validation.documentType === "unknown"
                ? "Document necunoscut"
                : `Posibil: ${CLASSIFIED_TYPE_LABELS_RO[validation.documentType]}`}
            </h2>
            <div className="text-xs text-muted-foreground mt-1 mb-3">
              Încredere: {Math.round(validation.confidence * 100)}% · Calitate:{" "}
              {Math.round(validation.qualityScore * 100)}%
            </div>
            <ul className="text-xs text-muted-foreground space-y-1">
              {validation.issues.map((iss) => (
                <li key={iss} className="flex items-center gap-1.5">
                  <span className="size-1 rounded-full bg-warning" />
                  {issueLabel(iss)}
                </li>
              ))}
              {validation.rejectionReason && (
                <li className="flex items-start gap-1.5">
                  <span className="size-1 rounded-full bg-destructive mt-1" />
                  {validation.rejectionReason}
                </li>
              )}
            </ul>
          </Card>
        )
      ) : (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="size-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Document
            </span>
          </div>
          <h2 className="text-lg font-semibold">{friendly.docType}</h2>
        </Card>
      )}

      {/* Friendly summary (V3 govApiMock authored copy) */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="size-4 text-primary" />
          <span className="text-sm font-semibold">În cuvinte simple</span>
        </div>
        <p className="text-sm leading-relaxed">{friendly.summary}</p>
      </Card>

      {/* Real extracted fields (V1 heuristics) */}
      {hasExtractedAny && validation && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Date extrase local
            </div>
            <Button size="sm" variant="outline" onClick={onAdopt}>
              Adaugă în seif
            </Button>
          </div>
          <div className="space-y-2">
            <FieldRow label="CNP" value={validation.extractedFields.cnp} mono />
            <FieldRow
              label="Nume"
              value={
                [validation.extractedFields.firstName, validation.extractedFields.lastName]
                  .filter(Boolean)
                  .join(" ") || null
              }
            />
            <FieldRow label="Data nașterii" value={validation.extractedFields.birthDate} />
            <FieldRow label="Adresă" value={validation.extractedFields.address} />
          </div>
        </Card>
      )}

      {/* Important static fields from friendly catalog */}
      {friendly.keyFields.length > 0 && (
        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Date importante
          </div>
          <div className="space-y-2">
            {friendly.keyFields.map((f) => (
              <div
                key={f.label}
                className="flex justify-between gap-3 py-2 border-b border-border last:border-0"
              >
                <span className="text-xs text-muted-foreground">{f.label}</span>
                <span className="text-sm font-medium tabular-nums text-right break-all">
                  {f.value}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {friendly.signHere.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <PenLine className="size-4 text-warning" />
            <span className="text-sm font-semibold">Unde trebuie să semnezi</span>
          </div>
          <ul className="space-y-2">
            {friendly.signHere.map((s) => (
              <li key={s} className="text-sm flex items-start gap-2">
                <span className="size-1.5 rounded-full bg-warning mt-2 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Button variant="outline" className="w-full" onClick={onReset}>
        Scanează alt document
      </Button>
    </div>
  );
}

function FieldRow({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 py-2 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={`text-sm text-right break-all ${
          mono ? "font-mono tabular-nums" : "font-medium"
        } ${value ? "" : "text-muted-foreground italic"}`}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

function issueLabel(iss: string): string {
  switch (iss) {
    case "blurry":
      return "Imagine neclară — refă fotografia.";
    case "low_contrast":
      return "Contrast scăzut — încearcă în lumină mai bună.";
    case "too_dark":
      return "Prea întunecat — apropie sursa de lumină.";
    case "too_bright":
      return "Prea luminos — evită lumina directă.";
    case "glare":
      return "Reflexii puternice — încearcă alt unghi.";
    case "no_text":
      return "Nu am detectat text — verifică orientarea.";
    case "unknown_type":
      return "Tipul documentului nu este recunoscut.";
    case "expected_type_mismatch":
      return "Tipul nu corespunde cu cel cerut de pas.";
    default:
      return iss;
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toLocaleUpperCase("ro-RO") + s.slice(1);
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

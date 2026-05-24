import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import {
  ArrowLeft,
  Upload,
  Camera,
  CheckCircle2,
  FileText,
  AlertTriangle,
  ScanLine,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  CLASSIFIED_TYPE_LABELS_RO,
  buildScanExplanation,
  keyFieldsFromExtracted,
  prefetchOcr,
  validateDocument,
  type ClassifiedDocumentType,
  type DocumentValidationResult,
} from "@/services/docIntelligence";
import { buildVaultProfilePatch } from "@/lib/vaultProfilePatch";
import { useVault, usePfaDossier } from "@/store";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

type EditableScanFields = {
  fullName: string;
  cnp: string;
  birthDate: string;
  address: string;
  addressStreet: string;
  addressNumber: string;
  addressBlock: string;
  addressStair: string;
  addressFloor: string;
  addressApartment: string;
  addressLocality: string;
  addressCounty: string;
  addressSector: string;
  addressCountry: string;
  birthLocality: string;
  birthCounty: string;
  idCardSeries: string;
  idCardNumber: string;
  idCardIssuedBy: string;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  amount: string;
  dueDate: string;
  iban: string;
  fiscalCode: string;
  vehiclePlate: string;
};

type ScanState = {
  validation: DocumentValidationResult | null;
  error?: string;
  preview: string | null;
  fileLabel: string;
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
  const syncFromProfile = usePfaDossier((s) => s.syncFromProfile);
  const navigate = useNavigate();

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

    const validationOrError = await validateDocument(f, {
      onProgress: (s, p) => {
        setStage(s);
        setProgress(p);
      },
    });

    const validation = "error" in validationOrError ? null : validationOrError;
    const error = "error" in validationOrError ? validationOrError.error.message : undefined;
    setResult({
      validation,
      error,
      preview: validation?.previewUrl ?? null,
      fileLabel: validation?.sourceLabel ?? f.name,
    });
    setPhase("done");
  };

  const reset = () => {
    setPhase("idle");
    setResult(null);
    setFileName("");
    setProgress(0);
    setStage("");
  };

  const adoptToVault = (fields: EditableScanFields) => {
    const patch = buildVaultProfilePatch(fields);
    if (Object.keys(patch).length === 0) return;
    updateProfile(patch);
    toast.success("Datele confirmate au fost adăugate în seif.");
    return patch;
  };

  const adoptForPfaDossier = (fields: EditableScanFields) => {
    const patch = adoptToVault(fields);
    if (!patch) {
      toast.error("Completează cel puțin nume sau CNP înainte de dosar PFA.");
      return;
    }
    const profile = useVault.getState().profile;
    syncFromProfile({
      fullName: profile.fullName,
      cnp: profile.cnp,
      address: profile.address,
    });
    navigate({
      to: "/workflow/$id/pfa",
      params: { id: "pfa-registration" },
      search: { autofill: "1" },
    });
  };

  return (
    <AppShell>
      <PageHeader
        title="Scanare document"
        description="Încarcă o poză sau un PDF (prima pagină). OCR-ul rulează local în browser — datele nu sunt trimise pe server."
      >
        <Button asChild variant="outline" size="sm">
          <Link to="/">
            <ArrowLeft className="size-4" />
            Înapoi
          </Link>
        </Button>
      </PageHeader>

      {phase === "idle" && (
        <Card className="mt-4 border-border/80 p-10 text-center shadow-none">
          <div className="relative size-20 mx-auto mb-4">
            <div className="absolute inset-0 rounded-2xl bg-accent" />
            <FileText className="size-10 text-primary absolute inset-0 m-auto" />
          </div>
          <p className="mb-2 text-sm text-muted-foreground max-w-md mx-auto">
            Ideal pentru <strong className="font-medium text-foreground">carte de identitate</strong>
            : extragem nume, CNP, adresă și le punem în seif pentru autofill la formularele PFA.
          </p>
          <p className="mb-6 text-xs text-muted-foreground max-w-md mx-auto">
            Formate: JPG, PNG, WebP sau PDF. Prima rulare poate dura câteva secunde (descarcă
            limba română pentru OCR).
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
            capture="environment"
            onChange={onFile}
            className="hidden"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" /> Alege fișier sau PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!fileRef.current) return;
                fileRef.current.setAttribute("capture", "environment");
                fileRef.current.click();
              }}
            >
              <Camera className="size-4" /> Fă o poză
            </Button>
          </div>
        </Card>
      )}

      {phase === "scanning" && (
        <ScanningView fileName={fileName} progress={progress} stage={stage} />
      )}

      {phase === "done" && result && (
        <ResultView
          result={result}
          onReset={reset}
          onAdopt={adoptToVault}
          onAdoptForPfa={adoptForPfaDossier}
        />
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
    <div className="space-y-4">
      <Card className="overflow-hidden border-border/80 p-5 shadow-none">
        <div className="text-xs text-muted-foreground mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-primary" />
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
        <div className="relative mx-auto aspect-[4/5] w-full overflow-hidden rounded-lg border border-border bg-muted/30">
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
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-primary/30" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Pill label="Calitate" active={progress >= 0.05} done={progress >= 0.25} />
          <Pill label="OCR" active={progress >= 0.25} done={progress >= 0.85} />
          <Pill label="Clasificare" active={progress >= 0.85} done={progress >= 1} />
        </div>
      </Card>

      <Card className="border-border/80 p-5 shadow-none">
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
    case "prepare":
      return "Pregătesc fișierul (PDF → imagine)";
    case "quality":
      return "Verific calitatea imaginii";
    case "ocr":
    case "recognizing":
    case "loading":
      return "Citesc textul (OCR local)";
    case "classify":
      return "Identific tipul și extrag câmpurile";
    case "done":
      return "Gata";
    default:
      return "Pregătesc analiza";
  }
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
            done ? "bg-success" : "bg-primary"
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
  onAdoptForPfa,
}: {
  result: ScanState;
  onReset: () => void;
  onAdopt: (fields: EditableScanFields) => void;
  onAdoptForPfa: (fields: EditableScanFields) => void;
}) {
  const { validation } = result;
  const [editedType, setEditedType] = useState<ClassifiedDocumentType>(
    validation?.documentType ?? "unknown",
  );
  const [editedFields, setEditedFields] = useState<EditableScanFields>(() =>
    editableFieldsFromValidation(validation),
  );
  const [showRawOcr, setShowRawOcr] = useState(false);
  const explanation = buildScanExplanation(validation, editedType, result.error);
  const keyFields = keyFieldsFromExtracted(validation?.extractedFields);
  const hasProfileData = Boolean(
    editedFields.cnp.trim() ||
    editedFields.fullName.trim() ||
    editedFields.address.trim() ||
    editedFields.birthDate.trim(),
  );

  useEffect(() => {
    setEditedType(validation?.documentType ?? "unknown");
    setEditedFields(editableFieldsFromValidation(validation));
  }, [validation]);

  return (
    <div className="space-y-4">
      {result.preview && (
        <Card className="overflow-hidden border-border/80 p-0 shadow-none">
          <img
            src={result.preview}
            alt="Previzualizare document scanat"
            className="max-h-64 w-full object-contain bg-muted/40"
          />
          <p className="px-3 py-2 text-xs text-muted-foreground border-t border-border">
            {result.fileLabel}
            {validation?.sourceKind === "pdf" ? " · analizată prima pagină" : ""}
          </p>
        </Card>
      )}

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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="size-4 text-warning" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-warning">
                    Refă fotografia înainte să folosești datele
                  </span>
                </div>
                <h2 className="text-base font-semibold">
                  {validation.documentType === "unknown"
                    ? "Document necunoscut"
                    : `Posibil: ${CLASSIFIED_TYPE_LABELS_RO[validation.documentType]}`}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  ActeAI a citit local documentul, dar calitatea sau încrederea nu sunt suficiente
                  pentru autofill sigur.
                </p>
              </div>
              <QualityMeter
                quality={validation.qualityScore}
                confidence={validation.confidence}
                onReset={onReset}
              />
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
        <Card className="p-5 border-warning/30 bg-warning/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-warning">
                Nu am putut valida local
              </div>
              <h2 className="mt-1 text-base font-semibold">Document neverificat</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {result.error ??
                  "Imaginea nu a putut fi procesată complet. Încearcă o fotografie mai clară."}
              </p>
            </div>
          </div>
          <Button variant="outline" className="mt-4 w-full" onClick={onReset}>
            Refă fotografia
          </Button>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <ScanLine className="size-4 text-primary" />
          <span className="text-sm font-semibold">Rezultat scanare</span>
        </div>
        <p className="text-sm leading-relaxed">{explanation}</p>
        {validation?.rawText?.trim() ? (
          <div className="mt-3">
            <button
              type="button"
              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
              onClick={() => setShowRawOcr((v) => !v)}
            >
              {showRawOcr ? "Ascunde textul OCR" : "Arată textul citit de OCR"}
            </button>
            {showRawOcr && (
              <pre className="mt-2 max-h-40 overflow-auto rounded-lg border border-border bg-muted/30 p-3 text-[11px] leading-relaxed whitespace-pre-wrap">
                {validation.rawText}
              </pre>
            )}
          </div>
        ) : null}
      </Card>

      {keyFields.length > 0 && (
        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Date detectate automat
          </div>
          <div className="space-y-2">
            {keyFields.map((f) => (
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

      <Card className="p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {validation ? "Corectează ce a citit OCR-ul" : "Completează manual"}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Verifică fiecare câmp înainte să salvezi în seif sau dosarul PFA.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAdopt(editedFields)}
              disabled={!hasProfileData}
            >
              Salvează în seif
            </Button>
            <Button
              size="sm"
              onClick={() => onAdoptForPfa(editedFields)}
              disabled={!hasProfileData}
            >
              Seif + dosar PFA
            </Button>
          </div>
        </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Tip document</span>
              <select
                value={editedType}
                onChange={(event) => setEditedType(event.target.value as ClassifiedDocumentType)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {Object.entries(CLASSIFIED_TYPE_LABELS_RO).map(([value, label]) => (
                  <option key={value} value={value}>
                    {capitalize(label)}
                  </option>
                ))}
              </select>
            </label>
            <EditableField
              label="Nume complet"
              value={editedFields.fullName}
              onChange={(fullName) => setEditedFields((prev) => ({ ...prev, fullName }))}
            />
            <EditableField
              label="CNP"
              value={editedFields.cnp}
              mono
              inputMode="numeric"
              onChange={(cnp) => setEditedFields((prev) => ({ ...prev, cnp }))}
            />
            <EditableField
              label="Data nașterii"
              type="date"
              value={editedFields.birthDate}
              onChange={(birthDate) => setEditedFields((prev) => ({ ...prev, birthDate }))}
            />
            <EditableField
              label="Stradă"
              value={editedFields.addressStreet}
              onChange={(addressStreet) => setEditedFields((prev) => ({ ...prev, addressStreet }))}
            />
            <EditableField
              label="Număr"
              value={editedFields.addressNumber}
              onChange={(addressNumber) => setEditedFields((prev) => ({ ...prev, addressNumber }))}
            />
            <EditableField
              label="Bloc"
              value={editedFields.addressBlock}
              onChange={(addressBlock) => setEditedFields((prev) => ({ ...prev, addressBlock }))}
            />
            <EditableField
              label="Scara"
              value={editedFields.addressStair}
              onChange={(addressStair) => setEditedFields((prev) => ({ ...prev, addressStair }))}
            />
            <EditableField
              label="Etaj"
              value={editedFields.addressFloor}
              onChange={(addressFloor) => setEditedFields((prev) => ({ ...prev, addressFloor }))}
            />
            <EditableField
              label="Apartament"
              value={editedFields.addressApartment}
              onChange={(addressApartment) =>
                setEditedFields((prev) => ({ ...prev, addressApartment }))
              }
            />
            <EditableField
              label="Localitate"
              value={editedFields.addressLocality}
              onChange={(addressLocality) =>
                setEditedFields((prev) => ({ ...prev, addressLocality }))
              }
            />
            <EditableField
              label="Județ / sector"
              value={editedFields.addressCounty || editedFields.addressSector}
              onChange={(v) =>
                setEditedFields((prev) => ({
                  ...prev,
                  addressCounty: v,
                  addressSector: /^\d+$/.test(v.trim()) ? v.trim() : prev.addressSector,
                }))
              }
            />
            <EditableField
              label="Serie CI"
              value={editedFields.idCardSeries}
              onChange={(idCardSeries) => setEditedFields((prev) => ({ ...prev, idCardSeries }))}
            />
            <EditableField
              label="Număr CI"
              value={editedFields.idCardNumber}
              onChange={(idCardNumber) => setEditedFields((prev) => ({ ...prev, idCardNumber }))}
            />
            <EditableField
              label="Emis de"
              value={editedFields.idCardIssuedBy}
              className="sm:col-span-2"
              onChange={(idCardIssuedBy) => setEditedFields((prev) => ({ ...prev, idCardIssuedBy }))}
            />
            <EditableField
              label="Data emiterii"
              type="date"
              value={editedFields.issueDate}
              onChange={(issueDate) => setEditedFields((prev) => ({ ...prev, issueDate }))}
            />
            <EditableField
              label="Valabil până la"
              type="date"
              value={editedFields.expiryDate}
              onChange={(expiryDate) => setEditedFields((prev) => ({ ...prev, expiryDate }))}
            />
            <EditableField
              label="Sumă"
              value={editedFields.amount}
              onChange={(amount) => setEditedFields((prev) => ({ ...prev, amount }))}
            />
            <EditableField
              label="Termen scadent"
              type="date"
              value={editedFields.dueDate}
              onChange={(dueDate) => setEditedFields((prev) => ({ ...prev, dueDate }))}
            />
            <EditableField
              label="IBAN"
              value={editedFields.iban}
              mono
              className="sm:col-span-2"
              onChange={(iban) => setEditedFields((prev) => ({ ...prev, iban }))}
            />
            <EditableField
              label="Cod fiscal"
              value={editedFields.fiscalCode}
              mono
              onChange={(fiscalCode) => setEditedFields((prev) => ({ ...prev, fiscalCode }))}
            />
            <EditableField
              label="Număr auto"
              value={editedFields.vehiclePlate}
              mono
              onChange={(vehiclePlate) => setEditedFields((prev) => ({ ...prev, vehiclePlate }))}
            />
          </div>
        </Card>

      <Button variant="outline" className="w-full" onClick={onReset}>
        Scanează alt document
      </Button>
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
  mono,
  inputMode,
  type = "text",
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  mono?: boolean;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  type?: string;
  className?: string;
}) {
  return (
    <label className={`space-y-1.5 ${className ?? ""}`}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Input
        type={type}
        value={value}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        className={mono ? "font-mono tabular-nums" : ""}
      />
    </label>
  );
}

function editableFieldsFromValidation(
  validation: DocumentValidationResult | null,
): EditableScanFields {
  const f = validation?.extractedFields;
  return {
    fullName: [f?.firstName, f?.lastName].filter(Boolean).join(" "),
    cnp: f?.cnp ?? "",
    birthDate: f?.birthDate ?? "",
    address: f?.address ?? "",
    addressStreet: f?.addressStreet ?? "",
    addressNumber: f?.addressNumber ?? "",
    addressBlock: f?.addressBlock ?? "",
    addressStair: f?.addressStair ?? "",
    addressFloor: f?.addressFloor ?? "",
    addressApartment: f?.addressApartment ?? "",
    addressLocality: f?.addressLocality ?? "",
    addressCounty: f?.addressCounty ?? "",
    addressSector: f?.addressSector ?? "",
    addressCountry: f?.addressCountry ?? "România",
    birthLocality: f?.birthLocality ?? "",
    birthCounty: f?.birthCounty ?? "",
    idCardSeries: f?.idCardSeries ?? "",
    idCardNumber: f?.idCardNumber ?? "",
    idCardIssuedBy: f?.idCardIssuedBy ?? "",
    documentNumber: f?.documentNumber ?? "",
    issueDate: f?.issueDate ?? "",
    expiryDate: f?.expiryDate ?? "",
    amount: f?.amount ?? "",
    dueDate: f?.dueDate ?? "",
    iban: f?.iban ?? "",
    fiscalCode: f?.fiscalCode ?? "",
    vehiclePlate: f?.vehiclePlate ?? "",
  };
}

function QualityMeter({
  quality,
  confidence,
  onReset,
}: {
  quality: number;
  confidence: number;
  onReset: () => void;
}) {
  const qualityPct = Math.round(quality * 100);
  const confidencePct = Math.round(confidence * 100);
  return (
    <div className="w-full rounded-lg border border-warning/30 bg-background/60 p-3 sm:w-52">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Calitate imagine</span>
        <span className="font-mono font-semibold tabular-nums">{qualityPct}%</span>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-warning" style={{ width: `${qualityPct}%` }} />
      </div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Încredere OCR</span>
        <span className="font-mono font-semibold tabular-nums">{confidencePct}%</span>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary" style={{ width: `${confidencePct}%` }} />
      </div>
      <Button size="sm" variant="outline" className="w-full" onClick={onReset}>
        Refă fotografia
      </Button>
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


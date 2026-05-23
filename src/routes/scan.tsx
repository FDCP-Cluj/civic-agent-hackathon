import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import {
  ArrowLeft,
  Upload,
  Sparkles,
  CheckCircle2,
  FileText,
  AlertTriangle,
  PenLine,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/dashboard/page-header";
import { govApi } from "@/services/govApiMock";
import {
  CLASSIFIED_TYPE_LABELS_RO,
  prefetchOcr,
  validateDocument,
  type ClassifiedDocumentType,
  type DocumentValidationResult,
} from "@/services/docIntelligence";
import { useVault } from "@/store";
import { toast } from "sonner";

type FriendlyResult = Awaited<ReturnType<typeof govApi.explainDocument>>;

type EditableScanFields = {
  fullName: string;
  cnp: string;
  birthDate: string;
  address: string;
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
  friendly: FriendlyResult;
  validation: DocumentValidationResult | null;
  error?: string;
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
    const error = "error" in validationOrError ? validationOrError.error.message : undefined;
    setResult({ friendly, validation, error, preview });
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
    const patch: Parameters<typeof updateProfile>[0] = {};
    if (fields.cnp.trim()) patch.cnp = fields.cnp.trim();
    if (fields.fullName.trim()) patch.fullName = fields.fullName.trim();
    if (fields.address.trim()) patch.address = fields.address.trim();
    if (fields.birthDate.trim()) patch.birthDate = fields.birthDate.trim();
    if (Object.keys(patch).length === 0) return;
    updateProfile(patch);
    toast.success("Datele confirmate au fost adăugate în seif.");
  };

  return (
    <AppShell>
      <PageHeader
        title="Explică un document"
        description="Recunoaștere locală — niciun byte nu părăsește dispozitivul. Vezi tipul, datele și un rezumat pe înțelesul tău."
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
        <div className="relative mx-auto aspect-[4/5] w-full max-w-[260px] overflow-hidden rounded-lg border border-border bg-muted/30">
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
}: {
  result: ScanState;
  onReset: () => void;
  onAdopt: (fields: EditableScanFields) => void;
}) {
  const { validation } = result;
  const [editedType, setEditedType] = useState<ClassifiedDocumentType>(
    validation?.documentType ?? "unknown",
  );
  const [editedFields, setEditedFields] = useState<EditableScanFields>(() =>
    editableFieldsFromValidation(validation),
  );
  const explanation = buildLocalExplanation(validation, editedType);
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
          <Sparkles className="size-4 text-primary" />
          <span className="text-sm font-semibold">În cuvinte simple</span>
        </div>
        <p className="text-sm leading-relaxed">{explanation}</p>
      </Card>

      {validation && (
        <Card className="p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Corectează ce a citit OCR-ul
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Verifică manual datele înainte să le folosești pentru autofill.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAdopt(editedFields)}
              disabled={!hasProfileData}
            >
              Actualizează profilul
            </Button>
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
              label="Adresă"
              value={editedFields.address}
              className="sm:col-span-2"
              onChange={(address) => setEditedFields((prev) => ({ ...prev, address }))}
            />
            <EditableField
              label="Număr document"
              value={editedFields.documentNumber}
              onChange={(documentNumber) =>
                setEditedFields((prev) => ({ ...prev, documentNumber }))
              }
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
      )}

      {/* Important static fields from friendly catalog */}
      {result.friendly.keyFields.length > 0 && (
        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Date importante
          </div>
          <div className="space-y-2">
            {result.friendly.keyFields.map((f) => (
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

      {result.friendly.signHere.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <PenLine className="size-4 text-warning" />
            <span className="text-sm font-semibold">Unde trebuie să semnezi</span>
          </div>
          <ul className="space-y-2">
            {result.friendly.signHere.map((s) => (
              <li key={s} className="text-sm flex items-center gap-2.5">
                <span className="size-1.5 rounded-full bg-warning shrink-0" />
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

function buildLocalExplanation(
  validation: DocumentValidationResult | null,
  editedType: ClassifiedDocumentType,
): string {
  if (!validation) {
    return "Nu am putut citi documentul suficient de sigur. Încearcă o fotografie mai clară sau completează manual datele relevante în seif.";
  }

  if (!validation.success) {
    if (validation.documentType === "unknown") {
      return "Nu am identificat sigur tipul documentului, deci nu voi inventa sume, termene sau semnături. Poți corecta manual tipul și câmpurile citite sau poți reface fotografia.";
    }
    return `Pare să fie ${CLASSIFIED_TYPE_LABELS_RO[validation.documentType]}, dar încrederea OCR sau calitatea imaginii nu este suficientă pentru autofill automat. Verifică manual fiecare câmp înainte să îl adaugi în seif.`;
  }

  switch (editedType) {
    case "romanian_id":
      return "Este o carte de identitate. Pot folosi local numele, CNP-ul, data nașterii și adresa pentru autofill, numai după ce confirmi câmpurile.";
    case "passport":
      return "Este un pașaport. Verifică manual numele și data nașterii înainte să folosești datele pentru completări.";
    case "driver_license":
      return "Este un permis de conducere. Verifică manual numărul documentului, categoriile și valabilitatea înainte să folosești informațiile.";
    case "vehicle_registration":
      return "Este un document auto. Verifică numărul de înmatriculare, seria și datele mașinii înainte să îl folosești în proceduri.";
    case "birth_certificate":
      return "Este un certificat de naștere. Datele citite pot ajuta la completarea unor formulare, dar verifică numele și data nașterii înainte de salvare.";
    case "marriage_certificate":
      return "Este un certificat de căsătorie. Verifică numele, data și numărul actului înainte de folosire.";
    case "utility_bill":
      return "Pare o factură de utilități. O poți păstra ca dovadă de adresă, dar nu folosesc automat sume sau termene citite prin OCR.";
    case "tax_decision":
      return "Pare o decizie de impunere. Verifică suma, termenul scadent, IBAN-ul și codul fiscal direct pe document înainte de plată.";
    case "payment_notice":
      return "Pare o înștiințare de plată. Verifică suma, termenul scadent și IBAN-ul înainte să plătești.";
    case "student_card":
      return "Pare o legitimație de student. O salvez ca document suport, dar nu o tratez ca act de identitate și nu modific profilul automat.";
    case "criminal_record":
      return "Pare un cazier judiciar. Verifică data emiterii și numele înainte să îl depui.";
    case "medical_certificate":
      return "Pare o adeverință medicală. Verifică data, emitentul și numele înainte să o folosești.";
    case "cadastral_extract":
      return "Pare un extras de carte funciară. Verifică numărul cadastral, proprietarul și data emiterii.";
    case "property_deed":
      return "Pare un act de proprietate. Verifică numărul documentului, părțile și adresa imobilului înainte de folosire.";
    case "rental_contract":
      return "Pare un contract de închiriere. Verifică părțile, adresa și perioada contractuală.";
    case "employment_contract":
      return "Pare un contract de muncă. Verifică angajatorul, salariatul, data și salariul înainte de folosire.";
    case "diploma":
      return "Pare o diplomă sau adeverință de studii. Verifică numele, instituția și numărul documentului.";
    case "bank_statement":
      return "Pare un extras de cont. Verifică IBAN-ul și titularul înainte să îl folosești ca dovadă.";
    case "insurance_policy":
      return "Pare o poliță de asigurare. Verifică perioada de valabilitate, asigurătorul și obiectul asigurat.";
    case "invoice":
      return "Pare o factură. Verifică furnizorul, suma, scadența și codul fiscal înainte să o folosești.";
    default:
      return "Documentul a fost citit local. Verifică manual tipul și câmpurile înainte să le folosești pentru autofill.";
  }
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

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

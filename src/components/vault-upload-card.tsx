import { useRef, useState } from "react";
import {
  Plus,
  Trash2,
  Upload,
  IdCard,
  Car,
  FileText,
  Baby,
  CalendarClock,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { daysUntil, useVault, type VaultDocument } from "@/store";
import { toast } from "sonner";
import { EmptyState } from "./empty-state";
import {
  CLASSIFIED_TYPE_LABELS_RO,
  validateDocument,
  type ClassifiedDocumentType,
  type DocumentValidationResult,
} from "@/services/docIntelligence";

const DOC_TYPES: { type: VaultDocument["type"]; label: string; icon: LucideIcon }[] = [
  { type: "id_card", label: "Carte de identitate", icon: IdCard },
  { type: "driver_license", label: "Permis de conducere", icon: IdCard },
  { type: "car_papers", label: "Talon mașină", icon: Car },
  { type: "birth_cert", label: "Certificat de naștere", icon: Baby },
  { type: "passport", label: "Pașaport", icon: FileText },
  { type: "other", label: "Alt document", icon: FileText },
];

// Maps a vault slot to the document-intelligence expected type.
// `driver_license` and `car_papers` aren't in V1's classifier (no training
// signals), so we don't ask the pipeline to enforce them — the upload
// still runs OCR and may surface useful fields anyway.
const EXPECTED_TYPE_FOR_SLOT: Record<VaultDocument["type"], ClassifiedDocumentType | null> = {
  id_card: "romanian_id",
  passport: "passport",
  birth_cert: "birth_certificate",
  driver_license: "driver_license",
  car_papers: "vehicle_registration",
  other: null,
};

export function VaultUploadCard() {
  const { documents, addDocument, removeDocument, updateDocument } = useVault();
  const [pickType, setPickType] = useState<VaultDocument["type"]>("id_card");
  const [pickExpiry, setPickExpiry] = useState<string>("");
  const [validating, setValidating] = useState(false);
  const [lastValidation, setLastValidation] = useState<DocumentValidationResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const expected = EXPECTED_TYPE_FOR_SLOT[pickType];

    const preview = await fileToDataUrl(file).catch(() => undefined);

    // Run the local validation pipeline for images only; PDFs go straight
    // to the vault (validation pipeline doesn't cover PDFs in v1).
    let validationToast: { title: string; description?: string; tone: "success" | "warn" } = {
      title: "Document salvat local pe dispozitivul tău.",
      description: file.name,
      tone: "success",
    };

    if (isImage) {
      setValidating(true);
      try {
        const r = await validateDocument(file, { expectedType: expected });
        if (!("error" in r)) {
          setLastValidation(r);
          if (r.success) {
            validationToast = {
              title: `Verificat: ${CLASSIFIED_TYPE_LABELS_RO[r.documentType]}`,
              description: `Încredere ${Math.round(r.confidence * 100)}% · stocat doar local`,
              tone: "success",
            };
          } else {
            validationToast = {
              title: "Salvat, dar verificarea locală nu a fost concludentă",
              description:
                r.rejectionReason ??
                "Calitatea imaginii este redusă — câmpurile extrase pot fi incomplete.",
              tone: "warn",
            };
          }

          validationToast.description = `${validationToast.description ?? ""} · nu am modificat profilul fără confirmarea ta`;
        }
      } finally {
        setValidating(false);
      }
    } else {
      setLastValidation(null);
    }

    const meta = DOC_TYPES.find((d) => d.type === pickType)!;
    addDocument({
      id: crypto.randomUUID(),
      type: pickType,
      label: meta.label,
      fileName: file.name,
      preview,
      uploadedAt: new Date().toISOString(),
      expiryDate: pickExpiry || undefined,
    });

    if (validationToast.tone === "warn") {
      toast.warning(validationToast.title, { description: validationToast.description });
    } else {
      toast.success(validationToast.title, { description: validationToast.description });
    }
    setPickExpiry("");
  };

  const triggerUpload = (type?: VaultDocument["type"]) => {
    if (type) setPickType(type);
    setTimeout(() => fileRef.current?.click(), 0);
  };

  return (
    <Card className="border-border/80 p-5 shadow-none">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Acte încărcate</h2>
        <span className="text-xs text-muted-foreground">{documents.length} document(e)</span>
      </div>

      <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={onFile} className="hidden" />

      {documents.length === 0 ? (
        <EmptyState
          icon={Upload}
          title="Seiful tău este gol"
          description="Adaugă primul tău document — îl stocăm doar pe acest dispozitiv, niciodată pe servere."
          action={
            <Button onClick={() => triggerUpload("id_card")}>
              <Plus className="size-4" /> Adaugă primul document
            </Button>
          }
        />
      ) : (
        <>
          {lastValidation && !lastValidation.success && (
            <Card className="p-3 mb-3 border-warning/30 bg-warning/5">
              <div className="text-xs font-semibold uppercase tracking-wider text-warning mb-1">
                Ultima verificare locală necesită atenție
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                {lastValidation.issues.map((iss) => (
                  <li key={iss} className="flex items-center gap-1.5">
                    <span className="size-1 rounded-full bg-warning" />
                    {issueLabel(iss)}
                  </li>
                ))}
                {lastValidation.rejectionReason && (
                  <li className="flex items-start gap-1.5">
                    <span className="size-1 rounded-full bg-destructive mt-1" />
                    {lastValidation.rejectionReason}
                  </li>
                )}
              </ul>
            </Card>
          )}
          <div className="mb-4 space-y-2">
            {documents.map((d) => {
              const meta = DOC_TYPES.find((t) => t.type === d.type) ?? DOC_TYPES[5];
              const Icon = meta.icon;
              const expiryDays = d.expiryDate ? daysUntil(d.expiryDate) : null;
              const expiryUrgent = expiryDays !== null && expiryDays <= 60;
              return (
                <div
                  key={d.id}
                  className="rounded-xl border border-border p-3 hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                      <Icon className="size-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{d.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{d.fileName}</div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        removeDocument(d.id);
                        toast("Document șters din seif.");
                      }}
                      aria-label={`Șterge ${d.label}`}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 pl-13">
                    <Label
                      htmlFor={`expiry-${d.id}`}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                    >
                      <CalendarClock className="size-3" /> Valabil până la
                    </Label>
                    <Input
                      id={`expiry-${d.id}`}
                      type="date"
                      value={d.expiryDate ?? ""}
                      onChange={(e) =>
                        updateDocument(d.id, { expiryDate: e.target.value || undefined })
                      }
                      className="h-8 w-auto px-2 text-sm"
                    />
                    {expiryDays !== null && (
                      <span
                        className={
                          expiryUrgent
                            ? "text-xs font-semibold text-warning"
                            : "text-xs text-muted-foreground"
                        }
                      >
                        {expiryDays < 0
                          ? "expirat"
                          : expiryDays === 0
                            ? "expiră astăzi"
                            : `${expiryDays} zile rămase`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={pickType}
                onChange={(e) => setPickType(e.target.value as VaultDocument["type"])}
                className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Tip document"
              >
                {DOC_TYPES.map((d) => (
                  <option key={d.type} value={d.type}>
                    {d.label}
                  </option>
                ))}
              </select>
              <Input
                type="date"
                value={pickExpiry}
                onChange={(e) => setPickExpiry(e.target.value)}
                className="sm:w-44 h-10 text-sm"
                aria-label="Valabil până la (opțional)"
                placeholder="Valabil până la"
              />
              <Button onClick={() => triggerUpload()} disabled={validating}>
                {validating ? (
                  <>
                    <span className="size-1.5 rounded-full bg-current animate-pulse" />
                    Verific local…
                  </>
                ) : (
                  <>
                    <Plus className="size-4" /> Adaugă document
                  </>
                )}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Pentru poze, rulăm clasificare și OCR 100% local (Tesseract.js). Adaugă data de
              expirare pentru memento automat în tabloul civic.
            </p>
          </div>
        </>
      )}
    </Card>
  );
}

function issueLabel(iss: string): string {
  switch (iss) {
    case "blurry":
      return "Imagine neclară — reîncarcă o poză mai clară.";
    case "low_contrast":
      return "Contrast redus — folosește fundal neutru și lumină mai bună.";
    case "too_dark":
      return "Imagine prea întunecată.";
    case "too_bright":
      return "Imagine supraexpusă.";
    case "glare":
      return "Reflexii pe document — schimbă unghiul.";
    case "no_text":
      return "Nu am detectat text.";
    case "expected_type_mismatch":
      return "Tipul documentului nu corespunde slotului selectat.";
    case "unknown_type":
      return "Tipul documentului nu este recunoscut.";
    default:
      return iss;
  }
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

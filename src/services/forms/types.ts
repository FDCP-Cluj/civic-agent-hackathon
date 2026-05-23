export type FieldType = "text" | "checkbox" | "dropdown" | "radio" | "unsupported";

export interface FieldValidation {
  pattern?: string;
  min?: number;
  max?: number;
  customMessage?: string;
}

export interface TemplateField {
  pdfFieldName: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  hint?: string;
  group?: string;
  order?: number;
  isRequired: boolean;
  isMultiline?: boolean;
  maxLength?: number | null;
  options?: string[];
  validation?: FieldValidation;
  hidden?: boolean;
}

export interface SubmissionChannel {
  label: string;
  url: string;
  requires?: string[];
}

export interface SubmissionInfo {
  institution: string;
  channels: SubmissionChannel[];
}

/** Vault or dossier path for autofill, e.g. `vault.cnp` or `dossier.codCaenPrincipal`. */
export type FieldSourcePath = string;

export interface PfaFormTemplate {
  id: string;
  name: string;
  description?: string;
  procedureId?: string;
  pdfFileName: string;
  version: number;
  createdAt: string;
  fields: TemplateField[];
  submission: SubmissionInfo;
  fieldSources?: Record<string, FieldSourcePath>;
}

export type FormValues = Record<string, string | boolean | undefined>;

export type PfaDossierCardKind = "acroform" | "attach" | "checklist" | "generated_pdf";

export interface PfaDossierCardDef {
  id: string;
  title: string;
  description: string;
  kind: PfaDossierCardKind;
  templateId?: string;
  attachType?: "ci" | "sediu" | "diploma";
  submission: SubmissionInfo;
}

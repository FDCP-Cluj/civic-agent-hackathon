// Barrel for the unified state layer. Every consumer imports from "@/store"
// regardless of which slice the symbol lives in — slices stay decoupled but
// callers stay readable.

export { useAuth } from "./auth";

export {
  useVault,
  RENEWAL_WORKFLOW_FOR_DOC,
  daysUntil,
  useExpiringDocuments,
  useProfileCompleteness,
} from "./vault";
export type { VaultProfile, VaultDocument, ExpiringDocument } from "./vault";

export { useTasks } from "./tasks";
export type { ActiveTask } from "./tasks";

export { useSettings } from "./settings";

export { useAccessibility } from "./accessibility";
export type { AppLanguage } from "./accessibility";

export { useChatUi } from "./chatUi";

export { usePfaDossier, defaultDenumireFromName } from "./pfaDossier";
export type { PfaDossierState, PfaAttachmentType } from "./pfaDossier";

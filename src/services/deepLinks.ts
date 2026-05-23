// Curated deep-links per (workflowId, stepKey). Each URL points to the most
// specific official page available — not a generic homepage.
//
// Ported from civic-agent-buian `src/lib/agent.functions.ts` and re-keyed
// against the v4 workflow ids in `govApiMock.ts`.

type DeepLinkEntry = { url: string; label: string };

const DEEP_LINKS: Record<string, DeepLinkEntry> = {
  // PFA registration
  "pfa-registration:caen_si_denumire": {
    url: "https://portal.onrc.ro/",
    label: "ONRC — portal verificare denumire",
  },
  "pfa-registration:depunere_onrc": {
    url: "https://portal.onrc.ro/",
    label: "ONRC — portal depunere dosar",
  },
  "pfa-registration:rezolutie_si_cui": {
    url: "https://portal.onrc.ro/",
    label: "ONRC — stadiu dosar",
  },
  "pfa-registration:anaf_si_cont": {
    url: "https://www.anaf.ro/anaf/internet/ANAF/servicii_online/",
    label: "ANAF — servicii online (SPV)",
  },

  // Property sale
  "property-sale:extras_cf": {
    url: "https://epay.ancpi.ro/epay/",
    label: "ANCPI ePay — extras CF online",
  },
  "property-sale:certificat_fiscal": {
    url: "https://www.ghiseul.ro/ghiseul/public/taxe",
    label: "Ghișeul.ro — taxe locale",
  },
  "property-sale:certificat_energetic": {
    url: "https://www.mdlpa.ro/",
    label: "MDLPA — registru auditori energetici",
  },
  "property-sale:act_notarial": {
    url: "https://www.uniuneanotarilor.ro/",
    label: "UNNPR — onorarii notariale",
  },
  "property-sale:intabulare": {
    url: "https://epay.ancpi.ro/epay/",
    label: "ANCPI ePay — verificare dosar",
  },

  // Cadastral
  "cadastral-registration": {
    url: "https://epay.ancpi.ro/epay/",
    label: "ANCPI ePay — depunere documentație",
  },
};

export function resolveDeepLink(
  workflowId: string,
  stepKey: string | undefined,
): DeepLinkEntry | null {
  if (!stepKey) return null;
  return DEEP_LINKS[`${workflowId}:${stepKey}`] ?? null;
}
